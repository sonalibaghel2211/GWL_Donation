/**
 * api.block-config.tsx
 *
 * Authenticated admin API for block configuration:
 *   GET  /api/block-config  → returns BlockConfig for current shop
 *   POST /api/block-config  → upserts BlockConfig for current shop
 *
 * Called from the Configuration tab in the Preset Donation page.
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { data } from "react-router";

/* ─── GET: Fetch block config ────────────────────────────────────────────── */

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const config = await prisma.blockConfig.findUnique({
    where: { shop },
  });

  return data({
    success: true,
    config: config ?? {
      shop,
      productBlockEnabled: true,
      cartBlockEnabled: true,
    },
  });
};

/* ─── POST: Save block config ────────────────────────────────────────────── */

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return data({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return data({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const productBlockEnabled =
    typeof body.productBlockEnabled === "boolean"
      ? body.productBlockEnabled
      : true;
  const cartBlockEnabled =
    typeof body.cartBlockEnabled === "boolean" ? body.cartBlockEnabled : true;

  try {
    const config = await prisma.blockConfig.upsert({
      where: { shop },
      create: { shop, productBlockEnabled, cartBlockEnabled },
      update: { productBlockEnabled, cartBlockEnabled },
    });

    return data({ success: true, config });
  } catch (error) {
    console.error("[api.block-config] Error:", error);
    return data(
      { success: false, error: "Failed to save configuration" },
      { status: 500 }
    );
  }
};
