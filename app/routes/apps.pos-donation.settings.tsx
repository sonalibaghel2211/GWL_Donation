import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { checkFeatureAccess } from "../utils/features";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    try {
        // Use public.appProxy for storefront access
        const { session } = await authenticate.public.appProxy(request);

        if (!session) {
            return data({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const shop = url.searchParams.get("shop");

        if (!shop) {
            return data({ error: "Shop parameter required" }, { status: 400 });
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
            console.log(`[Proxy] Forcing donationType to fixed for ${shop} (Basic Plan)`);
        }

        return finalSettings;
    } catch (error) {
        console.error("Error fetching POS donation settings:", error);
        return data({ error: "Internal server error" }, { status: 500 });
    }
};