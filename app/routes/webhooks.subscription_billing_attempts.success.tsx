import type { ActionFunctionArgs } from "react-router";
import { authenticate, unauthenticated } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { shop, topic, payload } = await authenticate.webhook(request);

    if (topic !== "SUBSCRIPTION_BILLING_ATTEMPTS_SUCCESS") {
        return new Response(null, { status: 400 });
    }

    console.log(`[BillingSuccess] Billing attempt succeeded for shop ${shop}`, JSON.stringify(payload).substring(0, 500));

    try {
        const attempt = payload as any;
        const contractId: string =
            attempt.admin_graphql_api_subscription_contract_id ||
            attempt.subscription_contract_id ||
            "";

        const normalizedContractId = contractId.startsWith("gid://")
            ? contractId
            : `gid://shopify/SubscriptionContract/${contractId}`;

        // Extract billing attempt ID for dedup
        const billingAttemptId: string | null =
            attempt.admin_graphql_api_id || attempt.id
                ? (attempt.admin_graphql_api_id || `gid://shopify/SubscriptionBillingAttempt/${attempt.id}`)
                : null;

        // Dedup: check if we already logged this exact billing attempt
        let existingLog = null;
        if (billingAttemptId) {
            existingLog = await db.billingAttemptLog.findUnique({
                where: { billingAttemptId },
            });
            if (existingLog && existingLog.status === "success") {
                console.log(`[BillingSuccess] Duplicate webhook — already logged billingAttemptId ${billingAttemptId} with success`);
                return new Response("OK - duplicate", { status: 200 });
            }
        }

        // Fetch contract details from Shopify for customer + order info
        let contractDetails: any = null;
        try {
            const { admin } = await unauthenticated.admin(shop);
            const response = await admin.graphql(
                `#graphql
                query getContractForSuccess($id: ID!) {
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
                { variables: { id: normalizedContractId } }
            );

            const json = await response.json();
            contractDetails = json.data?.subscriptionContract;
        } catch (gqlErr) {
            console.error(`[BillingSuccess] Failed to fetch contract details:`, gqlErr);
        }

        const customer = contractDetails?.customer;
        const line = contractDetails?.lines?.edges?.[0]?.node;
        const amount = parseFloat(line?.currentPrice?.amount || "0");
        const currency = contractDetails?.currencyCode || "USD";
        const donationName = line?.title || "Recurring Donation";
        const frequency = line?.sellingPlanName || "Subscription";
        const customerEmail = customer?.email || "";
        const customerName = `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() || "Customer";

        // Extract order info from the webhook payload
        const orderId = attempt.order_id
            ? `gid://shopify/Order/${attempt.order_id}`
            : null;

        // 1. Log the successful billing attempt
        if (existingLog) {
            await db.billingAttemptLog.update({
                where: { id: existingLog.id },
                data: {
                    status: "success",
                    orderId,
                    customerEmail,
                    customerName,
                    amount,
                    currency,
                    donationName,
                    frequency,
                },
            });
        } else {
            await db.billingAttemptLog.create({
                data: {
                    shop,
                    subscriptionContractId: normalizedContractId,
                    billingAttemptId,
                    source: "webhook",
                    status: "success",
                    orderId,
                    customerEmail,
                    customerName,
                    amount,
                    currency,
                    donationName,
                    frequency,
                },
            });
        }

        console.log(`[BillingSuccess] Logged successful billing attempt for contract ${normalizedContractId}`);

        // 2. If a PaymentRecoveryLog exists for this contract in pending/retrying state,
        //    mark it as recovered — this means a retry succeeded
        const recoveryLog = await db.paymentRecoveryLog.findUnique({
            where: {
                shop_subscriptionContractId: {
                    shop,
                    subscriptionContractId: normalizedContractId,
                },
            },
        });

        if (recoveryLog && (recoveryLog.status === "pending" || recoveryLog.status === "retrying")) {
            await db.paymentRecoveryLog.update({
                where: { id: recoveryLog.id },
                data: {
                    status: "recovered",
                    orderId,
                },
            });
            console.log(`[BillingSuccess] ✅ Recovery log ${recoveryLog.id} marked as recovered`);
        }

    } catch (err) {
        console.error("[BillingSuccess] Webhook handler error:", err);
    }

    return new Response("OK", { status: 200 });
};
