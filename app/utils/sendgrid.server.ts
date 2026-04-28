import sgMail from '@sendgrid/mail';
import db from "../db.server";

interface DonationReceiptArgs {
    email: string;
    name: string;
    amount: string;
    orderNumber: string;
    type?: string;
    shop: string;
    frequency?: string;
    nextBillingDate?: string;
    donationName?: string;
    shippingAddress?: string;
    billingAddress?: string;
    manageUrl?: string;
    productImage?: string;
    productTitle?: string;
    paymentMethod?: string;
}

export async function sendDonationReceipt({
    email,
    name,
    amount,
    orderNumber,
    type = "receipt",
    shop,
    frequency,
    nextBillingDate,
    donationName,
    shippingAddress,
    billingAddress,
    manageUrl,
    productImage,
    productTitle,
    paymentMethod,
}: DonationReceiptArgs) {
    // Defensive environment variable parsing to handle potential merging issues in .env
    const rawApiKey = process.env.SENDGRID_API_KEY || "";
    const apiKey = rawApiKey.split("SHOPIFY")[0].trim();

    const rawFromEmail = process.env.SENDGRID_FROM_EMAIL || "";
    let verifiedFromEmail = rawFromEmail.split("SHOPIFY")[0].trim();
    if (!verifiedFromEmail) verifiedFromEmail = "donations@yourstore.com";

    if (!apiKey) {
        console.error("[sendDonationReceipt] SENDGRID_API_KEY is missing from environment variables");
        return { success: false, error: "Missing API Key" };
    }

    sgMail.setApiKey(apiKey);

    const settings = await db.emailSettings.findUnique({ where: { shop } });

    // Defaults
    let replyToEmail = verifiedFromEmail;
    let ccEmail = "";
    let subjectTemplate = `Thank you for your donation (Order ${orderNumber})`;
    let bodyTemplate = `We've received your generous donation of <strong>${amount}</strong> along with your order ${orderNumber}.`;

    if (settings) {
        replyToEmail = settings.contactEmail || replyToEmail;
        ccEmail = settings.ccEmail || "";

        if (type === "refund") {
            subjectTemplate = settings.refundSubject;
            bodyTemplate = settings.refundBody;
        } else if (type === "cancellation") {
            subjectTemplate = settings.cancelSubject;
            bodyTemplate = settings.cancelBody;
        } else if (type === "pause") {
            subjectTemplate = (settings as any).pauseSubject || "Subscription Paused";
            bodyTemplate = (settings as any).pauseBody || "Your subscription has been paused.";
        } else if (type === "resume") {
            subjectTemplate = (settings as any).resumeSubject || "Subscription Resumed";
            bodyTemplate = (settings as any).resumeBody || "Your subscription has been resumed.";
        } else {
            subjectTemplate = settings.receiptSubject;
            bodyTemplate = settings.receiptBody;
        }
    }

    const replaceVariables = (str: string) => {
        const smartReplace = (html: string, variable: string, value: string) => {
            const regex = new RegExp('\\{\\{(\\s*<[^>]*>\\s*)*' + variable + '(\\s*<[^>]*>\\s*)*\\}\\}', 'gi');
            return html.replace(regex, value);
        };

        let res = str;
        res = smartReplace(res, "first_name", name.split(" ")[0] || "");
        res = smartReplace(res, "last_name", name.split(" ").slice(1).join(" ") || "");
        res = smartReplace(res, "email", email);
        res = smartReplace(res, "currency", "$");
        res = smartReplace(res, "amount", amount);
        res = smartReplace(res, "price", amount);
        res = smartReplace(res, "donation_name", donationName || productTitle || "Charity Donation");
        res = smartReplace(res, "orderNumber", orderNumber);
        res = smartReplace(res, "date", new Date().toLocaleDateString());
        res = smartReplace(res, "frequency", frequency || "One-time");
        res = smartReplace(res, "nextBillingDate", nextBillingDate || "N/A");
        res = smartReplace(res, "paymentMethod", paymentMethod || "Ending in card");

        return res;
    };

    const finalSubject = replaceVariables(subjectTemplate);
    const finalBody = replaceVariables(bodyTemplate);

    let title = "Donation Receipt";
    if (type === "refund") title = "Donation Refunded";
    else if (type === "cancellation") title = "Donation Cancelled";
    else if (type === "pause") title = "Subscription Paused";
    else if (type === "resume") title = "Subscription Resumed";

    const isRecurring = frequency === "Monthly" || frequency === "Weekly";

    let htmlContent = "";

    if (isRecurring && (type === "receipt" || type === "pause" || type === "resume" || type === "cancellation")) {
        const statusHeader = type === "pause" ? "Subscription Paused" :
            type === "resume" ? "Subscription Resumed" :
                type === "cancellation" ? "Subscription Cancelled" : "Welcome Aboard";
        const statusSubtext = type === "pause" ? "Your subscription has been paused. You can resume it at any time from your account." :
            type === "resume" ? "Your subscription has been resumed. Thank you for your continued support!" :
                type === "cancellation" ? "Your subscription has been cancelled. We're sorry to see you go." :
                    "Thank you for your subscription purchase!";

        htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; background-color: #fff; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
      <div style="margin-bottom: 24px;">
        ${settings?.logoUrl && settings.logoUrl.trim() !== '' && settings.logoUrl !== 'null' ? `<img src="${settings.logoUrl}" alt="Logo" style="max-height: 50px; display: block;" />` : ""}
      </div>

      <div style="text-align: left; margin-bottom: 24px;">
        <h1 style="color: #202223; font-size: 24px; font-weight: 700; margin: 0;">${statusHeader}</h1>
        <p style="color: #6D7175; font-size: 16px; margin-top: 8px;">Hello ${name.split(" ")[0] || "there"},</p>
        <p style="font-size: 16px; margin-top: 4px;">${statusSubtext}</p>
        <p style="font-size: 16px; margin-top: 4px;">Please view the details of your subscription below.</p>
        <p style="font-size: 16px; margin-top: 20px; margin-bottom: 0;">Thanks!<br /><strong>Your Store Team</strong></p>
      </div>

      <div style="background-color: #f9f9f9; border-radius: 12px; padding: 20px; margin-bottom: 32px; display: flex; align-items: center; gap: 16px;">
        ${productImage ? `<img src="${productImage}" alt="${productTitle || 'Donation'}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid #eee;" />` : `<div style="width: 80px; height: 80px; background: #eee; border-radius: 8px;"></div>`}
        <div style="flex: 1; padding-left: 16px;">
          <div style="font-weight: 700; font-size: 16px; color: #202223;">${productTitle || donationName || "Charity Donation"}</div>
          <div style="font-size: 14px; color: #6D7175; margin-top: 4px;">Selling Plan: ${frequency} Donation</div>
          <div style="font-size: 14px; color: #6D7175;">Quantity: 1</div>
        </div>
        <div style="font-weight: 700; font-size: 16px; color: #202223;">${amount}</div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; border-top: 1px solid #eee; padding-top: 24px; margin-bottom: 24px;">
        <div style="padding-right: 12px;">
          <h3 style="font-size: 14px; text-transform: uppercase; color: #6D7175; margin-bottom: 12px; letter-spacing: 1px;">Shipping Address</h3>
          <div style="font-size: 14px; color: #202223; white-space: pre-line;">${shippingAddress || "N/A"}</div>
        </div>
        <div style="padding-right: 12px;">
          <h3 style="font-size: 14px; text-transform: uppercase; color: #6D7175; margin-bottom: 12px; letter-spacing: 1px;">Billing Address</h3>
          <div style="font-size: 14px; color: #202223; white-space: pre-line;">${billingAddress || "N/A"}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; border-top: 1px solid #eee; padding-top: 24px;">
        <div>
          <h3 style="font-size: 14px; text-transform: uppercase; color: #6D7175; margin-bottom: 12px; letter-spacing: 1px;">Next Order Date</h3>
          <div style="font-size: 15px; font-weight: 600; color: #202223;">${nextBillingDate || "Calculated soon"}</div>
        </div>
        <div>
          <h3 style="font-size: 14px; text-transform: uppercase; color: #6D7175; margin-bottom: 12px; letter-spacing: 1px;">Payment Method</h3>
          <div style="font-size: 15px; font-weight: 600; color: #202223;">${paymentMethod || "Ending in card"}</div>
        </div>
      </div>
    </div>
    `;
    } else {
        const recurringBadge = (frequency && frequency !== "One-time")
            ? `<div style="margin-bottom: 12px; padding: 8px 14px; background: #e8f5e9; border-radius: 6px; display: inline-block; font-size: 13px; color: #2e7d32;">
          <strong>${frequency} Recurring Donation</strong>
          ${nextBillingDate ? ` &mdash; next charge on <strong>${nextBillingDate}</strong>` : ""}
         </div>`
            : "";

        htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
      ${(settings as any)?.logoUrl ? `<div style="margin-bottom: 24px;"><img src="${(settings as any).logoUrl}" alt="Logo" style="max-height: 50px; display: block;" /></div>` : ""}
      <h2 style="color: #008060;">${title}</h2>
      ${recurringBadge}
      <div>${finalBody}</div>
      <br />
      <p style="border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666;">
         If you have any questions or concerns, please reply to this email and we will get back to you as soon as we can.
      </p>
    </div>
    `;
    }

    const msg: any = {
        to: email,
        from: verifiedFromEmail,
        replyTo: replyToEmail,
        subject: finalSubject,
        html: htmlContent,
    };

    if (ccEmail) msg.cc = ccEmail;

    console.log(`[sendDonationReceipt] Final payload From: ${verifiedFromEmail}, To: ${email}, Subject: ${finalSubject}`);

    try {
        await sgMail.send(msg);
        return { success: true };
    } catch (error: any) {
        console.error("SendGrid rejected payload or failed:", error);
        if (error.response?.body) {
            console.log("SendGrid Error Body:", JSON.stringify(error.response.body, null, 2));
        }
        return { success: false, error: String(error) };
    }
}

export async function sendPlanChangeConfirmation({
    shop,
    planName,
    email,
}: {
    shop: string;
    planName: string;
    email: string;
}) {
    const rawApiKey = process.env.SENDGRID_API_KEY || "";
    const apiKey = rawApiKey.split("SHOPIFY")[0].trim();

    const rawFromEmail = process.env.SENDGRID_FROM_EMAIL || "";
    let verifiedFromEmail = rawFromEmail.split("SHOPIFY")[0].trim() || "donations@yourstore.com";

    if (!apiKey) {
        console.error("SENDGRID_API_KEY is missing");
        return { success: false };
    }

    sgMail.setApiKey(apiKey);

    const htmlContent = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; background-color: #fff; padding: 24px; border: 1px solid #eee; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="font-size: 32px; margin-bottom: 8px;">🚀</div>
      <h1 style="color: #202223; font-size: 24px; font-weight: 700; margin: 0;">Plan Successfully Updated!</h1>
    </div>

    <div style="margin-bottom: 24px;">
      <p style="font-size: 16px; color: #444;">Hello,</p>
      <p style="font-size: 16px; color: #444;">Your store <strong>${shop}</strong> has been successfully switched to the <strong>${planName.charAt(0).toUpperCase() + planName.slice(1)} Plan</strong>.</p>
      <p style="font-size: 16px; color: #444;">Your new features are now active and ready to use.</p>
    </div>

    <div style="background-color: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #6c4a79;">
      <div style="font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">New Plan</div>
      <div style="font-size: 18px; font-weight: 700; color: #202223;">${planName.charAt(0).toUpperCase() + planName.slice(1)}</div>
    </div>

    <p style="font-size: 15px; color: #6D7175;">If you didn't authorize this change, please contact our support immediately.</p>

    <div style="border-top: 1px solid #eee; margin-top: 32px; padding-top: 24px; text-align: center; font-size: 14px; color: #999;">
      &copy; ${new Date().getFullYear()} Galaxy Easy Donations. All rights reserved.
    </div>
  </div>
  `;

    const msg = {
        to: email,
        from: verifiedFromEmail,
        subject: `Your Galaxy Easy Donations plan has been updated to ${planName.charAt(0).toUpperCase() + planName.slice(1)}`,
        html: htmlContent,
    };

    try {
        await sgMail.send(msg);
        return { success: true };
    } catch (error) {
        console.error("Failed to send plan change email:", error);
        return { success: false };
    }
}
