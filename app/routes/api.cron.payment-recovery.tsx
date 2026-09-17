import type { LoaderFunctionArgs } from "react-router";
import { unauthenticated } from "../shopify.server";
import db from "../db.server";
import { sendDonationReceipt } from "../utils/sendgrid.server";
import { hasActiveSubscription } from "../utils/features";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || secret !== cronSecret) {
        return new Response("Unauthorized", { status: 401 });
    }

    console.log(`[CronRecovery] Starting payment recovery check at ${new Date().toISOString()}`);

    const results = {
        processed: 0,
        recovered: 0,
        retrying: 0,
        exhausted: 0,
        fallbacksExecuted: 0,
        errors: [] as string[],
    };

    try {
        // 1. Find all recovery logs that are due for retry
        const now = new Date();
        const dueRecoveries = await db.paymentRecoveryLog.findMany({
            where: {
                status: { in: ["pending", "retrying"] },
                nextRetryDate: { lte: now },
            },
            orderBy: { nextRetryDate: "asc" },
            take: 50, // Process in batches to avoid timeouts
        });

        console.log(`[CronRecovery] Found ${dueRecoveries.length} due recovery attempts.`);

        for (const recovery of dueRecoveries) {
            results.processed++;

            try {
                // Check active plan subscription status for payment recovery
                const subscription = await db.planSubscription.findUnique({
                    where: { shop: recovery.shop },
                });

                if (!hasActiveSubscription(subscription, "canUsePaymentRecovery")) {
                    console.log(`[CronRecovery] Skipping recovery ${recovery.id} - payment recovery not supported or subscription inactive for ${recovery.shop}.`);
                    continue;
                }

                // 2. Check if recovery is still enabled for this shop
                const recoverySettings = await db.paymentRecoverySettings.findUnique({
                    where: { shop: recovery.shop },
                });

                if (!recoverySettings?.enabled) {
                    console.log(`[CronRecovery] Recovery disabled for ${recovery.shop}, skipping ${recovery.id}.`);
                    await db.paymentRecoveryLog.update({
                        where: { id: recovery.id },
                        data: { status: "fallback_executed" },
                    });
                    continue;
                }

                // 3. Get admin client for the shop
                const { admin } = await unauthenticated.admin(recovery.shop);

                const fullGid = recovery.subscriptionContractId.startsWith("gid://")
                    ? recovery.subscriptionContractId
                    : `gid://shopify/SubscriptionContract/${recovery.subscriptionContractId}`;

                // ── Check subscription contract status on Shopify first ──
                let shopifyStatus = "ACTIVE";
                try {
                    const statusResponse = await admin.graphql(
                        `#graphql
                        query getContractStatus($id: ID!) {
                            subscriptionContract(id: $id) {
                                status
                            }
                        }`,
                        { variables: { id: fullGid } }
                    );
                    const statusJson = await statusResponse.json();
                    shopifyStatus = statusJson.data?.subscriptionContract?.status || "ACTIVE";
                } catch (statusErr) {
                    console.warn(`[CronRecovery] Could not verify contract status on Shopify for ${fullGid}:`, statusErr);
                }

                if (shopifyStatus === "PAUSED" || shopifyStatus === "CANCELLED") {
                    console.log(`[CronRecovery] Contract ${fullGid} is ${shopifyStatus} on Shopify. Skipping retry and marking fallback_executed.`);
                    await db.paymentRecoveryLog.update({
                        where: { id: recovery.id },
                        data: { status: "fallback_executed" },
                    });
                    results.fallbacksExecuted++;
                    continue;
                }

                // 4. Attempt to create a billing attempt via Shopify GraphQL
                console.log(`[CronRecovery] Retrying payment for contract ${fullGid} (attempt ${recovery.retryCount + 1}/${recovery.maxRetries})`);

                const idempotencyKey = `recovery_${recovery.id}_${recovery.retryCount + 1}_${Date.now()}`;

                const billingResponse = await admin.graphql(
                    `#graphql
                    mutation subscriptionBillingAttemptCreate($contractId: ID!, $input: SubscriptionBillingAttemptInput!) {
                        subscriptionBillingAttemptCreate(
                            subscriptionContractId: $contractId
                            subscriptionBillingAttemptInput: $input
                        ) {
                            subscriptionBillingAttempt {
                                id
                                ready
                                errorMessage
                                order { id name }
                            }
                            userErrors {
                                field
                                message
                            }
                        }
                    }`,
                    {
                        variables: {
                            contractId: fullGid,
                            input: {
                                idempotencyKey,
                            },
                        },
                    }
                );

                const billingJson = await billingResponse.json();
                const billingResult = billingJson.data?.subscriptionBillingAttemptCreate;

                if (billingResult?.userErrors?.length > 0) {
                    const errMsg = billingResult.userErrors[0].message;
                    console.error(`[CronRecovery] Billing attempt userError: ${errMsg}`);

                    // Treat as a failed retry
                    await handleRetryFailure(recovery, recoverySettings, errMsg);
                    if (recovery.retryCount + 1 >= recovery.maxRetries) {
                        results.exhausted++;
                        results.fallbacksExecuted++;
                    } else {
                        results.retrying++;
                    }
                    continue;
                }

                const billingAttempt = billingResult?.subscriptionBillingAttempt;

                if (billingAttempt?.order) {
                    // Payment succeeded!
                    console.log(`[CronRecovery] ✅ Payment recovered! Order: ${billingAttempt.order.name}`);

                    await db.paymentRecoveryLog.update({
                        where: { id: recovery.id },
                        data: {
                            status: "recovered",
                            retryCount: recovery.retryCount + 1,
                        },
                    });

                    // Send success notification if enabled
                    if (recoverySettings.sendNotifications && recovery.customerEmail) {
                        try {
                            await sendDonationReceipt({
                                email: recovery.customerEmail,
                                name: recovery.customerName || "Customer",
                                amount: recovery.amount.toFixed(2),
                                orderNumber: billingAttempt.order.name || recovery.orderNumber || "N/A",
                                type: "receipt",
                                shop: recovery.shop,
                                frequency: recovery.frequency?.toLowerCase().includes("month") ? "Monthly" : "Weekly",
                                donationName: recovery.donationName || "Recurring Donation",
                            });
                        } catch (emailErr) {
                            console.error(`[CronRecovery] Failed to send recovery success email:`, emailErr);
                        }
                    }

                    results.recovered++;

                    // Log successful cron retry to BillingAttemptLog
                    try {
                        await db.billingAttemptLog.create({
                            data: {
                                shop: recovery.shop,
                                subscriptionContractId: fullGid,
                                billingAttemptId: billingAttempt.id || null,
                                source: "cron_retry",
                                status: "success",
                                orderId: billingAttempt.order?.id || null,
                                orderNumber: billingAttempt.order?.name || null,
                                customerEmail: recovery.customerEmail,
                                customerName: recovery.customerName,
                                amount: recovery.amount,
                                currency: recovery.currency,
                                donationName: recovery.donationName,
                                frequency: recovery.frequency,
                                retryNumber: recovery.retryCount + 1,
                                idempotencyKey,
                            },
                        });
                    } catch (logErr) {
                        console.error(`[CronRecovery] Failed to log successful attempt:`, logErr);
                    }
                } else if (billingAttempt?.errorMessage) {
                    // Payment failed again
                    console.log(`[CronRecovery] ❌ Retry failed: ${billingAttempt.errorMessage}`);
                    await handleRetryFailure(recovery, recoverySettings, billingAttempt.errorMessage);

                    if (recovery.retryCount + 1 >= recovery.maxRetries) {
                        results.exhausted++;
                        results.fallbacksExecuted++;
                    } else {
                        results.retrying++;
                    }

                    // Log failed cron retry to BillingAttemptLog
                    try {
                        await db.billingAttemptLog.create({
                            data: {
                                shop: recovery.shop,
                                subscriptionContractId: fullGid,
                                billingAttemptId: billingAttempt?.id || null,
                                source: "cron_retry",
                                status: "failed",
                                errorMessage: billingAttempt.errorMessage,
                                customerEmail: recovery.customerEmail,
                                customerName: recovery.customerName,
                                amount: recovery.amount,
                                currency: recovery.currency,
                                donationName: recovery.donationName,
                                frequency: recovery.frequency,
                                retryNumber: recovery.retryCount + 1,
                                idempotencyKey,
                                rawPayload: JSON.stringify(billingJson).substring(0, 4000),
                            },
                        });
                    } catch (logErr) {
                        console.error(`[CronRecovery] Failed to log failed attempt:`, logErr);
                    }
                } else {
                    // Billing attempt created but not yet ready (async processing)
                    // The result will come via the webhook — just increment retry count and advance nextRetryDate
                    console.log(`[CronRecovery] ⏳ Billing attempt created, awaiting result for ${fullGid}`);
                    const nextRetry = new Date();
                    nextRetry.setDate(nextRetry.getDate() + (recovery.retryInterval || 1));

                    await db.paymentRecoveryLog.update({
                        where: { id: recovery.id },
                        data: {
                            retryCount: recovery.retryCount + 1,
                            status: "retrying",
                            nextRetryDate: nextRetry,
                        },
                    });
                    results.retrying++;

                    // Log pending cron retry to BillingAttemptLog
                    try {
                        await db.billingAttemptLog.create({
                            data: {
                                shop: recovery.shop,
                                subscriptionContractId: fullGid,
                                billingAttemptId: billingAttempt?.id || null,
                                source: "cron_retry",
                                status: "pending",
                                customerEmail: recovery.customerEmail,
                                customerName: recovery.customerName,
                                amount: recovery.amount,
                                currency: recovery.currency,
                                donationName: recovery.donationName,
                                frequency: recovery.frequency,
                                retryNumber: recovery.retryCount + 1,
                                idempotencyKey,
                            },
                        });
                    } catch (logErr) {
                        console.error(`[CronRecovery] Failed to log pending attempt:`, logErr);
                    }
                }

            } catch (shopErr: any) {
                const errMsg = `Error processing recovery ${recovery.id} for ${recovery.shop}: ${shopErr.message || shopErr}`;
                console.error(`[CronRecovery] ${errMsg}`);
                results.errors.push(errMsg);
            }
        }

    } catch (err: any) {
        console.error("[CronRecovery] Fatal error:", err);
        results.errors.push(`Fatal: ${err.message || err}`);
    }

    console.log(`[CronRecovery] Complete. Processed: ${results.processed}, Recovered: ${results.recovered}, Retrying: ${results.retrying}, Exhausted: ${results.exhausted}`);

    // ── Data Retention: Purge billing attempt logs older than 180 days ──
    try {
        const retentionDate = new Date();
        retentionDate.setDate(retentionDate.getDate() - 180);

        const purged = await db.billingAttemptLog.deleteMany({
            where: { createdAt: { lt: retentionDate } },
        });

        if (purged.count > 0) {
            console.log(`[CronRecovery] Data retention: Purged ${purged.count} billing attempt logs older than 180 days.`);
        }

        // Also purge fully resolved PaymentRecoveryLogs older than 180 days
        const purgedRecovery = await db.paymentRecoveryLog.deleteMany({
            where: {
                createdAt: { lt: retentionDate },
                status: { in: ["recovered", "fallback_executed"] },
            },
        });

        if (purgedRecovery.count > 0) {
            console.log(`[CronRecovery] Data retention: Purged ${purgedRecovery.count} resolved recovery logs older than 180 days.`);
        }
    } catch (retentionErr) {
        console.error(`[CronRecovery] Data retention cleanup error:`, retentionErr);
    }

    return new Response(JSON.stringify({
        success: true,
        ...results,
        timestamp: new Date().toISOString(),
    }), {
        headers: { "Content-Type": "application/json" },
    });
};

// ── Handle a failed retry: increment count, schedule next or execute fallback ──
async function handleRetryFailure(
    recovery: any,
    recoverySettings: any,
    errorMessage: string,
) {
    const newRetryCount = recovery.retryCount + 1;

    if (newRetryCount >= recovery.maxRetries) {
        // Retries exhausted — execute fallback action
        console.log(`[CronRecovery] Retries exhausted for ${recovery.subscriptionContractId}. Executing fallback: ${recovery.fallbackAction}`);

        await db.paymentRecoveryLog.update({
            where: { id: recovery.id },
            data: {
                retryCount: newRetryCount,
                errorMessage,
                status: "exhausted",
            },
        });

        await executeFallbackAction(
            recovery.shop,
            recovery.subscriptionContractId,
            recovery.fallbackAction,
            recovery.id,
        );

        // Send exhaustion notification
        if (recoverySettings.sendNotifications && recovery.customerEmail) {
            let emailType = "recovery";
            if (recovery.fallbackAction === "cancel") emailType = "cancellation";
            else if (recovery.fallbackAction === "pause") emailType = "pause";

            try {
                await sendDonationReceipt({
                    email: recovery.customerEmail,
                    name: recovery.customerName || "Customer",
                    amount: recovery.amount.toFixed(2),
                    orderNumber: recovery.orderNumber || "N/A",
                    type: emailType as any,
                    shop: recovery.shop,
                    frequency: recovery.frequency?.toLowerCase().includes("month") ? "Monthly" : "Weekly",
                    donationName: recovery.donationName || "Recurring Donation",
                    manageUrl: `https://${recovery.shop}/account/subscriptions`,
                });
            } catch (emailErr) {
                console.error(`[CronRecovery] Failed to send exhaustion email:`, emailErr);
            }
        }
    } else {
        // Schedule next retry
        const nextRetryDate = new Date();
        nextRetryDate.setDate(nextRetryDate.getDate() + recovery.retryInterval);

        await db.paymentRecoveryLog.update({
            where: { id: recovery.id },
            data: {
                retryCount: newRetryCount,
                errorMessage,
                nextRetryDate,
                status: "retrying",
            },
        });

        console.log(`[CronRecovery] Scheduled next retry for ${recovery.subscriptionContractId} on ${nextRetryDate.toISOString()}`);
    }
}

// ── Fallback Action Executor ────────────────────────────────────────────────
async function executeFallbackAction(
    shop: string,
    contractId: string,
    fallbackAction: string,
    logId: string,
) {
    if (fallbackAction === "skip") {
        await db.paymentRecoveryLog.update({
            where: { id: logId },
            data: { status: "fallback_executed" },
        });
        console.log(`[CronRecovery] Fallback: skip — subscription stays active for next cycle.`);
        return;
    }

    try {
        const { admin } = await unauthenticated.admin(shop);
        const fullGid = contractId.startsWith("gid://")
            ? contractId
            : `gid://shopify/SubscriptionContract/${contractId}`;

        let mutation = "";
        let mutationName = "";

        if (fallbackAction === "pause") {
            mutation = `mutation { subscriptionContractPause(subscriptionContractId: "${fullGid}") { contract { id status } userErrors { field message } } }`;
            mutationName = "subscriptionContractPause";
        } else if (fallbackAction === "cancel") {
            mutation = `mutation { subscriptionContractCancel(subscriptionContractId: "${fullGid}") { contract { id status } userErrors { field message } } }`;
            mutationName = "subscriptionContractCancel";
        }

        if (mutation) {
            const response = await admin.graphql(mutation);
            const json = await response.json();
            const result = json.data?.[mutationName];

            if (result?.userErrors?.length > 0) {
                console.error(`[CronRecovery] Fallback ${fallbackAction} error:`, result.userErrors[0].message);
            } else {
                console.log(`[CronRecovery] Fallback ${fallbackAction} executed for ${fullGid}`);
            }
        }

        await db.paymentRecoveryLog.update({
            where: { id: logId },
            data: { status: "fallback_executed" },
        });

    } catch (err) {
        console.error(`[CronRecovery] Fallback execution error:`, err);
    }
}
