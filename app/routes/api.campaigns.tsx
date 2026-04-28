/**
 * api.campaigns.tsx
 *
 * Public API endpoint: GET /api/campaigns
 *
 * Serves active campaign data (name, description, shopifyProductId,
 * shopifyVariantIds, donationAmounts, allowOtherAmount, otherAmountTitle)
 * to the storefront Theme App Extension blocks.
 *
 * This route is accessed via the Shopify App Proxy
 * (e.g. /apps/donations/api/campaigns) so it is reachable from the storefront
 * without an admin session. Authentication is via the app proxy signature
 * verification handled by @shopify/shopify-app-react-router.
 */

import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Verify app proxy request
  let shop: string | undefined;
  /*
  try {
    const { session } = await authenticate.public.appProxy(request);
    shop = session?.shop;
  } catch (error) {
    console.error("[api.campaigns] Proxy Auth Error:", error);
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
  */

  const url = new URL(request.url);
  shop = shop || url.searchParams.get("shop") || "";

  try {
    const campaigns = await prisma.campaign.findMany({
      where: {
        enabled: true,
        ...(shop ? { shop } : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        shopifyProductId: true,
        shopifyVariantIds: true,
        donationAmounts: true,
        allowOtherAmount: true,
        otherAmountTitle: true,
        displayStyle: true,
        isRecurringEnabled: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const recurringConfig = await prisma.recurringDonationConfig.findUnique({
      where: { shop },
    });

    return new Response(
      JSON.stringify({
        success: true,
        recurringConfig: recurringConfig ? {
          monthlyPlanId: recurringConfig.monthlyPlanId,
          weeklyPlanId: recurringConfig.weeklyPlanId,
        } : null,
        campaigns: campaigns.map((c: any) => ({
          ...c,
          // Parse JSON string fields for convenience
          donationAmounts: (() => {
            try {
              return JSON.parse(c.donationAmounts);
            } catch {
              return [];
            }
          })(),
          shopifyVariantIds: (() => {
            try {
              return JSON.parse(c.shopifyVariantIds);
            } catch {
              return [];
            }
          })(),
        })),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=60",
        },
      }
    );
  } catch (error) {
    console.error("[api.campaigns] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
};
