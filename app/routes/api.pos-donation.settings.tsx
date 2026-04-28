import type { LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";
import { checkFeatureAccess } from "../utils/features";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    try {
        const url = new URL(request.url);
        const shop = url.searchParams.get("shop");

        if (!shop) {
            return new Response(
                JSON.stringify({ error: "Shop parameter required" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                }
            );
        }

        // Optional: API key validation for security
        const apiKey = url.searchParams.get("api_key");
        const validApiKey = process.env.POS_DONATION_API_KEY;

        if (validApiKey && apiKey !== validApiKey) {
            return new Response(
                JSON.stringify({ error: "Invalid API key" }),
                {
                    status: 401,
                    headers: { "Content-Type": "application/json" }
                }
            );
        }

        const settings = await prisma.posDonationSettings.findUnique({
            where: { shop },
        });

        const subscription = await prisma.planSubscription.findUnique({
            where: { shop },
        });
        const plan = subscription?.plan || "basic";

        let finalSettings = settings ? { ...settings } : {
            enabled: false,
            donationType: "fixed",
            donationBasis: "order",
            donationValue: 5,
            minimumValue: 0,
            donationMessage: "{donationAmount} of {totalOrderValue} will be donated to charity",
            tooltipMessage: "A portion of your purchase supports charity",
            orderTag: "galaxy_pos_donation",
        };

        // Enforce plan restrictions: Basic plan cannot use percentage donation
        if (finalSettings.donationType === "percentage" && !checkFeatureAccess(plan, "canUsePercentageDonation")) {
            finalSettings.donationType = "fixed";
            console.log(`[API] Forcing donationType to fixed for ${shop} (Basic Plan)`);
        }

        // Return only public settings (exclude internal fields)
        const publicSettings = {
            enabled: finalSettings.enabled,
            donationType: finalSettings.donationType,
            donationBasis: (finalSettings as any).donationBasis || "order",
            donationValue: finalSettings.donationValue,
            minimumValue: finalSettings.minimumValue,
            donationMessage: finalSettings.donationMessage,
            tooltipMessage: finalSettings.tooltipMessage,
            orderTag: finalSettings.orderTag,
        };

        return new Response(
            JSON.stringify(publicSettings),
            { headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Error fetching POS donation settings:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        );
    }
};