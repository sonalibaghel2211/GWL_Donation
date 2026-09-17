import type { ActionFunctionArgs } from "react-router";
import { authenticate, unauthenticated } from "../shopify.server";
import db from "../db.server";
import { sendDonationReceipt } from "../utils/sendgrid.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { shop, topic, payload } = await authenticate.webhook(request);

    if (topic !== "SUBSCRIPTION_BILLING_ATTEMPTS_FAILURE") {
        return new Response(null, { status: 400 });
    }

    console.log(`[PaymentRecovery] Billing attempt failed for shop ${shop}`, JSON.stringify(payload).substring(0, 500));

    try {
        const attempt = payload as any;
        const contractId: string =
            attempt.subscription_contract_id ||
            attempt.admin_graphql_api_subscription_contract_id ||
            `gid://shopify/SubscriptionContract/${attempt.subscription_contract_id}`;

        const errorCode = attempt.error_code || attempt.error?.code || "unknown";
        const errorMessage = attempt.error_message || attempt.error?.message || "Payment failed";

        // Extract billing attempt ID for dedup protection
        const billingAttemptId: string | null =
            attempt.admin_graphql_api_id || attempt.id
                ? (attempt.admin_graphql_api_id || `gid://shopify/SubscriptionBillingAttempt/${attempt.id}`)
                : null;

        // Dedup: check if we already processed this exact billing attempt
        let existingAttempt = null;
        if (billingAttemptId) {
            existingAttempt = await db.billingAttemptLog.findUnique({
                where: { billingAttemptId },
            });
            if (existingAttempt && existingAttempt.status === "failed") {
                console.log(`[PaymentRecovery] Duplicate webhook — already logged billingAttemptId ${billingAttemptId} with failure`);
                return new Response("OK - duplicate", { status: 200 });
            }
        }

        // 1. Fetch merchant's recovery settings
        const recoverySettings = await db.paymentRecoverySettings.findUnique({
            where: { shop },
        });

        // 2. Fetch subscription contract details from Shopify for customer info
        let contractDetails: any = null;
        try {
            const { admin } = await unauthenticated.admin(shop);
            const fullGid = contractId.startsWith("gid://")
                ? contractId
                : `gid://shopify/SubscriptionContract/${contractId}`;

            const response = await admin.graphql(
                `#graphql
                query getContractForRecovery($id: ID!) {
                    subscriptionContract(id: $id) {
                        id
                        status
                        nextBillingDate
                        currencyCode
                        customer {
                            email
                            firstName
                            lastName
                        }
                        lines(first: 1) {
                            edges {
                                node {
                                    title
                                    sellingPlanName
                                    currentPrice { amount }
                                }
                            }
                        }
                        originOrder {
                            id
                            name
                        }
                    }
                }`,
                { variables: { id: fullGid } }
            );

            const json = await response.json();
            contractDetails = json.data?.subscriptionContract;
        } catch (gqlErr) {
            console.error(`[PaymentRecovery] Failed to fetch contract details:`, gqlErr);
        }

        const customer = contractDetails?.customer;
        const line = contractDetails?.lines?.edges?.[0]?.node;
        const originOrder = contractDetails?.originOrder;
        const amount = parseFloat(line?.currentPrice?.amount || "0");
        const currency = contractDetails?.currencyCode || "USD";
        const donationName = line?.title || "Recurring Donation";
        const frequency = line?.sellingPlanName || "Subscription";
        const customerEmail = customer?.email || "";
        const customerName = `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() || "Customer";

        const normalizedContractId = contractId.startsWith("gid://")
            ? contractId
            : `gid://shopify/SubscriptionContract/${contractId}`;

        // Get retry number for billing attempt log
        const existingLogForRetryNum = await db.paymentRecoveryLog.findUnique({
            where: {
                shop_subscriptionContractId: {
                    shop,
                    subscriptionContractId: normalizedContractId,
                },
            },
        });
        const currentRetryCount = existingLogForRetryNum && (existingLogForRetryNum.status === "pending" || existingLogForRetryNum.status === "retrying")
            ? existingLogForRetryNum.retryCount + 1
            : 0;

        // ── Log to BillingAttemptLog for granular attempt-level tracking (ALWAYS) ──
        try {
            if (existingAttempt) {
                await db.billingAttemptLog.update({
                    where: { id: existingAttempt.id },
                    data: {
                        status: "failed",
                        errorCode,
                        errorMessage,
                        orderId: originOrder?.id || null,
                        orderNumber: originOrder?.name || null,
                        customerEmail,
                        customerName,
                        amount,
                        currency,
                        donationName,
                        frequency,
                        retryNumber: currentRetryCount,
                        rawPayload: JSON.stringify(payload).substring(0, 4000),
                    },
                });
            } else {
                await db.billingAttemptLog.create({
                    data: {
                        shop,
                        subscriptionContractId: normalizedContractId,
                        billingAttemptId,
                        source: "webhook",
                        status: "failed",
                        errorCode,
                        errorMessage,
                        orderId: originOrder?.id || null,
                        orderNumber: originOrder?.name || null,
                        customerEmail,
                        customerName,
                        amount,
                        currency,
                        donationName,
                        frequency,
                        retryNumber: currentRetryCount,
                        rawPayload: JSON.stringify(payload).substring(0, 4000),
                    },
                });
            }
            console.log(`[PaymentRecovery] BillingAttemptLog entry updated/created (Always) for ${normalizedContractId}`);
        } catch (logErr) {
            console.error(`[PaymentRecovery] Failed to log/update BillingAttemptLog:`, logErr);
        }

        if (!recoverySettings?.enabled) {
            console.log(`[PaymentRecovery] Recovery disabled for shop ${shop}, skipping recovery logic.`);
            return new Response("OK - Recovery disabled but logged failure", { status: 200 });
        }

        // 3. Calculate next retry date
        const nextRetryDate = new Date();
        nextRetryDate.setDate(nextRetryDate.getDate() + recoverySettings.retryInterval);

        // 4. Create or update recovery log
        const existingLog = await db.paymentRecoveryLog.findUnique({
            where: {
                shop_subscriptionContractId: {
                    shop,
                    subscriptionContractId: normalizedContractId,
                },
            },
        });

        let recoveryLog;
        if (existingLog && (existingLog.status === "pending" || existingLog.status === "retrying")) {
            // Already tracking this contract — increment retry count
            recoveryLog = await db.paymentRecoveryLog.update({
                where: { id: existingLog.id },
                data: {
                    retryCount: existingLog.retryCount + 1,
                    errorCode,
                    errorMessage,
                    nextRetryDate,
                    status: existingLog.retryCount + 1 >= existingLog.maxRetries ? "exhausted" : "retrying",
                },
            });
        } else {
            // First failure for this contract
            recoveryLog = await db.paymentRecoveryLog.upsert({
                where: {
                    shop_subscriptionContractId: {
                        shop,
                        subscriptionContractId: normalizedContractId,
                    },
                },
                create: {
                    shop,
                    subscriptionContractId: normalizedContractId,
                    orderId: originOrder?.id || null,
                    orderNumber: originOrder?.name || null,
                    customerEmail,
                    customerName,
                    amount,
                    currency,
                    errorCode,
                    errorMessage,
                    retryCount: 0,
                    maxRetries: recoverySettings.retryAttempts,
                    retryInterval: recoverySettings.retryInterval,
                    nextRetryDate,
                    fallbackAction: recoverySettings.fallbackAction,
                    status: "pending",
                    donationName,
                    frequency,
                },
                update: {
                    retryCount: 0,
                    errorCode,
                    errorMessage,
                    nextRetryDate,
                    maxRetries: recoverySettings.retryAttempts,
                    retryInterval: recoverySettings.retryInterval,
                    fallbackAction: recoverySettings.fallbackAction,
                    status: "pending",
                },
            });
        }

        console.log(`[PaymentRecovery] Recovery log ${recoveryLog.id} — retry ${recoveryLog.retryCount}/${recoveryLog.maxRetries}, next retry: ${nextRetryDate.toISOString()}`);

        // 5. Send failure notification email
        if (recoverySettings.sendNotifications && customerEmail) {
            let emailType = "recovery";
            if (recoveryLog.status === "exhausted") {
                if (recoverySettings.fallbackAction === "cancel") emailType = "cancellation";
                else if (recoverySettings.fallbackAction === "pause") emailType = "pause";
            }

            try {
                const emailResult = await sendDonationReceipt({
                    email: customerEmail,
                    name: customerName,
                    amount: amount.toFixed(2),
                    orderNumber: originOrder?.name || "N/A",
                    type: emailType as any,
                    shop,
                    frequency: frequency.toLowerCase().includes("month") ? "Monthly" : frequency.toLowerCase().includes("week") ? "Weekly" : "Subscription",
                    nextBillingDate: nextRetryDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                    }),
                    donationName,
                    manageUrl: `https://${shop}/account/subscriptions`,
                    currency
                });

                if (emailResult.success) {
                    console.log(`[PaymentRecovery] Failure notification sent to ${customerEmail}`);
                } else {
                    console.error(`[PaymentRecovery] Failed to send notification: ${emailResult.error}`);
                }
            } catch (emailErr) {
                console.error(`[PaymentRecovery] Email send error:`, emailErr);
            }
        }

        // 6. If retries are already exhausted on this webhook, execute fallback immediately
        if (recoveryLog.status === "exhausted") {
            console.log(`[PaymentRecovery] Retries exhausted for ${normalizedContractId}, executing fallback: ${recoverySettings.fallbackAction}`);
            await executeFallbackAction(shop, normalizedContractId, recoverySettings.fallbackAction, recoveryLog.id);
        }

    } catch (err) {
        console.error("[PaymentRecovery] Webhook handler error:", err);
    }

    return new Response("OK", { status: 200 });
};

// ── Fallback Action Executor ────────────────────────────────────────────────
async function executeFallbackAction(
    shop: string,
    contractId: string,
    fallbackAction: string,
    logId: string,
) {
    if (fallbackAction === "skip") {
        // Just mark as done — subscription stays active for the next billing cycle
        await db.paymentRecoveryLog.update({
            where: { id: logId },
            data: { status: "fallback_executed" },
        });
        console.log(`[PaymentRecovery] Fallback: skip — subscription left active.`);
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
                console.error(`[PaymentRecovery] Fallback ${fallbackAction} error:`, result.userErrors[0].message);
            } else {
                console.log(`[PaymentRecovery] Fallback ${fallbackAction} executed for ${fullGid}`);
            }
        }

        await db.paymentRecoveryLog.update({
            where: { id: logId },
            data: { status: "fallback_executed" },
        });

    } catch (err) {
        console.error(`[PaymentRecovery] Fallback execution error:`, err);
    }
}
