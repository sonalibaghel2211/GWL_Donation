import db from "../db.server";
import { sendDonationReceipt } from "./sendgrid.server";

export type SubscriptionAction = "pause" | "activate" | "cancel";

export async function performSubscriptionAction({
    admin,
    shop,
    subscriptionId,
    actionType,
}: {
    admin: any;
    shop: string;
    subscriptionId: string;
    actionType: SubscriptionAction;
}) {
    const fullGid = subscriptionId.startsWith("gid://shopify/SubscriptionContract/")
        ? subscriptionId
        : `gid://shopify/SubscriptionContract/${subscriptionId}`;

    let mutation = "";
    let successMessage = "";

    switch (actionType) {
        case "pause":
            mutation = `#graphql
        mutation subscriptionContractPause($id: ID!) {
          subscriptionContractPause(subscriptionContractId: $id) {
            contract { id status }
            userErrors { field message }
          }
        }`;
            successMessage = "Subscription paused successfully";
            break;
        case "activate":
            mutation = `#graphql
        mutation subscriptionContractActivate($id: ID!) {
          subscriptionContractActivate(subscriptionContractId: $id) {
            contract { id status }
            userErrors { field message }
          }
        }`;
            successMessage = "Subscription resumed successfully";
            break;
        case "cancel":
            mutation = `#graphql
        mutation subscriptionContractCancel($id: ID!) {
          subscriptionContractCancel(subscriptionContractId: $id) {
            contract { id status }
            userErrors { field message }
          }
        }`;
            successMessage = "Subscription cancelled successfully";
            break;
    }

    const response = await admin.graphql(mutation, { variables: { id: fullGid } });
    const json = await response.json();

    let result;
    if (actionType === "pause") result = json?.data?.subscriptionContractPause;
    else if (actionType === "activate") result = json?.data?.subscriptionContractActivate;
    else if (actionType === "cancel") result = json?.data?.subscriptionContractCancel;

    if (result?.userErrors && result.userErrors.length > 0) {
        throw new Error(result.userErrors[0].message);
    }

    // --- Galaxy Donation logic: Update logs and send email ---
    try {
        const detailsResp = await admin.graphql(
            `#graphql
            query getSubscriptionDetails($id: ID!) {
              subscriptionContract(id: $id) {
                id
                status
                nextBillingDate
                currencyCode
                lines(first: 1) {
                  edges {
                    node {
                      title
                      variantId
                      variantImage { url }
                      currentPrice { amount }
                    }
                  }
                }
                customer { email firstName lastName }
                originOrder {
                  id
                  name
                  billingAddress { name address1 address2 city provinceCode zip country }
                  shippingAddress { name address1 address2 city provinceCode zip country }
                }
              }
            }`,
            { variables: { id: fullGid } }
        );

        const detailsJson = await detailsResp.json();
        const contract = detailsJson?.data?.subscriptionContract;

        if (contract) {
            const line = contract.lines?.edges?.[0]?.node;
            const customer = contract.customer;
            const originOrder = contract.originOrder;
            const newStatus =
                actionType === "pause"
                    ? "paused"
                    : actionType === "activate"
                        ? "active"
                        : "cancelled";


            console.log(`[SubscriptionAction] Syncing Activity. OrderID: ${originOrder?.id}, ContractID: ${fullGid}, Name: ${originOrder?.name}`);

            let log = null;
            if (originOrder?.id) {
                log = await db.recurringDonationLog.findFirst({
                    where: { orderId: originOrder.id, shop: shop },
                });
            }

            if (!log) {
                log = await db.recurringDonationLog.findFirst({
                    where: { subscriptionContractId: fullGid, shop: shop },
                });
            }

            if (!log && originOrder?.name) {
                const cleanName = originOrder.name.replace("#", "");
                log = await db.recurringDonationLog.findFirst({
                    where: {
                        shop: shop,
                        OR: [
                            { orderNumber: originOrder.name },
                            { orderNumber: cleanName },
                            { orderNumber: `#${cleanName}` }
                        ]
                    },
                });
            }

            if (log) {
                console.log(`[SubscriptionAction] Updating log ${log.id} to ${newStatus}`);
                await db.recurringDonationLog.update({
                    where: { id: log.id },
                    data: {
                        status: newStatus,
                        subscriptionContractId: fullGid,
                    },
                });
            } else {
                console.warn(`[SubscriptionAction] FAILED sync for ${originOrder?.name || fullGid}. No matching record in RecurringDonationLog.`);
            }

            const fmtAddr = (addr: any) =>
                addr
                    ? `${addr.name}\n${addr.address1}${addr.address2 ? ` ${addr.address2}` : ""}\n${addr.city}, ${addr.provinceCode || ""} ${addr.zip}\n${addr.country}`
                    : "N/A";

            const emailType =
                actionType === "pause"
                    ? "pause"
                    : actionType === "activate"
                        ? "resume"
                        : "cancellation";

            const emailResult = await sendDonationReceipt({
                email: customer?.email || log?.customerEmail || "",
                name: `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() || log?.customerName || "Customer",
                amount: `${contract?.currencyCode || "USD"} ${line?.currentPrice?.amount || "0.00"}`,
                orderNumber: originOrder?.name || log?.orderNumber || "N/A",
                type: emailType,
                shop: shop,
                frequency:
                    log?.frequency === "monthly"
                        ? "Monthly"
                        : log?.frequency === "weekly"
                            ? "Weekly"
                            : "One-time",
                nextBillingDate: contract.nextBillingDate
                    ? new Date(contract.nextBillingDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                    })
                    : "N/A",
                donationName: line?.title || "Charity Donation",
                productImage: line?.variantImage?.url,
                productTitle: line?.title,
                manageUrl: `https://${shop}/account/subscriptions`,
                shippingAddress: fmtAddr(originOrder?.shippingAddress),
                billingAddress: fmtAddr(originOrder?.billingAddress),
            });

            if (!emailResult.success) {
                console.error(`[SubscriptionAction] Email sending failed: ${emailResult.error}`);
                if (log) {
                    await db.recurringDonationLog.update({
                        where: { id: log.id },
                        data: { receiptStatus: "failed" },
                    });
                }
            } else {
                if (log) {
                    await db.recurringDonationLog.update({
                        where: { id: log.id },
                        data: { receiptStatus: "sent", receiptSentAt: new Date() },
                    });
                }
            }
        }
    } catch (galaxyErr) {
        console.error("Galaxy Donation Status Sync Error:", galaxyErr);
    }

    return { success: true, message: successMessage };
}
