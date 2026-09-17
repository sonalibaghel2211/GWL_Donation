import type { LoaderFunctionArgs } from "react-router";
import { unauthenticated } from "../shopify.server";
import db from "../db.server";
import { hasActiveSubscription } from "../utils/features";

/**
 * ─── Automatic Subscription Billing Cron Job ────────────────────────────────
 *
 * This endpoint should be called on a schedule (e.g., every hour or every 30 mins)
 * by an external cron service (Railway Cron, cron-job.org, EasyCron, etc.).
 *
 * It queries all active Shopify Subscription Contracts whose nextBillingDate
 * has passed and triggers a billing attempt for each one via the
 * subscriptionBillingAttemptCreate GraphQL mutation.
 *
 * URL: GET /api/cron/billing?secret=YOUR_CRON_SECRET
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || secret !== cronSecret) {
        return new Response("Unauthorized", { status: 401 });
    }

    const startTime = new Date();

    const results = {
        shopsProcessed: 0,
        contractsFound: 0,
        billingTriggered: 0,
        billingSucceeded: 0,
        billingPending: 0,
        billingFailed: 0,
        skipped: 0,
        errors: [] as string[],
    };

    try {
        const shops = await db.session.findMany({
            distinct: ["shop"],
            select: { shop: true },
        });
        for (const { shop } of shops) {
            try {
                // Check if shop has active subscription for recurring donations
                const subscription = await db.planSubscription.findUnique({
                    where: { shop },
                });

                if (!hasActiveSubscription(subscription, "canUseRecurringDonations")) {
                    console.log(`[CronBilling] Skipping shop ${shop} - recurring donations not supported or subscription inactive.`);
                    continue;
                }

                const { admin } = await unauthenticated.admin(shop);
                results.shopsProcessed++;

                const now = new Date();

                const response = await admin.graphql(
                    `#graphql
                    query getDueSubscriptionContracts($first: Int!, $query: String!) {
                        subscriptionContracts(first: $first, query: $query) {
                            edges {
                                node {
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
                                                currentPrice {
                                                    amount
                                                }
                                            }
                                        }
                                    }
                                    originOrder {
                                        id
                                        name
                                    }
                                }
                            }
                        }
                    }`,
                    {
                        variables: {
                            first: 50,
                            query: "status:active",
                        },
                    }
                );

                const json: any = await response.json();

                if (json.errors && json.errors.length > 0) {
                    const errMsg = json.errors.map((e: any) => e.message).join("; ");
                    console.error(`[CronBilling] GraphQL errors for ${shop}: ${errMsg}`);
                    results.errors.push(`${shop}: ${errMsg}`);
                    continue;
                }

                const contracts = json.data?.subscriptionContracts?.edges || [];

                const dueContracts = contracts.filter((edge: any) => {
                    const nextBilling = edge.node.nextBillingDate;
                    if (!nextBilling) return false;
                    return new Date(nextBilling) <= now;
                });

                if (dueContracts.length === 0) {
                    continue;
                }

                results.contractsFound += dueContracts.length;

                for (const edge of dueContracts) {
                    const contract = edge.node;
                    const contractId = contract.id;
                    const numericId = contractId.split("/").pop();

                    try {
                        // Dedup window prevents billing contract multiple times if nextBillingDate has not advanced
                        const line = contract.lines?.edges?.[0]?.node;
                        const sellingPlanName = (line?.sellingPlanName || "").toLowerCase();
                        let dedupHours = 20; // Default safety margin
                        if (sellingPlanName.includes("week")) {
                            dedupHours = 6 * 24; // 6 days for weekly
                        } else if (sellingPlanName.includes("month")) {
                            dedupHours = 25 * 24; // 25 days for monthly
                        }

                        const recentAttempt = await db.billingAttemptLog.findFirst({
                            where: {
                                shop,
                                subscriptionContractId: contractId,
                                source: "cron_billing",
                                status: { in: ["success", "pending"] },
                                createdAt: {
                                    gte: new Date(now.getTime() - dedupHours * 60 * 60 * 1000),
                                },
                            },
                        });

                        if (recentAttempt) {
                            results.skipped++;
                            continue;
                        }

                        const activeRecovery = await db.paymentRecoveryLog.findUnique({
                            where: {
                                shop_subscriptionContractId: {
                                    shop,
                                    subscriptionContractId: contractId,
                                },
                            },
                        });

                        if (activeRecovery && (activeRecovery.status === "pending" || activeRecovery.status === "retrying")) {
                            results.skipped++;
                            continue;
                        }

                        const customer = contract.customer;
                        const amount = parseFloat(line?.currentPrice?.amount || "0");
                        const currency = contract.currencyCode || "USD";
                        const donationName = line?.title || "Recurring Donation";
                        const frequency = line?.sellingPlanName || "Subscription";
                        const customerEmail = customer?.email || "";
                        const customerName = `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() || "Customer";
                        const originOrder = contract.originOrder;

                        const idempotencyKey = `cron_billing_${numericId}_${now.getTime()}`;

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
                                        errorCode
                                        errorMessage
                                        order {
                                            id
                                            name
                                        }
                                    }
                                    userErrors {
                                        field
                                        message
                                    }
                                }
                            }`,
                            {
                                variables: {
                                    contractId,
                                    input: {
                                        idempotencyKey,
                                        originTime: now.toISOString(),
                                    },
                                },
                            }
                        );

                        const billingJson: any = await billingResponse.json();
                        const billingResult = billingJson.data?.subscriptionBillingAttemptCreate;

                        if (billingResult?.userErrors?.length > 0) {
                            const errMsg = billingResult.userErrors.map((e: any) => e.message).join("; ");
                            console.error(`[CronBilling] ${shop}: UserError for contract #${numericId}: ${errMsg}`);

                            await db.billingAttemptLog.create({
                                data: {
                                    shop,
                                    subscriptionContractId: contractId,
                                    billingAttemptId: null,
                                    source: "cron_billing",
                                    status: "failed",
                                    errorMessage: errMsg,
                                    customerEmail,
                                    customerName,
                                    amount,
                                    currency,
                                    donationName,
                                    frequency,
                                    idempotencyKey,
                                    rawPayload: JSON.stringify(billingJson).substring(0, 4000),
                                },
                            });

                            results.billingFailed++;
                            results.billingTriggered++;
                            continue;
                        }

                        const billingAttempt = billingResult?.subscriptionBillingAttempt;
                        const billingAttemptId = billingAttempt?.id || null;

                        results.billingTriggered++;

                        if (billingAttempt?.order) {
                            // Immediate success

                            await db.billingAttemptLog.create({
                                data: {
                                    shop,
                                    subscriptionContractId: contractId,
                                    billingAttemptId,
                                    source: "cron_billing",
                                    status: "success",
                                    orderId: billingAttempt.order.id,
                                    orderNumber: billingAttempt.order.name,
                                    customerEmail,
                                    customerName,
                                    amount,
                                    currency,
                                    donationName,
                                    frequency,
                                    idempotencyKey,
                                },
                            });

                            results.billingSucceeded++;
                        } else if (billingAttempt?.errorCode || billingAttempt?.errorMessage) {
                            await db.billingAttemptLog.create({
                                data: {
                                    shop,
                                    subscriptionContractId: contractId,
                                    billingAttemptId,
                                    source: "cron_billing",
                                    status: "failed",
                                    errorCode: billingAttempt.errorCode || null,
                                    errorMessage: billingAttempt.errorMessage || null,
                                    customerEmail,
                                    customerName,
                                    amount,
                                    currency,
                                    donationName,
                                    frequency,
                                    idempotencyKey,
                                    rawPayload: JSON.stringify(billingJson).substring(0, 4000),
                                },
                            });

                            results.billingFailed++;
                        } else {
                            // Async processing; result handled by webhook

                            await db.billingAttemptLog.create({
                                data: {
                                    shop,
                                    subscriptionContractId: contractId,
                                    billingAttemptId,
                                    source: "cron_billing",
                                    status: "pending",
                                    customerEmail,
                                    customerName,
                                    amount,
                                    currency,
                                    donationName,
                                    frequency,
                                    idempotencyKey,
                                },
                            });

                            results.billingPending++;
                        }
                    } catch (contractErr: any) {
                        const errMsg = `Contract #${numericId} error: ${contractErr.message || contractErr}`;
                        console.error(`[CronBilling] ${shop}: ${errMsg}`);
                        results.errors.push(`${shop}: ${errMsg}`);
                    }
                }
            } catch (shopErr: any) {
                if (shopErr.message?.includes("Could not find a shop")) {
                    continue;
                }
                const errMsg = `Shop ${shop} error: ${shopErr.message || shopErr}`;
                console.error(`[CronBilling] ${errMsg}`);
                results.errors.push(errMsg);
            }
        }
    } catch (err: any) {
        console.error("[CronBilling] Fatal error:", err);
        results.errors.push(`Fatal: ${err.message || err}`);
    }

    const elapsed = Date.now() - startTime.getTime();

    return new Response(
        JSON.stringify({
            success: true,
            ...results,
            elapsedMs: elapsed,
            timestamp: new Date().toISOString(),
        }),
        {
            headers: { "Content-Type": "application/json" },
        }
    );
};
