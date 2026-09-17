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
import { PLAN_FEATURES, type PlanType } from "../utils/features";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Verify app proxy request
  let shop: string | undefined;
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

  if (!shop) {
    const url = new URL(request.url);
    shop = url.searchParams.get("shop") || "";
  }

  try {
    const appSettings = await prisma.appSettings.findUnique({
      where: { shop },
    });

    if (appSettings && !appSettings.enabled) {
      return new Response(
        JSON.stringify({
          success: true,
          disabled: true,
          campaigns: [],
          recurringConfig: null,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

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

    const [recurringConfig, planSubscription] = await Promise.all([
      prisma.recurringDonationConfig.findUnique({ where: { shop } }),
      prisma.planSubscription.findUnique({ where: { shop } }),
    ]);

    const plan = (planSubscription?.plan || "basic") as PlanType;
    const showBranding = PLAN_FEATURES[plan]?.showBranding ?? true;

    return new Response(
      JSON.stringify({
        success: true,
        showBranding,
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
          "Cache-Control": "no-store, no-cache, must-revalidate",
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
