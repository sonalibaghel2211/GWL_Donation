import nodemailer from 'nodemailer';
import db from "../db.server";
import sgMail from '@sendgrid/mail';

function createSmtpTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
}

export function getCurrencySymbol(currency?: string): string {
  const code = (currency || "USD").toUpperCase().trim();
  try {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const parts = formatter.formatToParts(0);
    const symbolPart = parts.find(part => part.type === "currency");
    return symbolPart ? symbolPart.value : code;
  } catch (e) {
    return code;
  }
}

export function formatCurrency(amountVal: number | string, currencyCode?: string): string {
  const code = (currencyCode || "USD").toUpperCase().trim();

  // If the amountVal is already a string that contains a currency symbol or currency code, return it as-is
  if (typeof amountVal === "string") {
    const hasSymbol = /[^0-9.\s-]/g.test(amountVal);
    if (hasSymbol) {
      return amountVal;
    }
  }

  const numericAmount = typeof amountVal === "string" ? parseFloat(amountVal.replace(/[^0-9.-]/g, "")) : amountVal;
  if (isNaN(numericAmount)) return String(amountVal);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    }).format(numericAmount);
  } catch (e) {
    return `${code} ${numericAmount.toFixed(2)}`;
  }
}

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
  lineItems?: Array<{ title: string; amount: string; image?: string; sellingPlan?: string }>;
  currency?: string;
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
  lineItems,
  currency,
}: DonationReceiptArgs) {
  // Create SMTP transporter
  const transporter = createSmtpTransporter();
  let verifiedFromEmail = (process.env.SMTP_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || "").trim();
  if (!verifiedFromEmail) verifiedFromEmail = "donations@yourstore.com";

  if (!transporter && !process.env.SENDGRID_API_KEY) {
    console.error("[sendDonationReceipt] SMTP credentials and SENDGRID_API_KEY missing from environment variables");
    return { success: false, error: "Missing SMTP/SendGrid configuration" };
  }

  let settings = null;
  try {
    settings = await db.emailSettings.findUnique({ where: { shop } });
  } catch (dbError) {
    console.error("[sendDonationReceipt] Error fetching email settings:", dbError);
  }

  // Defaults
  let replyToEmail = verifiedFromEmail;
  let ccEmail = "";
  let notifyMerchant = false;
  let subjectTemplate = `Thank you for your donation (Order ${orderNumber})`;
  let bodyTemplate = `We've received your generous donation of <strong>${amount}</strong> along with your order ${orderNumber}.`;

  if (settings) {
    replyToEmail = settings.contactEmail || replyToEmail;
    ccEmail = settings.ccEmail || "";
    notifyMerchant = (settings as any).notifyMerchantOnSubscriptionChange || false;

    if (type === "refund") {
      subjectTemplate = settings.refundSubject || subjectTemplate;
      bodyTemplate = settings.refundBody || bodyTemplate;
    } else if (type === "cancellation") {
      subjectTemplate = settings.cancelSubject || subjectTemplate;
      bodyTemplate = settings.cancelBody || bodyTemplate;
    } else if (type === "pause") {
      subjectTemplate = (settings as any).pauseSubject || "Subscription Paused";
      bodyTemplate = (settings as any).pauseBody || "Your subscription has been paused.";
    } else if (type === "resume") {
      subjectTemplate = (settings as any).resumeSubject || "Subscription Resumed";
      bodyTemplate = (settings as any).resumeBody || "Your subscription has been resumed.";
    } else if (type === "reminder") {
      subjectTemplate = settings.reminderSubject || "Upcoming Donation Reminder";
      bodyTemplate = settings.reminderBody || bodyTemplate;
    } else if (type === "recovery") {
      subjectTemplate = settings.recoverySubject || "Action Required: Your donation payment failed";
      bodyTemplate = settings.recoveryBody || "We were unable to process your recurring donation. We will automatically retry the payment in a few days.";
    } else {
      subjectTemplate = settings.receiptSubject || subjectTemplate;
      bodyTemplate = settings.receiptBody || bodyTemplate;
    }
  }

  const replaceVariables = (str: string, wrap = false) => {
    const smartReplace = (html: string, variable: string, value: string) => {
      const regex = new RegExp('\\{\\{(\\s*<[^>]*>\\s*)*' + variable + '(\\s*<[^>]*>\\s*)*\\}\\}', 'gi');
      if (wrap && variable !== "account_url") {
        return html.replace(regex, `<strong style="color:#6C4A79">${value}</strong>`);
      }
      return html.replace(regex, value);
    };

    let res = str;

    // Merge {{currency}}{{amount}} and {{currency}}{{price}} combinations into {{amount}} / {{price}}
    res = res.replace(/\{\{\s*currency\s*\}\}\s*\{\{\s*amount\s*\}\}/gi, "{{amount}}");
    res = res.replace(/\{\{\s*currency\s*\}\}\s*\{\{\s*price\s*\}\}/gi, "{{price}}");

    const formattedAmount = formatCurrency(amount, currency);

    res = smartReplace(res, "first_name", name.split(" ")[0] || "");
    res = smartReplace(res, "last_name", name.split(" ").slice(1).join(" ") || "");
    res = smartReplace(res, "email", email);
    res = smartReplace(res, "currency", getCurrencySymbol(currency));
    res = smartReplace(res, "amount", formattedAmount);
    res = smartReplace(res, "price", formattedAmount);
    res = smartReplace(res, "donation_name", donationName || productTitle || "Charity Donation");
    res = smartReplace(res, "orderNumber", orderNumber);
    res = smartReplace(res, "date", new Date().toLocaleDateString());
    res = smartReplace(res, "frequency", frequency || "One-time");
    res = smartReplace(res, "nextBillingDate", nextBillingDate || "N/A");
    res = smartReplace(res, "paymentMethod", paymentMethod || "Ending in card");
    res = smartReplace(res, "account_url", manageUrl || "#");

    return res;
  };

  const finalSubject = replaceVariables(subjectTemplate, false);
  const finalBody = replaceVariables(bodyTemplate, true);

  let title = "Donation Receipt";
  if (type === "refund") title = "Donation Refunded";
  else if (type === "cancellation") title = "Donation Cancelled";
  else if (type === "pause") title = "Subscription Paused";
  else if (type === "resume") title = "Subscription Resumed";
  else if (type === "reminder") title = "Upcoming Donation Reminder";
  else if (type === "recovery") title = "Payment Failed";
  else if (type === "renewal") title = "Recurring Donation Charged";

  const isRecurring = frequency === "Monthly" || frequency === "Weekly";

  let htmlContent = "";

  const isValidLogo = (url: string | null | undefined) => {
    if (!url) return false;
    const trimmed = url.trim();
    return trimmed !== "" && trimmed !== "null" && (trimmed.startsWith("http") || trimmed.startsWith("data:image") || trimmed.startsWith("//"));
  };

  const getLogoUrl = (url: string | null | undefined) => {
    if (!url) return "";
    const trimmed = url.trim();
    if (trimmed.startsWith("//")) return "https:" + trimmed;
    return trimmed;
  };

  if (isRecurring && (type === "receipt" || type === "renewal" || type === "pause" || type === "resume" || type === "cancellation" || type === "reminder" || type === "recovery")) {
    const statusHeader = type === "pause" ? "Subscription Paused" :
      type === "resume" ? "Subscription Resumed" :
        type === "cancellation" ? "Subscription Cancelled" :
          type === "reminder" ? "Upcoming Donation Reminder" :
            type === "recovery" ? "Payment Failed" :
              type === "renewal" ? "Recurring Donation Charged" : "Welcome Aboard";
    const statusSubtext = type === "pause" ? "Your subscription has been paused. You can resume it at any time from your account." :
      type === "resume" ? "Your subscription has been resumed. Thank you for your continued support!" :
        type === "cancellation" ? "Your subscription has been cancelled. We're sorry to see you go." :
          type === "reminder" ? "This is a friendly reminder of your upcoming donation charge." :
            type === "recovery" ? "We were unable to process your latest payment. Please update your payment details to avoid interruption." :
              type === "renewal" ? "Thank you for your recurring donation!" : "Thank you for your subscription purchase!";

    htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; background-color: #fff; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
      <div style="margin-bottom: 24px;">
        ${isValidLogo(settings?.logoUrl) ? `<img src="${getLogoUrl(settings!.logoUrl)}" alt="Logo" style="max-height: 50px; display: block;" />` : ""}
      </div>

      <div style="text-align: left; margin-bottom: 24px;">
        <h1 style="color: #202223; font-size: 24px; font-weight: 700; margin: 0;">${statusHeader}</h1>
        <p style="color: #6D7175; font-size: 16px; margin-top: 8px;">Hello ${name.split(" ")[0] || "there"},</p>
        <p style="font-size: 16px; margin-top: 4px;">${statusSubtext}</p>
        <p style="font-size: 16px; margin-top: 4px;">Please view the details of your subscription below.</p>
        <p style="font-size: 16px; margin-top: 20px; margin-bottom: 0;">Thanks!<br /><strong>Your Store Team</strong></p>
      </div>

      <div style="background-color: #f9f9f9; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
        ${lineItems && lineItems.length >= 1
        ? `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse;">
            ${lineItems.map((item, idx) => `
              <tr style="${idx > 0 ? 'border-top: 1px solid #eee;' : ''}">
                <td style="padding: 12px 0; vertical-align: middle; width: 60px;">
                  ${item.image ? `<img src="${item.image}" alt="${item.title}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1px solid #eee; display: block;" />` : `<div style="width: 60px; height: 60px; background: #eee; border-radius: 8px;"></div>`}
                </td>
                <td style="padding: 12px 16px; vertical-align: middle;">
                  <div style="font-weight: 700; font-size: 15px; color: #202223; word-break: break-all;">${item.title}</div>
                  <div style="font-size: 13px; color: #6D7175; margin-top: 2px;">${item.sellingPlan ? `Selling Plan: ${item.sellingPlan}` : `One-time Donation`}</div>
                  <div style="font-size: 13px; color: #6D7175;">Quantity: 1</div>
                </td>
                <td style="padding: 12px 0; vertical-align: middle; text-align: right; font-weight: 700; font-size: 15px; color: #202223; white-space: nowrap;">
                  ${formatCurrency(item.amount, currency)}
                </td>
              </tr>
            `).join('')}
          </table>
          `
        : `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 0; vertical-align: middle; width: 80px;">
                ${productImage ? `<img src="${productImage}" alt="${productTitle || 'Donation'}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid #eee; display: block;" />` : `<div style="width: 80px; height: 80px; background: #eee; border-radius: 8px;"></div>`}
              </td>
              <td style="padding: 0 16px; vertical-align: middle;">
                <div style="font-weight: 700; font-size: 16px; color: #202223; word-break: break-all;">${productTitle || donationName || "Charity Donation"}</div>
                <div style="font-size: 14px; color: #6D7175; margin-top: 4px;">${frequency && String(frequency) !== "one_time" ? `Selling Plan: ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Donation` : `One-time Donation`}</div>
                <div style="font-size: 14px; color: #6D7175;">Quantity: 1</div>
              </td>
              <td style="padding: 0; vertical-align: middle; text-align: right; font-weight: 700; font-size: 16px; color: #202223; white-space: nowrap;">
                ${formatCurrency(amount, currency)}
              </td>
            </tr>
          </table>
          `
      }
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

      ${manageUrl ? `
      <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee;">
        <a href="${manageUrl}" style="display: inline-block; padding: 14px 32px; background-color: #1a1c1d; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">Manage Subscription</a>
        <p style="margin-top: 12px; font-size: 13px; color: #6D7175;">View, pause, or cancel your subscription from your account.</p>
      </div>
      ` : ""}
    </div>
    `;
  } else {
    const isRecurringFreq = frequency === "Monthly" || frequency === "Weekly";
    const recurringBadge = isRecurringFreq
      ? `<div style="margin-bottom: 12px; padding: 8px 14px; background: #e8f5e9; border-radius: 6px; display: inline-block; font-size: 13px; color: #2e7d32;">
          <strong>${frequency} Donation</strong>
          ${nextBillingDate ? ` &mdash; next charge on <strong>${nextBillingDate}</strong>` : ""}
         </div>`
      : "";

    const hasHeading = /<h[1-6][^>]*>/i.test(finalBody);
    const mainHeading = hasHeading ? "" : `<h2 style="color: #008060;">${title}</h2>`;

    htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
      ${isValidLogo(settings?.logoUrl) ? `<div style="margin-bottom: 24px;"><img src="${getLogoUrl(settings!.logoUrl)}" alt="Logo" style="max-height: 50px; display: block;" /></div>` : ""}
      ${mainHeading}
      ${recurringBadge}
      <div>${finalBody}</div>
      ${manageUrl ? `
      <div style="margin-top: 24px;">
        <a href="${manageUrl}" style="display: inline-block; padding: 12px 24px; background-color: #008060; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">Manage Subscription</a>
      </div>
      ` : ""}
    </div>
    `;
  }

  const headers: Record<string, string> = {
    "X-Auto-Response-Suppress": "OOF, AutoReply",
    "Auto-Submitted": "auto-generated",
  };

  const msg: any = {
    to: email,
    from: verifiedFromEmail,
    replyTo: replyToEmail,
    subject: finalSubject,
    html: htmlContent,
    headers,
  };

  if (manageUrl) {
    msg.list = {
      unsubscribe: {
        url: manageUrl,
        comment: "Unsubscribe or manage your subscription"
      }
    };
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  if (ccEmail) msg.cc = ccEmail;

  try {
    if (transporter) {
      await transporter.sendMail(msg);
    } else {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");
      await sgMail.send(msg);
    }

    // ── Merchant Notification Copy ──
    // Send a copy to the merchant if enabled, but don't let it crash the main flow
    if (notifyMerchant && type !== "receipt" && (type === "pause" || type === "resume" || type === "cancellation" || type === "reminder" || type === "recovery")) {
      try {
        const merchantMsg = {
          ...msg,
          to: replyToEmail, // Send to merchant's contact email
          replyTo: email,    // Reply-to goes to customer
          subject: `[Merchant Copy] ${finalSubject}`
        };
        if (transporter) {
          await transporter.sendMail(merchantMsg);
        } else {
          await sgMail.send(merchantMsg);
        }
      } catch (merchantError: any) {
        console.error("[sendDonationReceipt] Failed to send merchant copy. Detailed error information:");
        console.error("- Error Message:", merchantError?.message || "No error message");
        console.error("- Error Stack:", merchantError?.stack || "No stack trace");
        console.error("- Error Code:", merchantError?.code || "No error code");
        console.error("- Raw Error Object:");
        console.dir(merchantError, { depth: null });
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("[sendDonationReceipt] Email sending failed. Detailed error information:");
    console.error("- Error Message:", error?.message || "No error message");
    console.error("- Error Stack:", error?.stack || "No stack trace");
    console.error("- Error Code:", error?.code || "No error code");
    console.error("- Raw Error Object:");
    console.dir(error, { depth: null });

    return { success: false, error: error?.message || String(error) };
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
  const transporter = createSmtpTransporter();
  let verifiedFromEmail = (process.env.SMTP_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || "").trim();
  if (!verifiedFromEmail) verifiedFromEmail = "donations@yourstore.com";

  if (!transporter && !process.env.SENDGRID_API_KEY) {
    console.error("[sendPlanChangeConfirmation] SMTP credentials and SENDGRID_API_KEY missing from environment variables");
    return { success: false, error: "Missing SMTP/SendGrid configuration" };
  }

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
      &copy; ${new Date().getFullYear()} Donations: Subscriptions & Receipts. All rights reserved.
    </div>
  </div>
  `;

  const msg = {
    to: email,
    from: verifiedFromEmail,
    subject: `Your Donations: Subscriptions & Receipts plan has been updated to ${planName.charAt(0).toUpperCase() + planName.slice(1)}`,
    html: htmlContent,
  };

  try {
    if (transporter) {
      await transporter.sendMail(msg);
    } else {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");
      await sgMail.send(msg);
    }
    return { success: true };
  } catch (error: any) {
    console.error("[sendPlanChangeConfirmation] Email sending failed. Detailed error information:");
    console.error("- Error Message:", error?.message || "No error message");
    console.error("- Error Stack:", error?.stack || "No stack trace");
    console.error("- Error Code:", error?.code || "No error code");
    console.error("- Raw Error Object:");
    console.dir(error, { depth: null });
    return { success: false, error: error?.message || String(error) };
  }
}
