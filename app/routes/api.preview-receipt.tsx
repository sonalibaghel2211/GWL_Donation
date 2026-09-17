/**
 * api.preview-receipt.tsx
 *
 * Admin-authenticated endpoint that generates a SAMPLE receipt PDF using the
 * merchant's current email settings (acknowledgement text, footer note, cancel text)
 * and returns it as an inline PDF so it can be opened in a new browser tab.
 *
 * Query params:
 *   type  – "donation" (default) | "cancel"   — which receipt template to preview
 */
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { generateReceiptPDF } from "../utils/receipt-pdf.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    let session: any;
    let admin: any;

    try {
        const auth = await authenticate.admin(request);
        session = auth.session;
        admin = auth.admin;
    } catch {
        try {
            const secureUrl = new URL(request.url);
            secureUrl.protocol = "https:";
            const secureRequest = new Request(secureUrl.toString(), {
                headers: request.headers,
                method: request.method,
            });
            const auth = await authenticate.admin(secureRequest);
            session = auth.session;
            admin = auth.admin;
        } catch (err) {
            return new Response("Unauthorized", { status: 401 });
        }
    }

    const url = new URL(request.url);
    const type = url.searchParams.get("type") ?? "donation";
    const isCancel = type === "cancel";

    const shop = session.shop;
    const shopDisplayName = shop.replace(".myshopify.com", "");

    // Fetch merchant email settings
    const emailSettings = await prisma.emailSettings.findUnique({
        where: { shop },
    });

    let storeCurrency = "USD";
    if (admin) {
        try {
            const shopRes = await admin.graphql(`#graphql query { shop { currencyCode } }`);
            const shopJson = await shopRes.json();
            if (shopJson.data?.shop?.currencyCode) {
                storeCurrency = shopJson.data.shop.currencyCode;
            }
        } catch (e) {
            console.warn("[PreviewReceipt] Failed to fetch shop currency:", e);
        }
    }

    // ─── Sample data for preview ──────────────────────────────────────────────
    const sampleData = {
        shopName: shopDisplayName,
        customerName: "Jane Doe",
        customerEmail: "jane.doe@example.com",
        orderNumber: "#1042",
        donationAmount: "25.00",
        donationType: isCancel ? "Recurring (Monthly)" : "Preset Donation",
        frequency: isCancel ? "Monthly" : "One-time",
        campaignName: "Children's Education Fund",
        createdDate: new Date(),
        shippingAddress: "Jane Doe\n123 Main Street\nNew York, NY 10001\nUnited States",
        billingAddress: "Jane Doe\n123 Main Street\nNew York, NY 10001\nUnited States",
        currencyCode: storeCurrency,
        status: isCancel ? "cancelled" : "active",
        receiptNumber: "RCP-PREVIEW",
        ...(isCancel ? {
            cancellationDate: new Date(),
            originalReceiptNumber: "RCP-ORIGINAL",
        } : {}),
        acknowledgementText: (emailSettings as any)?.receiptAcknowledgementText || undefined,
        footerNote: (emailSettings as any)?.receiptFooterNote || undefined,
        cancelAcknowledgementText: (emailSettings as any)?.receiptCancelAcknowledgementText || undefined,
        logoUrl: emailSettings?.logoUrl || undefined,
    };

    try {
        const pdfBuffer = await generateReceiptPDF(sampleData);

        return new Response(pdfBuffer as any, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="receipt-preview-${type}.pdf"`,
                "Content-Length": String(pdfBuffer.length),
                "Cache-Control": "no-store",
            },
        });
    } catch (error: any) {
        console.error("[PreviewReceipt] Fatal error:", error);
        return new Response("Failed to generate preview: " + error.message, { status: 500 });
    }
};
