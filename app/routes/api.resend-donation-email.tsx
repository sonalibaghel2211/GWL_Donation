import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import nodemailer from "nodemailer";
import { sendDonationReceipt } from "../utils/sendgrid.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const url = new URL(request.url);
    if (url.protocol === "http:" && !url.hostname.includes("localhost")) {
        url.protocol = "https:";
    }
    const secureRequest = new Request(url.toString(), request);

    const { admin, session } = await authenticate.admin(secureRequest);
    const shop = session.shop;

    if (request.method !== "POST") {
        return data({ success: false, error: "Method not allowed" }, { status: 405 });
    }

    const formData = await request.formData();
    const donationId = formData.get("donationId") as string;
    const logId = formData.get("logId") as string;

    if (donationId) {
        // Handle HEAD logic (legacy donation receipt)
        const donation = await prisma.donation.findUnique({
            where: { id: donationId },
            include: {
                campaign: true,
            },
        });

        if (!donation) {
            return data({ success: false, error: "Donation record not found" }, { status: 404 });
        }

        if (!donation.donorEmail) {
            return data({ success: false, error: "Donation does not have an attached email" }, { status: 400 });
        }

        // Fetch custom EmailSettings
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
            .replace(/{{currency}}/g, "USD");

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
        } else {
            console.log("No SMTP details found in .env, falling back to dynamic Ethereal test account...");
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
        }

        try {
            const emailSubject = emailSettings?.receiptSubject || "Donation Receipt";

            const info = await transporter.sendMail({
                from: process.env.SMTP_FROM_EMAIL || '"Donations App" <no-reply@donations.app>',
                to: donation.donorEmail,
                subject: emailSubject,
                html: compiledTemplate,
            });

            console.log("Email sent successfully! Message ID: %s", info.messageId);
            return data({ success: true, message: "Email sent successfully" });
        } catch (emailError: any) {
            console.error("Failed to send email via SMTP:", emailError);
            return data({ success: false, error: emailError.message || "Email failed to send. Please try again." }, { status: 500 });
        }
    } else if (logId) {
        // Handle Staging logic (POS / Recurring donation receipt)
        let log = await prisma.posDonationLog.findUnique({ where: { id: logId } });
        let logType: 'pos' | 'recurring' = 'pos';

        if (!log) {
            log = await (prisma as any).recurringDonationLog.findUnique({ where: { id: logId } });
            logType = 'recurring';
        }

        if (!log) {
            return data({ success: false, error: "Log not found" }, { status: 404 });
        }

        const orderResponse = await admin.graphql(
            `#graphql
      query getOrder($id: ID!) {
        order(id: $id) {
          name
          email
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
            { variables: { id: log.orderId } }
        );
        const orderData = await orderResponse.json();
        const order = orderData.data?.order;

        if (!order || !order.email) {
            if (logType === 'pos') {
                await prisma.posDonationLog.update({
                    where: { id: logId },
                    data: { receiptStatus: "failed" }
                });
            }
            return data({ success: false, error: "Order or customer email not found" }, { status: 400 });
        }

        const customerName = order.billingAddress ? `${order.billingAddress.firstName || ""} ${order.billingAddress.lastName || ""}`.trim() : "";

        const shippingAddr = order.shippingAddress
            ? `${order.shippingAddress.name}\n${order.shippingAddress.address1}${order.shippingAddress.address2 ? ` ${order.shippingAddress.address2}` : ""}\n${order.shippingAddress.city}, ${order.shippingAddress.provinceCode || ""} ${order.shippingAddress.zip}\n${order.shippingAddress.country}`
            : "";
        const billingAddr = order.billingAddress
            ? `${order.billingAddress.name}\n${order.billingAddress.address1}${order.billingAddress.address2 ? ` ${order.billingAddress.address2}` : ""}\n${order.billingAddress.city}, ${order.billingAddress.provinceCode || ""} ${order.billingAddress.zip}\n${order.billingAddress.country}`
            : "";
        const freqLabel = logType === 'recurring'
            ? ((log as any).frequency === "weekly" ? "Weekly" : (log as any).frequency === "monthly" ? "Monthly" : "One-time")
            : "One-time";

        const config = await (prisma as any).recurringDonationConfig.findUnique({ where: { shop } });
        const donationProductId = config?.productId || "9946640679159";

        const orderDetailResponse = await admin.graphql(
            `#graphql
      query getOrderDetail($id: ID!) {
        order(id: $id) {
          lineItems(first: 20) {
            edges {
              node {
                title
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
            { variables: { id: log.orderId } }
        );
        const detailData = await orderDetailResponse.json();
        const lineItems = detailData.data?.order?.lineItems?.edges?.map((e: any) => e.node) || [];
        const donationItem = lineItems.find((li: any) => li.variant?.product?.id?.includes(donationProductId));

        let nextBillingDate = "";
        const createdDate = new Date(log.createdAt);
        const frequencyFromLog = (log as any).frequency;

        if (frequencyFromLog === "weekly") {
            createdDate.setDate(createdDate.getDate() + 7);
            nextBillingDate = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } else if (frequencyFromLog === "monthly") {
            createdDate.setDate(createdDate.getDate() + 30);
            nextBillingDate = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }

        const res = await sendDonationReceipt({
            email: order.email,
            name: customerName,
            amount: log.donationAmount.toFixed(2),
            orderNumber: order.name,
            shop,
            frequency: freqLabel,
            shippingAddress: shippingAddr,
            billingAddress: billingAddr,
            productTitle: donationItem?.title || "Recurring Donation",
            manageUrl: `https://${shop}/account/subscriptions`,
            nextBillingDate: nextBillingDate
        });

        if (res.success) {
            if (logType === 'pos') {
                await prisma.posDonationLog.update({
                    where: { id: logId },
                    data: { receiptStatus: "sent", receiptSentAt: new Date(), isResent: true } as any
                });
            } else {
                await (prisma as any).recurringDonationLog.update({
                    where: { id: logId },
                    data: { receiptStatus: "sent", receiptSentAt: new Date(), isResent: true } as any
                });
            }
            return data({ success: true });
        } else {
            if (logType === 'pos') {
                await prisma.posDonationLog.update({
                    where: { id: logId },
                    data: { receiptStatus: "failed" }
                });
            } else {
                await (prisma as any).recurringDonationLog.update({
                    where: { id: logId },
                    data: { receiptStatus: "failed" }
                });
            }
            return data({ success: false, error: res.error }, { status: 500 });
        }
    } else {
        return data({ success: false, error: "Missing logId or donationId" }, { status: 400 });
    }
};
