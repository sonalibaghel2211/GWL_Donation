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
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let productBlockEnabled: boolean | undefined;
  let cartBlockEnabled: boolean | undefined;

  const contentType = request.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    const body = await request.json();
    productBlockEnabled = typeof body.productBlockEnabled === "boolean" ? body.productBlockEnabled : undefined;
    cartBlockEnabled = typeof body.cartBlockEnabled === "boolean" ? body.cartBlockEnabled : undefined;
  } else {
    const formData = await request.formData();
    const pVal = formData.get("productBlockEnabled");
    const cVal = formData.get("cartBlockEnabled");
    if (pVal !== null) productBlockEnabled = pVal === "true";
    if (cVal !== null) cartBlockEnabled = cVal === "true";
  }

  // Fallback to existing if not provided
  const existing = await prisma.blockConfig.findUnique({ where: { shop } });
  
  const finalProductEnabled = productBlockEnabled ?? existing?.productBlockEnabled ?? true;
  const finalCartEnabled = cartBlockEnabled ?? existing?.cartBlockEnabled ?? true;

  try {
    const config = await prisma.blockConfig.upsert({
      where: { shop },
      create: { shop, productBlockEnabled: finalProductEnabled, cartBlockEnabled: finalCartEnabled },
      update: { productBlockEnabled: finalProductEnabled, cartBlockEnabled: finalCartEnabled },
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
