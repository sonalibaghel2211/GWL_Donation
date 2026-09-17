import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { sendDonationReceipt } from "../utils/sendgrid.server";
import { hasActiveSubscription } from "../utils/features";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { shop, admin, payload, topic } = await authenticate.webhook(request);

    if (topic !== "REFUNDS_CREATE") {
        return new Response(null, { status: 400 });
    }

    const refund = payload as any;
    // refund.order_id exists. We need GID for order update
    if (!refund.order_id) return new Response(null, { status: 200 });

    const subscription = await db.planSubscription.findUnique({
        where: { shop },
    });
    const hasActiveSub = subscription && subscription.status === "active";

    const orderIdStr = `gid://shopify/Order/${refund.order_id}`;

    try {
        // ── Check all possible donation tables ──
        let donationFound = false;
        let refundAmount = 0;
        let refundFreq = "Donation";
        let refundDonationName = "";

        // 1. POS Logs
        const posLog = await db.posDonationLog.findFirst({ where: { orderId: orderIdStr } });
        if (posLog) {
            await db.posDonationLog.update({ where: { orderId: orderIdStr }, data: { status: "refunded" } });
            donationFound = true;
            refundAmount = posLog.donationAmount;
            refundFreq = "POS";
            const posSettings = await db.posDonationSettings.findUnique({ where: { shop } });
            refundDonationName = posSettings?.tooltipMessage || "POS Donation";
        }

        // 2. Recurring Logs (Subscriptions only now)
        const recLog = await db.recurringDonationLog.findFirst({ where: { orderId: orderIdStr } });
        if (recLog) {
            await db.recurringDonationLog.update({ where: { orderId: orderIdStr }, data: { status: "refunded" } });
            donationFound = true;
            refundAmount = recLog.donationAmount;
            refundFreq = recLog.frequency === "weekly" ? "Weekly" : "Monthly";
            refundDonationName = recLog.frequency === "weekly" ? "Weekly Recurring Donation" : "Monthly Recurring Donation";
        }

        // 3. Round-Up Logs
        const roundLog = await db.roundUpDonationLog.findFirst({ where: { orderId: orderIdStr } });
        if (roundLog) {
            await db.roundUpDonationLog.update({ where: { orderId: orderIdStr }, data: { status: "refunded" } });
            donationFound = true;
            refundAmount = roundLog.donationAmount;
            refundFreq = "Round-Up";
            const roundupSettings = await db.roundUpDonationSettings.findUnique({ where: { shop } });
            refundDonationName = roundupSettings?.campaignTitle || "Round-Up Donation";
        }

        // 4. Preset / One-Time Global (Unified)
        const presetLogs = await db.donation.findMany({
            where: { orderId: refund.order_id.toString() },
            include: { campaign: true }
        });
        if (presetLogs.length > 0) {
            await db.donation.updateMany({ where: { orderId: refund.order_id.toString() }, data: { status: "refunded" } });
            donationFound = true;
            refundAmount = presetLogs.reduce((sum, d) => sum + d.amount, 0);
            refundFreq = "Preset";
            const names = presetLogs.map(d => d.campaign?.name).filter(Boolean);
            if (names.length > 0) {
                refundDonationName = Array.from(new Set(names)).join(", ");
            }
        }

        if (donationFound) {
            if (admin) {
                // We need to fetch the order details first to get email/name
                const orderResponse = await admin.graphql(
                    `#graphql
          query getOrder($id: ID!) {
            order(id: $id) {
              id
              name
              email
              tags
              currencyCode
              billingAddress {
                firstName
                lastName
              }
              lineItems(first: 20) {
                edges {
                  node {
                    title
                    customAttributes {
                      key
                      value
                    }
                  }
                }
              }
            }
          }`,
                    { variables: { id: orderIdStr } }
                );

                const orderData = await orderResponse.json();
                const order = orderData.data?.order;

                if (order && !refundDonationName && order.lineItems?.edges) {
                    const namesFromGql: string[] = [];
                    for (const edge of order.lineItems.edges) {
                        const customAttrs = edge.node.customAttributes || [];
                        const prop = customAttrs.find((a: any) => a.key === "Donation Campaign" || a.key === "_donation_campaign");
                        if (prop?.value) {
                            namesFromGql.push(prop.value);
                        } else if (edge.node.title && (edge.node.title.toLowerCase().includes("donation") || edge.node.title.toLowerCase().includes("campaign"))) {
                            namesFromGql.push(edge.node.title);
                        }
                    }
                    if (namesFromGql.length > 0) {
                        refundDonationName = Array.from(new Set(namesFromGql)).join(", ");
                    }
                }

                if (order && order.email) {
                    const customerName = order.billingAddress ? `${order.billingAddress.firstName || ""} ${order.billingAddress.lastName || ""}`.trim() : "";
                    try {
                        if (hasActiveSubscription(subscription, "canSendRefundEmail")) {
                            await sendDonationReceipt({
                                email: order.email,
                                name: customerName,
                                amount: refundAmount.toFixed(2),
                                orderNumber: order.name,
                                type: "refund",
                                shop,
                                frequency: refundFreq,
                                currency: order.currencyCode || "USD",
                                donationName: refundDonationName || undefined,
                            });
                        }
                    } catch (emailErr) {
                        console.error("Failed to send refund email:", emailErr);
                    }
                }

                if (hasActiveSub) {
                    const rawTags = order?.tags || [];
                    const existingTags: string[] = Array.isArray(rawTags)
                        ? rawTags
                        : String(rawTags).split(",").map((t: string) => t.trim()).filter(Boolean);

                    if (!existingTags.includes("donation_refunded")) {
                        existingTags.push("donation_refunded");
                    }
                    if (!existingTags.includes("Refunded")) {
                        existingTags.push("Refunded");
                    }

                    const input = {
                        id: orderIdStr,
                        tags: existingTags,
                    };

                    const updateResponse = await admin.graphql(
                        `#graphql
                mutation orderUpdate($input: OrderInput!) {
                  orderUpdate(input: $input) {
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
                        console.error("Order refund tags update errors:", updateData.data.orderUpdate.userErrors);
                    }
                }
            }
        }
    } catch (err) {
        console.error("Error processing refunds/create webhook:", err);
    }

    return new Response("OK", { status: 200 });
};
