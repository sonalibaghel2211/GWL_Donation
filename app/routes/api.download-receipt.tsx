import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { generateReceiptPDF } from "../utils/receipt-pdf.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const url = new URL(request.url);
    const logId = url.searchParams.get("logId");
    const donationId = url.searchParams.get("donationId");

    if (!logId && !donationId) {
        return new Response("Missing logId or donationId parameter", { status: 400 });
    }

    let admin, session;
    try {
        const auth = await authenticate.admin(request);
        admin = auth.admin;
        session = auth.session;
    } catch (authError) {
        console.warn("[DownloadReceipt] Standard auth failed, trying HTTPS wrapper...", authError);
        const secureUrl = new URL(request.url);
        secureUrl.protocol = "https:";
        const secureRequest = new Request(secureUrl.toString(), {
            headers: request.headers,
            method: request.method,
        });
        const auth = await authenticate.admin(secureRequest);
        admin = auth.admin;
        session = auth.session;
    }

    const shop = session.shop;

    // Load merchant's custom PDF receipt text settings
    const emailSettings = await prisma.emailSettings.findUnique({ where: { shop } });

    try {
        let customerName = "";

        let customerEmail = "";
        let orderNumber = "";
        let donationAmount = "0.00";
        let donationType = "Donation";
        let frequency = "One-time";
        let createdDate = new Date();
        let campaignName = "";
        let shippingAddress = "";
        let billingAddress = "";
        let currencyCode = "USD";
        let donationStatus = "active";

        if (donationId) {
            // Legacy donation record
            const donation = await prisma.donation.findUnique({
                where: { id: donationId },
                include: { campaign: true },
            });

            if (!donation) {
                return new Response("Donation not found", { status: 404 });
            }

            customerName = donation.donorName || "Generous Donor";
            customerEmail = donation.donorEmail || "";
            orderNumber = donation.orderId || "N/A";
            donationAmount = (donation.amount || 0).toFixed(2);
            donationType = "Preset";
            campaignName = donation.campaign?.name || "Donation";
            createdDate = donation.createdAt;
            donationStatus = donation.status || "active";
        } else if (logId) {
            // Check all log tables
            let log: any = null;
            let logType: 'pos' | 'recurring' | 'roundup' | 'preset' = 'pos';

            log = await prisma.posDonationLog.findUnique({ where: { id: logId } });

            if (!log) {
                log = await (prisma as any).recurringDonationLog.findUnique({ where: { id: logId } });
                if (log) logType = 'recurring';
            }

            if (!log) {
                log = await (prisma as any).roundUpDonationLog.findUnique({ where: { id: logId } });
                if (log) logType = 'roundup';
            }

            // Check preset Donation table
            let presetDonation: any = null;
            if (!log) {
                presetDonation = await prisma.donation.findUnique({
                    where: { id: logId },
                    include: { campaign: true },
                });
                if (presetDonation) logType = 'preset';
            }

            if (!log && !presetDonation) {
                return new Response("Record not found", { status: 404 });
            }

            // Get order details from Shopify
            let orderIdForQuery = presetDonation
                ? presetDonation.orderId
                : log?.orderId;

            if (orderIdForQuery && !orderIdForQuery.startsWith("gid://")) {
                orderIdForQuery = `gid://shopify/Order/${orderIdForQuery}`;
            }

            if (orderIdForQuery) {
                try {
                    const orderResponse = await admin.graphql(
                        `#graphql
                        query getOrder($id: ID!) {
                            order(id: $id) {
                                name
                                email
                                currencyCode
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
                        { variables: { id: orderIdForQuery } }
                    );
                    const orderData = await orderResponse.json();
                    const order = orderData.data?.order;

                    if (order) {
                        orderNumber = order.name || orderNumber;
                        customerEmail = order.email || "";
                        if (order.currencyCode) currencyCode = order.currencyCode;
                        customerName = order.billingAddress
                            ? `${order.billingAddress.firstName || ""} ${order.billingAddress.lastName || ""}`.trim()
                            : "";

                        if (order.shippingAddress) {
                            const sa = order.shippingAddress;
                            shippingAddress = [
                                sa.name,
                                sa.address1,
                                sa.address2,
                                `${sa.city}, ${sa.provinceCode || ""} ${sa.zip}`,
                                sa.country
                            ].filter(Boolean).join("\n");
                        }

                        if (order.billingAddress) {
                            const ba = order.billingAddress;
                            billingAddress = [
                                ba.name,
                                ba.address1,
                                ba.address2,
                                `${ba.city}, ${ba.provinceCode || ""} ${ba.zip}`,
                                ba.country
                            ].filter(Boolean).join("\n");
                        }
                    }
                } catch (orderError) {
                    console.warn("[DownloadReceipt] Could not fetch order details:", orderError);
                }
            }

            if (presetDonation) {
                donationAmount = (presetDonation.amount || 0).toFixed(2);
                donationType = "Preset";
                campaignName = presetDonation.campaign?.name || "Preset Donation";
                createdDate = presetDonation.createdAt;
                orderNumber = presetDonation.orderNumber || orderNumber || "N/A";
                if (presetDonation.currency) currencyCode = presetDonation.currency;
            } else if (log) {
                donationAmount = (log.donationAmount || 0).toFixed(2);
                createdDate = log.createdAt;
                orderNumber = log.orderNumber || orderNumber || "N/A";
                donationStatus = log.status || "active";
                if (log.currency) currencyCode = log.currency;

                if (logType === 'recurring') {
                    frequency = log.frequency === "weekly" ? "Weekly" : log.frequency === "monthly" ? "Monthly" : "One-time";
                    donationType = frequency !== "One-time" ? `Recurring (${frequency})` : "One-time";
                } else if (logType === 'roundup') {
                    donationType = "Round Up";
                } else {
                    donationType = "POS";
                }
            }
        }

        // Generate receipt number from the record ID
        const recordId = donationId || logId || "";
        const receiptNumber = `RCP-${recordId.substring(0, 8).toUpperCase()}`;

        // Generate PDF using the shared receipt generator
        const isVoided = donationStatus === "cancelled" || donationStatus === "refunded";

        const pdfBuffer = await generateReceiptPDF({
            shopName: shop.replace(".myshopify.com", ""),
            customerName: customerName || "Valued Donor",
            customerEmail,
            orderNumber,
            donationAmount,
            donationType,
            frequency,
            campaignName,
            createdDate,
            shippingAddress,
            billingAddress,
            currencyCode,
            status: donationStatus,
            receiptNumber,
            ...(isVoided ? { cancellationDate: new Date(), originalReceiptNumber: receiptNumber } : {}),
            acknowledgementText: (emailSettings as any)?.receiptAcknowledgementText || undefined,
            footerNote: (emailSettings as any)?.receiptFooterNote || undefined,
            cancelAcknowledgementText: (emailSettings as any)?.receiptCancelAcknowledgementText || undefined,
            logoUrl: emailSettings?.logoUrl || undefined,
        });

        const voidPrefix = isVoided ? "void-" : "";
        const filename = `${voidPrefix}receipt-${orderNumber.replace(/[^a-zA-Z0-9]/g, "")}-${new Date(createdDate).toISOString().split("T")[0]}.pdf`;

        return new Response(pdfBuffer as any, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Length": String(pdfBuffer.length),
            },
        });

    } catch (error: any) {
        console.error("[DownloadReceipt] Fatal error:", error);
        return new Response("Failed to generate receipt: " + error.message, { status: 500 });
    }
};
