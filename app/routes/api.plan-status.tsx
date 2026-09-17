/**
 * api.plan-status.tsx
 *
 * Public API endpoint: GET /api/plan-status
 *
 * Returns `{ showBranding: boolean }` for a given shop.
 * Accessed via the Shopify App Proxy so storefront Liquid blocks
 * can conditionally render Galaxy promotional branding based on
 * the merchant's plan level (Basic plan shows branding, Advanced+ hides it).
 */

import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { PLAN_FEATURES, type PlanType } from "../utils/features";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.public.appProxy(request);
    const shop = session?.shop;

    if (!shop) {
      return new Response(
        JSON.stringify({ showBranding: true }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    const planSub = await prisma.planSubscription.findUnique({
      where: { shop },
    });
    const plan = (planSub?.plan || "basic") as PlanType;
    const showBranding = PLAN_FEATURES[plan]?.showBranding ?? true;

    return new Response(
      JSON.stringify({ showBranding }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("[api.plan-status] Error:", error);
    return new Response(
      JSON.stringify({ showBranding: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
