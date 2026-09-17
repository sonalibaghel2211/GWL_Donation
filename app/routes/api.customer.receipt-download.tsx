import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import {
    findDonationById,
    normalizeDonationRecord,
    toOrderGid,
} from "../utils/donation-helpers.server";
import { generateReceiptPDF } from "../utils/receipt-pdf.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const url = new URL(request.url);
    const donationId = url.searchParams.get("id");
    const customerId = url.searchParams.get("logged_in_customer_id");

    if (!donationId) {
        return new Response("Missing donation ID", { status: 400 });
    }

    let admin: any;
    let session: any;

    try {
        const authResult = await authenticate.public.appProxy(request);
        admin = authResult.admin;
        session = authResult.session;
    } catch (authErr) {
        console.error("[CustomerReceiptDownload] Auth Error:", authErr);
        return new Response("Authentication failed", { status: 401 });
    }

    if (!admin) {
        return new Response("Unauthorized: Store connection not found", { status: 401 });
    }

    if (!customerId) {
        return new Response("Unauthorized: You must be logged in to download receipts", { status: 401 });
    }

    const shop = session?.shop || "";

    // Load merchant email settings for custom PDF text
    const emailSettings = await prisma.emailSettings.findUnique({ where: { shop } });

    try {
        const result = await findDonationById(donationId);


        if (!result) {
            console.warn("[CustomerReceiptDownload] Donation not found:", donationId);
            return new Response("Donation record not found", { status: 404 });
        }

        const { record, source: detectedSource } = result;
        const normalized = normalizeDonationRecord(record, detectedSource);

        const orderId = record.orderId;

        if (!orderId) {
            console.warn("[CustomerReceiptDownload] No order ID associated with donation:", donationId);
            return new Response("No order associated with this donation", { status: 400 });
        }

        const orderGid = toOrderGid(orderId);
        const customerGid = `gid://shopify/Customer/${customerId}`;
        let orderData: any = null;

        try {
            const orderResponse = await admin.graphql(
                `#graphql
                query getOrderForVerification($id: ID!) {
                    order(id: $id) {
                        name
                        email
                        currencyCode
                        customer {
                            id
                        }
                        billingAddress {
                            firstName
                            lastName
                            name
                            address1
                            address2
                            city
                            provinceCode
                            zip
                            country
                        }
                        shippingAddress {
                            name
                            address1
                            address2
                            city
                            provinceCode
                            zip
                            country
                        }
                    }
                }`,
                { variables: { id: orderGid } }
            );

            const json = await orderResponse.json();
            orderData = json.data?.order;

            if (!orderData) {
                console.warn("[CustomerReceiptDownload] Order not found in Shopify:", orderGid);
                return new Response("Order not found", { status: 404 });
            }

            // Security: Verify order belongs to the logged-in customer
            const orderCustomerId = orderData.customer?.id;
            if (orderCustomerId !== customerGid) {
                console.warn("[CustomerReceiptDownload] Customer ID mismatch!", {
                    expected: customerGid, actual: orderCustomerId, orderId: orderGid
                });
                return new Response("Access denied: This receipt does not belong to your account", { status: 403 });
            }
        } catch (gqlError) {
            console.error("[CustomerReceiptDownload] GraphQL order fetch failed:", gqlError);
            return new Response("Could not verify order ownership", { status: 500 });
        }

        const customerName = orderData.billingAddress
            ? `${orderData.billingAddress.firstName || ""} ${orderData.billingAddress.lastName || ""}`.trim()
            : "";

        let shippingAddress = "";
        if (orderData.shippingAddress) {
            const sa = orderData.shippingAddress;
            shippingAddress = [sa.name, sa.address1, sa.address2, `${sa.city}, ${sa.provinceCode || ""} ${sa.zip}`, sa.country].filter(Boolean).join("\n");
        }

        let billingAddress = "";
        if (orderData.billingAddress) {
            const ba = orderData.billingAddress;
            billingAddress = [ba.name, ba.address1, ba.address2, `${ba.city}, ${ba.provinceCode || ""} ${ba.zip}`, ba.country].filter(Boolean).join("\n");
        }

        // Generate receipt number from donation ID
        const receiptNumber = `RCP-${donationId!.substring(0, 8).toUpperCase()}`;
        const isVoided = normalized.status === "cancelled" || normalized.status === "refunded";

        const pdfBuffer = await generateReceiptPDF({
            shopName: shop.replace(".myshopify.com", ""),
            customerName: customerName || "Valued Donor",
            customerEmail: orderData.email || "",
            orderNumber: orderData.name || normalized.orderNumber,
            donationAmount: normalized.donationAmount.toFixed(2),
            donationType: normalized.donationType,
            frequency: normalized.frequency,
            campaignName: normalized.campaignName,
            createdDate: normalized.createdAt,
            shippingAddress,
            billingAddress,
            currencyCode: orderData.currencyCode || normalized.currency || "USD",
            status: normalized.status,
            receiptNumber,
            ...(isVoided ? { cancellationDate: new Date(), originalReceiptNumber: receiptNumber } : {}),
            acknowledgementText: (emailSettings as any)?.receiptAcknowledgementText || undefined,
            footerNote: (emailSettings as any)?.receiptFooterNote || undefined,
            cancelAcknowledgementText: (emailSettings as any)?.receiptCancelAcknowledgementText || undefined,
            logoUrl: emailSettings?.logoUrl || undefined,
        });

        const voidPrefix = isVoided ? "void-" : "";
        const safeOrderNumber = (orderData.name || normalized.orderNumber).replace(/[^a-zA-Z0-9]/g, "");
        const dateStr = new Date(normalized.createdAt).toISOString().split("T")[0];
        const filename = `${voidPrefix}receipt-${safeOrderNumber}-${dateStr}.pdf`;

        return new Response(pdfBuffer as any, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Length": String(pdfBuffer.length),
            },
        });

    } catch (error: any) {
        console.error("[CustomerReceiptDownload] Fatal error:", error);
        return new Response("Failed to generate receipt: " + error.message, { status: 500 });
    }
};
