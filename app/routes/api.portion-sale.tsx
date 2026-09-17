import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    try {
        // This is for the app proxy - use public.appProxy
        const { session } = await authenticate.public.appProxy(request);

        if (!session) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { "Content-Type": "application/json" } }
            );
        }

        const url = new URL(request.url);
        const shop = url.searchParams.get("shop") || session.shop;

        const settings = await prisma.posDonationSettings.findUnique({
            where: { shop },
        });

        if (!settings) {
            return new Response(
                JSON.stringify({
                    enabled: false,
                    donationType: "percentage",
                    donationValue: 5,
                    minimumValue: 0,
                    donationMessage: "{donationAmount} of {totalOrderValue} will be donated to charity",
                    tooltipMessage: "A portion of your purchase supports charity",
                    orderTag: "galaxy_pos_donation",
                }),
                { headers: { "Content-Type": "application/json" } }
            );
        }

        const { id, createdAt, updatedAt, shop: shopField, ...publicSettings } = settings;

        return new Response(
            JSON.stringify(publicSettings),
            { headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Error fetching POS donation settings:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
};