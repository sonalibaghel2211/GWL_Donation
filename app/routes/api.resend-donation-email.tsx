import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import nodemailer from "nodemailer";
import { sendDonationReceipt } from "../utils/sendgrid.server";
import sgMail from "@sendgrid/mail";

export const action = async ({ request }: ActionFunctionArgs) => {
    const formData = await request.formData();
    const donationId = formData.get("donationId") as string;
    const logId = formData.get("logId") as string;

    let admin, session;
    try {
        const auth = await authenticate.admin(request);
        admin = auth.admin;
        session = auth.session;
    } catch (authError) {
        console.warn("[ResendAPI] Standard auth failed, trying HTTPS wrapper...", authError);
        const url = new URL(request.url);
        url.protocol = "https:";
        const secureRequest = new Request(url.toString(), {
            headers: request.headers,
            method: request.method,
        });
        const auth = await authenticate.admin(secureRequest);
        admin = auth.admin;
        session = auth.session;
    }

    const shop = session.shop;

    try {
        if (donationId) {
            // Handle legacy campaign receipt
            const donation = await prisma.donation.findUnique({
                where: { id: donationId },
                include: {
                    campaign: true,
                },
            });

            if (!donation) {
                return data({ success: false, error: "Legacy donation record not found" }, { status: 404 });
            }

            if (!donation.donorEmail) {
                return data({ success: false, error: "Donation does not have an attached email" }, { status: 400 });
            }

            const emailSettings = await prisma.emailSettings.findUnique({
                where: { shop: donation.campaign.shop },
            });

            const defaultTemplateString = emailSettings?.receiptBody || `
          <h3>Donation Receipt</h3>
          <table border="1" style="border-collapse: collapse; width: 100%; max-width: 400px; text-align: left; font-size: 14px;">
            <tbody>
              <tr><th style="padding: 8px; border: 1px solid #ddd;">First Name:</th><td style="padding: 8px; border: 1px solid #ddd;">{{first_name}}</td></tr>
              <tr><th style="padding: 8px; border: 1px solid #ddd;">Last Name:</th><td style="padding: 8px; border: 1px solid #ddd;">{{last_name}}</td></tr>
              <tr><th style="padding: 8px; border: 1px solid #ddd;">Email:</th><td style="padding: 8px; border: 1px solid #ddd;">{{email}}</td></tr>
              <tr><th style="padding: 8px; border: 1px solid #ddd;">Date:</th><td style="padding: 8px; border: 1px solid #ddd;">{{date}}</td></tr>
              <tr><th style="padding: 8px; border: 1px solid #ddd;">Order Number:</th><td style="padding: 8px; border: 1px solid #ddd;">{{order_number}}</td></tr>
              <tr><th style="padding: 8px; border: 1px solid #ddd;">Donation Name:</th><td style="padding: 8px; border: 1px solid #ddd;">{{donation_name}}</td></tr>
              <tr><th style="padding: 8px; border: 1px solid #ddd;">Donate Price:</th><td style="padding: 8px; border: 1px solid #ddd;">{{price}}</td></tr>
              <tr><th style="padding: 8px; border: 1px solid #ddd;">Currency:</th><td style="padding: 8px; border: 1px solid #ddd;">{{currency}}</td></tr>
            </tbody>
          </table>
          <h3 style="margin-top: 16px;">Thanks For Donating!</h3>
        `;

            const donorNameParts = (donation.donorName || "").split(" ");
            const firstName = donorNameParts[0] || "Generous";
            const lastName = donorNameParts.slice(1).join(" ") || "Donor";

            const compiledTemplate = defaultTemplateString
                .replace(/{{first_name}}/g, firstName)
                .replace(/{{last_name}}/g, lastName)
                .replace(/{{email}}/g, donation.donorEmail)
                .replace(/{{date}}/g, donation.createdAt.toISOString().split("T")[0])
                .replace(/{{order_number}}/g, donation.orderId || "N/A")
                .replace(/{{donation_name}}/g, donation.campaign.name)
                .replace(/{{price}}/g, donation.amount.toString())
                .replace(/{{currency}}/g, donation.currency || "USD");

            let transporter;
            if (process.env.SMTP_HOST && process.env.SMTP_USER) {
                transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: Number(process.env.SMTP_PORT) || 587,
                    secure: process.env.SMTP_PORT === "465",
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    },
                });
            } else if (!process.env.SENDGRID_API_KEY) {
                console.error("[ResendAPI] No SMTP details or SENDGRID_API_KEY found in .env. Cannot send email.");
                return data({ success: false, error: "Email settings not configured on server" }, { status: 400 });
            }

            try {
                const emailSubject = emailSettings?.receiptSubject || "Donation Receipt";
                const verifiedFromEmail = (process.env.SMTP_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || "donations@yourstore.com").trim();

                if (transporter) {
                    const info = await transporter.sendMail({
                        from: verifiedFromEmail,
                        to: donation.donorEmail,
                        subject: emailSubject,
                        html: compiledTemplate,
                    });
                    console.log("Email sent successfully! Message ID: %s", info.messageId);
                } else {
                    sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");
                    await sgMail.send({
                        from: verifiedFromEmail,
                        to: donation.donorEmail,
                        subject: emailSubject,
                        html: compiledTemplate,
                    });
                    console.log("Email sent successfully via SendGrid API!");
                }
                return data({ success: true, message: "Email sent successfully" });
            } catch (emailError: any) {
                console.error("[ResendAPI] Failed to send email via SMTP. Detailed error information:");
                console.error("- Error Message:", emailError?.message || "No error message");
                console.error("- Error Stack:", emailError?.stack || "No stack trace");
                console.error("- Error Code:", emailError?.code || "No error code");
                console.error("- SMTP Command:", emailError?.command || "No command");
                console.error("- SMTP Response:", emailError?.response || "No response");
                console.error("- SMTP Response Code:", emailError?.responseCode || "No response code");
                console.error("- Raw Error Object:");
                console.dir(emailError, { depth: null });
                return data({ success: false, error: "SMTP Error: " + emailError.message }, { status: 500 });
            }
        } else if (logId) {
            // Handle POS, Recurring, Roundup, or Preset receipt
            let log = await prisma.posDonationLog.findUnique({ where: { id: logId } });
            let logType: 'pos' | 'recurring' | 'roundup' | 'preset' = 'pos';

            if (!log) {
                log = await (prisma as any).recurringDonationLog.findUnique({ where: { id: logId } });
                if (log) logType = 'recurring';
            }

            if (!log) {
                log = await (prisma as any).roundUpDonationLog.findUnique({ where: { id: logId } });
                if (log) logType = 'roundup';
            }

            // Check preset donation (different schema)
            let presetDonation: any = null;
            if (!log) {
                presetDonation = await prisma.donation.findUnique({
                    where: { id: logId },
                    include: { campaign: true },
                });
                if (presetDonation) logType = 'preset';
            }

            if (!log && !presetDonation) {
                console.warn("[ResendAPI] Log not found for ID:", logId);
                return data({ success: false, error: "Log record not found" }, { status: 404 });
            }

            let orderIdForQuery = presetDonation
                ? presetDonation.orderId
                : (log as any).orderId;

            if (!orderIdForQuery) {
                console.warn("[ResendAPI] Order ID missing in DB record. logType:", logType);
                return data({ success: false, error: "No order associated with this donation record" }, { status: 400 });
            }

            if (!orderIdForQuery.startsWith("gid://")) {
                orderIdForQuery = `gid://shopify/Order/${orderIdForQuery}`;
            }

            const orderResponse = await admin.graphql(
                `#graphql
          query getOrder($id: ID!) {
            order(id: $id) {
              name
              email
              currencyCode
              shippingAddress {
                name address1 address2 city provinceCode zip country
              }
              billingAddress {
                name address1 address2 city provinceCode zip country
                firstName
                lastName
              }
            }
          }`,
                { variables: { id: orderIdForQuery } }
            );
            const orderData = await orderResponse.json();
            const order = orderData.data?.order;

            if (!order || !order.email) {
                console.error("[ResendAPI] Order fetch failed or missing email:", JSON.stringify(orderData));
                return data({ success: false, error: "Could not find Shopify order or recipient email" }, { status: 404 });
            }

            const customerName = order.billingAddress ? `${order.billingAddress.firstName || ""} ${order.billingAddress.lastName || ""}`.trim() : "";

            const shippingAddr = order.shippingAddress
                ? `${order.shippingAddress.name}\n${order.shippingAddress.address1}${order.shippingAddress.address2 ? ` ${order.shippingAddress.address2}` : ""}\n${order.shippingAddress.city}, ${order.shippingAddress.provinceCode || ""} ${order.shippingAddress.zip}\n${order.shippingAddress.country}`
                : "";
            const billingAddr = order.billingAddress
                ? `${order.billingAddress.name}\n${order.billingAddress.address1}${order.billingAddress.address2 ? ` ${order.billingAddress.address2}` : ""}\n${order.billingAddress.city}, ${order.billingAddress.provinceCode || ""} ${order.billingAddress.zip}\n${order.billingAddress.country}`
                : "";

            let freqLabel = "One-time";
            if (logType === 'recurring' && log) {
                freqLabel = (log as any).frequency === "weekly" ? "Weekly" : (log as any).frequency === "monthly" ? "Monthly" : "One-time";
            }

            const config = await (prisma as any).recurringDonationConfig.findUnique({ where: { shop } });
            const donationProductId = config?.productId || "9946640679159";

            let productTitleForEmail = "Donation";
            if (presetDonation) {
                productTitleForEmail = presetDonation.campaign?.name || "Preset Donation";
            } else {
                const detailResponse = await admin.graphql(
                    `#graphql
              query getOrderDetail($id: ID!) {
                order(id: $id) {
                  lineItems(first: 20) {
                    edges {
                      node {
                        title
                        customAttributes { key value }
                        variant {
                            product {
                                id
                            }
                        }
                      }
                    }
                  }
                }
              }`,
                    { variables: { id: orderIdForQuery } }
                );
                const detailData = await detailResponse.json();
                const lineItems = detailData.data?.order?.lineItems?.edges?.map((e: any) => e.node) || [];
                const matchedLi = lineItems.find((li: any) => {
                    const productGid = li.variant?.product?.id || "";
                    return productGid.endsWith(`/${donationProductId}`);
                });
                if (matchedLi) productTitleForEmail = matchedLi.title;
            }

            let nextBillingDate = "";
            const createdDate = new Date(presetDonation ? presetDonation.createdAt : (log as any).createdAt);
            const frequencyFromLog = presetDonation ? "one_time" : (log as any).frequency;

            if (frequencyFromLog === "weekly") {
                createdDate.setDate(createdDate.getDate() + 7);
                nextBillingDate = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            } else if (frequencyFromLog === "monthly") {
                createdDate.setDate(createdDate.getDate() + 30);
                nextBillingDate = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }

            const donationAmount = presetDonation
                ? (presetDonation.amount || 0).toFixed(2)
                : ((log as any).donationAmount || 0).toFixed(2);

            const res = await sendDonationReceipt({
                email: order.email,
                name: customerName,
                amount: donationAmount,
                orderNumber: order.name,
                shop,
                donationName: presetDonation ? presetDonation.campaign?.name : productTitleForEmail,
                frequency: freqLabel,
                shippingAddress: shippingAddr,
                billingAddress: billingAddr,
                productTitle: productTitleForEmail,
                manageUrl: freqLabel !== "One-time" ? `https://${shop}/account/subscriptions` : undefined,
                nextBillingDate: nextBillingDate,
                currency: order.currencyCode || (log as any)?.currency || "USD"
            });

            if (res.success) {
                if (logType === 'pos' && log) {
                    await prisma.posDonationLog.update({
                        where: { id: logId },
                        data: { receiptStatus: "sent", receiptSentAt: new Date(), isResent: true } as any
                    });
                } else if (logType === 'recurring' && log) {
                    await (prisma as any).recurringDonationLog.update({
                        where: { id: logId },
                        data: { receiptStatus: "sent", receiptSentAt: new Date(), isResent: true } as any
                    });
                } else if (logType === 'roundup' && log) {
                    await (prisma as any).roundUpDonationLog.update({
                        where: { id: logId },
                        data: { receiptStatus: "sent", receiptSentAt: new Date(), isResent: true } as any
                    });
                } else if (logType === 'preset' && presetDonation) {
                    await prisma.donation.update({
                        where: { id: logId },
                        data: { receiptStatus: "sent", isResent: true }
                    });
                }
                return data({ success: true });
            } else {
                console.error("[ResendAPI] SendGrid Error:", res.error);
                return data({ success: false, error: "Email Service Error: " + res.error }, { status: 500 });
            }
        } else {
            return data({ success: false, error: "No valid donation or log ID provided" }, { status: 400 });
        }
    } catch (globalError: any) {
        console.error("[ResendAPI] Fatal Action Error:", globalError);
        return data({ success: false, error: "Internal Server Error: " + globalError.message }, { status: 500 });
    }
};
