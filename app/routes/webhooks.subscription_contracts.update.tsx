import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// Map Shopify subscription contract statuses to our status
function mapStatus(shopifyStatus: string): string {
    switch (shopifyStatus?.toUpperCase()) {
        case "ACTIVE":
            return "active";
        case "PAUSED":
            return "paused";
        case "CANCELLED":
        case "FAILED":
        case "EXPIRED":
            return "cancelled";
        default:
            return "active";
    }
}

export const action = async ({ request }: ActionFunctionArgs) => {
    const { shop, topic, payload } = await authenticate.webhook(request);


    if (topic !== "SUBSCRIPTION_CONTRACTS_UPDATE") {
        console.warn(`[SubscriptionContract] Unexpected topic: ${topic}`);
        return new Response(null, { status: 400 });
    }

    try {
        const contract = payload as any;
        const contractId: string = contract.admin_graphql_api_id || `gid://shopify/SubscriptionContract/${contract.id}`;
        const newStatus = mapStatus(contract.status);


        const originOrderId = contract.origin_order?.admin_graphql_api_id || contract.originOrder?.id;
        const originOrderNumber = contract.origin_order?.name || contract.originOrder?.name;


        // Update posDonationLog
        const posResult = await db.posDonationLog.updateMany({
            where: {
                shop,
                OR: [
                    { orderId: originOrderId || undefined },
                    { orderNumber: originOrderNumber || undefined }
                ]
            },
            data: { status: newStatus },
        });

        // Update recurringDonationLog
        const recResult = await db.recurringDonationLog.updateMany({
            where: {
                shop,
                OR: [
                    { subscriptionContractId: contractId },
                    { orderId: originOrderId || undefined },
                    { orderNumber: originOrderNumber || undefined }
                ]
            },
            data: { status: newStatus },
        });

        // Update subscription
        const subResult = await db.subscription.updateMany({
            where: { shop, orderId: originOrderNumber || undefined },
            data: { status: newStatus },
        });

    } catch (err) {
        console.error("[SubscriptionContract] Update webhook error:", err);
    }

    return new Response("OK", { status: 200 });
};
