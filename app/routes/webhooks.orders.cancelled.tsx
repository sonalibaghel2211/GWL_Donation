import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { sendDonationReceipt } from "../utils/sendgrid.server";
import { checkFeatureAccess } from "../utils/features";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { shop, admin, payload, topic } = await authenticate.webhook(request);

    if (topic !== "ORDERS_CANCELLED") {
        return new Response(null, { status: 400 });
    }

    const order = payload as any;
    const orderIdStr = order.admin_graphql_api_id || `gid://shopify/Order/${order.id}`;

    const subscription = await db.planSubscription.findUnique({
        where: { shop },
    });
    const plan = subscription?.plan || "basic";

    try {
        let existingLog = await (db as any).posDonationLog.findUnique({
            where: { orderId: orderIdStr },
        });
        let logType: 'pos' | 'recurring' = 'pos';

        if (!existingLog) {
            existingLog = await (db as any).recurringDonationLog.findUnique({
                where: { orderId: orderIdStr },
            });
            logType = 'recurring';
        }

        if (existingLog) {
            if (logType === 'pos') {
                await (db as any).posDonationLog.update({
                    where: { orderId: orderIdStr },
                    data: { status: "cancelled" },
                });
            } else {
                await (db as any).recurringDonationLog.update({
                    where: { orderId: orderIdStr },
                    data: { status: "cancelled" },
                });
            }

            // Trigger Cancellation Email
            try {
                const customerEmail = order.email || order.contact_email || order.customer?.email;
                const customerName = order.customer ? `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim() : (order.billing_address?.name || "");

                if (customerEmail) {
                    if (checkFeatureAccess(plan, "canSendCancelEmail")) {
                        const freqLabel = logType === 'recurring'
                            ? (existingLog.frequency === "weekly" ? "Weekly" : existingLog.frequency === "monthly" ? "Monthly" : "One-time")
                            : "One-time";

                        await sendDonationReceipt({
                            email: customerEmail,
                            name: customerName,
                            amount: existingLog.donationAmount.toFixed(2),
                            orderNumber: existingLog.orderNumber || "",
                            type: "cancellation",
                            shop,
                            frequency: freqLabel
                        });
                    } else {
                        console.log(`[Webhook] Cancellation email skipped for ${shop} - Plan restriction: ${plan}`);
                    }
                }
            } catch (emailErr) {
                console.error("Failed to send cancellation email:", emailErr);
            }

            if (admin) {
                const existingTags = order.tags ? order.tags.split(',').map((t: string) => t.trim()) : [];
                if (!existingTags.includes("donation_refunded")) {
                    existingTags.push("donation_refunded");
                }

                const input = {
                    id: orderIdStr,
                    tags: existingTags.join(","),
                };

                const updateResponse = await admin.graphql(
                    `#graphql
          mutation orderUpdate($input: OrderInput!) {
            orderUpdate(input: $input) {
              order {
                id
                tags
              }
              userErrors {
                field
                message
              }
            }
          }`,
                    { variables: { input } }
                );

                const updateData = await updateResponse.json();
                if (updateData.data?.orderUpdate?.userErrors?.length > 0) {
                    console.error("Order cancel tags update errors:", updateData.data.orderUpdate.userErrors);
                }
            }
        }
    } catch (err) {
        console.error("Error processing orders/cancelled webhook:", err);
    }

    return new Response("OK", { status: 200 });
};
