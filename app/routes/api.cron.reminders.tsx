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

    console.log(`[Cron] Starting subscription reminders check at ${new Date().toISOString()}`);

    // 1. Get all shops with potential subscriptions
    const shops = await db.session.findMany({
        distinct: ['shop'],
        select: { shop: true }
    });

    const results = {
        processedShops: 0,
        remindersSent: 0,
        errors: [] as string[]
    };

    for (const { shop } of shops) {
        try {
            // 2. Get unauthenticated admin context
            const { admin } = await unauthenticated.admin(shop);

            // 3. Check if shop has reminder feature enabled
            const subscription = await db.planSubscription.findUnique({ where: { shop } });

            if (!hasActiveSubscription(subscription, "canSendReminders")) {
                console.log(`[Cron] Skipping shop ${shop} - reminders not supported or subscription inactive.`);
                continue;
            }

            results.processedShops++;

            // 4. Fetch upcoming subscriptions from Shopify
            // We look for anything that will be billed in roughly 3 days
            const response = await admin.graphql(`#graphql
                query getUpcomingSubscriptions($query: String!) {
                    subscriptionContracts(first: 50, query: $query) {
                        edges {
                            node {
                                id
                                status
                                nextBillingDate
                                currencyCode
                                customer {
                                    firstName
                                    lastName
                                    email
                                    id
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
                                    name
                                }
                            }
                        }
                    }
                }`,
                {
                    variables: {
                        query: "status:active"
                    }
                }
            );

            const json = await response.json();
            const contracts = json.data?.subscriptionContracts?.edges || [];

            for (const edge of contracts) {
                const contract = edge.node;
                const nextBillingDate = new Date(contract.nextBillingDate);

                // Calculate target date (3 days from now)
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() + 3);

                // Check if billing date is the target date (comparing only Year-Month-Day)
                const isTargetDate = nextBillingDate.getUTCFullYear() === targetDate.getUTCFullYear() &&
                    nextBillingDate.getUTCMonth() === targetDate.getUTCMonth() &&
                    nextBillingDate.getUTCDate() === targetDate.getUTCDate();

                if (isTargetDate) {
                    const orderId = contract.originOrder?.name || contract.id;

                    // 5. Check if we already sent a reminder for THIS billing date
                    const existingSub = await db.subscription.findUnique({
                        where: { orderId: orderId }
                    });

                    const reminderSentForThisDate = existingSub?.reminderSentForDate &&
                        new Date(existingSub.reminderSentForDate).toISOString().split('T')[0] === nextBillingDate.toISOString().split('T')[0];

                    if (!reminderSentForThisDate) {
                        console.log(`[Cron] Sending reminder to ${contract.customer?.email} for shop ${shop}`);

                        const line = contract.lines.edges[0]?.node;
                        const amount = line?.currentPrice?.amount || "0.00";
                        const frequency = line?.sellingPlanName || "Subscription";
                        const customerName = `${contract.customer?.firstName || ""} ${contract.customer?.lastName || ""}`.trim() || "Donor";

                        const emailRes = await sendDonationReceipt({
                            email: contract.customer?.email,
                            name: customerName,
                            amount: amount,
                            orderNumber: contract.originOrder?.name || "N/A",
                            shop: shop,
                            type: "reminder",
                            frequency: frequency,
                            nextBillingDate: nextBillingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                            donationName: line?.title || "Recurring Donation",
                            manageUrl: `https://${shop}/apps/smart-donate-enhancement/subscriptions`
                        });

                        // Stagger sending to avoid spam filters and rate limits
                        await new Promise((resolve) => setTimeout(resolve, 1000));

                        if (emailRes.success) {
                            results.remindersSent++;
                            // 6. Record that we sent the reminder
                            await db.subscription.upsert({
                                where: { orderId: orderId },
                                create: {
                                    shop,
                                    customerId: contract.customer?.id || "",
                                    orderId: orderId,
                                    status: "active",
                                    frequency: frequency,
                                    amount: parseFloat(amount),
                                    currency: contract.currencyCode || "USD",
                                    nextBillingDate: nextBillingDate,
                                    reminderSentForDate: nextBillingDate,
                                    lastReminderDate: new Date()
                                },
                                update: {
                                    reminderSentForDate: nextBillingDate,
                                    lastReminderDate: new Date()
                                }
                            });
                        } else {
                            console.error(`[Cron] Failed to send reminder to ${contract.customer?.email}:`, emailRes.error);
                        }
                    }
                }
            }
        } catch (err) {
            const msg = `Error processing shop ${shop}: ${err instanceof Error ? err.message : String(err)}`;
            console.error(`[Cron] ${msg}`);
            results.errors.push(msg);
        }
    }

    return new Response(JSON.stringify({
        success: true,
        processedShops: results.processedShops,
        remindersSent: results.remindersSent,
        errors: results.errors,
        timestamp: new Date().toISOString()
    }), {
        headers: { "Content-Type": "application/json" }
    });
};
