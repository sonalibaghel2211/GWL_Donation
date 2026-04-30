/**
 * api.pos-donation.custom-cart.tsx
 *
 * App proxy route: POST /apps/pos-donation/api/custom-donation-cart
 *
 * Handles custom-amount donations by creating a Shopify Draft Order with an
 * explicit price override on the donation variant. Returns a checkoutUrl so
 * the storefront JS can redirect the customer directly to checkout.
 *
 * Why Draft Orders?
 *   Shopify's storefront AJAX Cart API does NOT allow overriding line item
 *   prices. Draft Order + invoice URL is the only supported mechanism for a
 *   server-authorised price override while still completing via the standard
 *   Shopify checkout flow.
 */

import type { ActionFunctionArgs } from "react-router";
import { authenticate, unauthenticated } from "../shopify.server";
import prisma from "../db.server";

// ── GET (proxy discovery) ────────────────────────────────────────────────────
export const loader = async () =>
    jsonResp({ success: false, error: "Use POST" }, 405);

// ── POST ─────────────────────────────────────────────────────────────────────
export const action = async ({ request }: ActionFunctionArgs) => {
    if (request.method !== "POST") {
        return jsonResp({ success: false, error: "Method not allowed" }, 405);
    }

    // ── 1. Verify app proxy signature and resolve shop ────────────────────────
    let shop: string;
    try {
        const auth = await authenticate.public.appProxy(request);
        shop = auth.session?.shop || "";
        if (!shop) throw new Error("Missing shop");
    } catch (err) {
        return jsonResp({ success: false, error: "Unauthorized" }, 401);
    }

    // ── 2. Get admin client via unauthenticated (uses stored offline token) ───
    let admin: any;
    try {
        const result = await unauthenticated.admin(shop);
        admin = result.admin;
    } catch (err: any) {
        console.error("[custom-cart] Failed to get admin client:", err);
        return jsonResp(
            { success: false, error: "Could not initialise admin client" },
            500
        );
    }

    // ── 3. Parse POST body ────────────────────────────────────────────────────
    let body: Record<string, string> = {};
    try {
        const contentType = request.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            body = await request.json();
        } else {
            const fd = await request.formData();
            fd.forEach((v, k) => {
                body[k] = String(v);
            });
        }
    } catch {
        return jsonResp({ success: false, error: "Invalid request body" }, 400);
    }

    const { campaignId, customAmount, variantId } = body;

    if (!campaignId || !customAmount) {
        return jsonResp(
            { success: false, error: "Missing campaignId or customAmount" },
            400
        );
    }

    const parsedAmount = parseFloat(customAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return jsonResp({ success: false, error: "Invalid customAmount" }, 400);
    }

    // ── 4. Look up campaign ────────────────────────────────────────────────────
    let campaign: any;
    try {
        campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    } catch (err) {
        console.error("[custom-cart] DB error:", err);
        return jsonResp({ success: false, error: "Campaign lookup failed" }, 500);
    }

    if (!campaign) {
        return jsonResp({ success: false, error: "Campaign not found" }, 404);
    }
    if (campaign.shop !== shop) {
        // Return the same 404 to avoid leaking information about other stores' campaigns
        return jsonResp({ success: false, error: "Campaign not found" }, 404);
    }

    // ── 5. Resolve variant GID ────────────────────────────────────────────────
    let resolvedVariantId: string | null = variantId || null;
    if (!resolvedVariantId) {
        try {
            const vids: string[] = JSON.parse(campaign.shopifyVariantIds || "[]");
            resolvedVariantId = vids[0] || null;
        } catch {
            resolvedVariantId = null;
        }
    }

    if (!resolvedVariantId) {
        return jsonResp(
            { success: false, error: "No variant found for campaign" },
            422
        );
    }

    // Convert to GID format if numeric
    const variantGid = resolvedVariantId.includes("gid://")
        ? resolvedVariantId
        : `gid://shopify/ProductVariant/${resolvedVariantId}`;

    const priceOverride = parsedAmount.toFixed(2);

    // ── 6. Create Draft Order with price override ─────────────────────────────
    try {
        const response = await admin.graphql(
            `#graphql
      mutation draftOrderCreate($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            id
            invoiceUrl
            status
          }
          userErrors {
            field
            message
          }
        }
      }`,
            {
                variables: {
                    input: {
                        lineItems: [
                            {
                                variantId: variantGid,
                                quantity: 1,
                                originalUnitPrice: priceOverride,
                            },
                        ],
                        tags: ["preset_donation"],
                        note: `Preset donation – Custom amount: $${priceOverride}`,
                        customAttributes: [
                            { key: "Donation Campaign", value: campaign.name },
                            { key: "Donation Amount", value: `$${priceOverride}` },
                            { key: "Custom Amount", value: "true" },
                            { key: "_donation_widget_active", value: "true" },
                        ],
                    },
                },
            }
        );

        const json = await response.json();
        const userErrors = json?.data?.draftOrderCreate?.userErrors || [];

        if (userErrors.length > 0) {
            console.error("[custom-cart] draftOrderCreate userErrors:", userErrors);
            return jsonResp({ success: false, error: userErrors[0].message }, 422);
        }

        const draftOrder = json?.data?.draftOrderCreate?.draftOrder;
        if (!draftOrder?.invoiceUrl) {
            return jsonResp(
                {
                    success: false,
                    error: "Draft order created but no invoiceUrl returned",
                },
                500
            );
        }

        console.log(
            `[custom-cart] Draft order created: ${draftOrder.id}, invoiceUrl: ${draftOrder.invoiceUrl}`
        );

        return jsonResp({ success: true, checkoutUrl: draftOrder.invoiceUrl });
    } catch (err: any) {
        console.error("[custom-cart] draftOrderCreate error:", err);
        return jsonResp({ success: false, error: String(err.message || err) }, 500);
    }
};

function jsonResp(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
    });
}
