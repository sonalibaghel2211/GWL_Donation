export function getEffectiveLogoUrl(logoUrl?: string): string {
    if (!logoUrl || !logoUrl.trim() || logoUrl === "null" || logoUrl === "undefined") {
        return "";
    }
    if (logoUrl.startsWith("data:image/")) {
        return logoUrl;
    }
    if (typeof window === "undefined" && typeof process !== "undefined" && process.versions?.node) {
        try {
            const fs = require("fs");
            const path = require("path");
            const urlObj = logoUrl.startsWith("http") ? new URL(logoUrl) : null;
            const pathname = urlObj ? urlObj.pathname : logoUrl;
            if (pathname.includes("/uploads/")) {
                const filename = path.basename(pathname);
                const localPath = path.join(process.cwd(), "public", "uploads", filename);
                if (fs.existsSync(localPath)) {
                    const buffer = fs.readFileSync(localPath);
                    const ext = path.extname(filename).replace(".", "") || "png";
                    const mime = ext === "svg" ? "image/svg+xml" : `image/${ext}`;
                    return `data:${mime};base64,${buffer.toString("base64")}`;
                }
            }
        } catch (e) {
            console.warn("[getEffectiveLogoUrl] Error converting logoUrl:", e);
        }
    }
    return logoUrl;
}

export const DEFAULT_DONATION_RECEIPT_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: A4 portrait;
    margin: 0;
  }
  html, body {
    margin: 0;
    padding: 0;
    background-color: #ffffff;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #1A1A2E;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .receipt-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px 24px;
    box-sizing: border-box;
    page-break-after: avoid;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .header {
    background-color: #6C4A79;
    color: #ffffff;
    padding: 16px 24px;
    border-radius: 6px 6px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header-title h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
  }
  .header-title p {
    margin: 4px 0 0 0;
    font-size: 11px;
    opacity: 0.85;
  }
  .header-date {
    font-size: 11px;
    text-align: right;
  }
  .info-bar {
    background-color: #F7F5F9;
    padding: 10px 16px;
    font-size: 11.5px;
    font-weight: bold;
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid #E0E0E0;
    margin-bottom: 14px;
  }
  .section-title {
    font-size: 11.5px;
    font-weight: bold;
    color: #6C4A79;
    letter-spacing: 0.5px;
    margin-top: 14px;
    margin-bottom: 4px;
    text-transform: uppercase;
  }
  .divider {
    border-top: 1px solid #E0E0E0;
    margin-bottom: 10px;
  }
  .grid {
    display: flex;
    flex-wrap: wrap;
    margin-bottom: 12px;
    gap: 15px;
  }
  .col {
    flex: 1;
    min-width: 200px;
  }
  .info-row {
    display: flex;
    margin-bottom: 5px;
    font-size: 11.5px;
  }
  .info-label {
    width: 120px;
    font-weight: bold;
    color: #666666;
  }
  .info-value {
    flex: 1;
    color: #1A1A2E;
  }
  .amount-box {
    background-color: #F8F0FC;
    border-left: 4px solid #6C4A79;
    padding: 12px 16px;
    margin: 14px 0;
  }
  .amount-label {
    font-size: 10px;
    font-weight: bold;
    color: #666666;
    letter-spacing: 0.5px;
  }
  .amount-value {
    font-size: 22px;
    font-weight: 700;
    color: #6C4A79;
    margin-top: 3px;
  }
  .letter-body {
    font-size: 12px;
    color: #1A1A2E;
    line-height: 1.5;
    margin: 14px 0;
  }
  .signature-block {
    margin-top: 16px;
    font-size: 11.5px;
  }
  .signature-title {
    font-weight: bold;
    margin-top: 4px;
  }
  .footer {
    border-top: 1px solid #E0E0E0;
    margin-top: 20px;
    padding-top: 10px;
    text-align: center;
    font-size: 9.5px;
    color: #888888;
  }
</style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div class="header-title">
        {{#if logo_url}}
          <img src="{{logo_url}}" style="max-height: 42px; max-width: 180px; object-fit: contain; margin-bottom: 8px; display: block;" />
        {{/if}}
        <h1>DONATION RECEIPT</h1>
        <p>Smart Donate &middot; Recurring & Receipts</p>
      </div>
      <div class="header-date">
        Date: {{date}}
      </div>
    </div>
    
    <div class="info-bar">
      <span>Receipt: {{receipt_number}}</span>
      <span>Order: {{order_number}}</span>
      <span>Date: {{date}}</span>
    </div>
    
    <div class="section-title">Donor Information</div>
    <div class="divider"></div>
    
    <div class="grid">
      <div class="col">
        <div class="info-row">
          <span class="info-label">Name:</span>
          <span class="info-value">{{customer_name}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value">{{customer_email}}</span>
        </div>
      </div>
      <div class="col">
        <div class="info-row">
          <span class="info-label">Billing Address:</span>
          <span class="info-value" style="white-space: pre-line;">{{billing_address}}</span>
        </div>
      </div>
    </div>
    
    <div class="section-title">Donation Summary</div>
    <div class="divider"></div>
    
    <div class="info-row">
      <span class="info-label">Campaign:</span>
      <span class="info-value">{{donation_name}}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Donation Type:</span>
      <span class="info-value">{{donation_type}}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Gift Date:</span>
      <span class="info-value">{{date}}</span>
    </div>
    
    <div class="amount-box">
      <div class="amount-label">DONATION AMOUNT</div>
      <div class="amount-value">{{amount}}</div>
    </div>
    
    <div class="section-title">Acknowledgement</div>
    <div class="divider"></div>
    
    <div class="letter-body">
      {{acknowledgement_text}}
    </div>
    
    <div class="signature-block">
      <p style="font-style: italic; color: #666666; margin-bottom: 10px;">Authorized by,</p>
      <div class="signature-title">Smart Donate Team</div>
      <div style="color: #666666;">{{shop_name}}</div>
    </div>
    
    <div class="footer">
      <p style="margin: 2px 0;">This receipt was generated by Smart Donate &middot; Recurring & Receipts. Please retain this document for your records.</p>
      <p style="margin: 2px 0;">{{footer_note}}</p>
    </div>
  </div>
</body>
</html>`;

export const DEFAULT_CANCEL_RECEIPT_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: A4 portrait;
    margin: 0;
  }
  html, body {
    margin: 0;
    padding: 0;
    background-color: #ffffff;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #1A1A2E;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .receipt-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px 24px;
    box-sizing: border-box;
    page-break-after: avoid;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .header {
    background-color: #B91C1C;
    color: #ffffff;
    padding: 16px 24px;
    border-radius: 6px 6px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header-title h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
  }
  .header-title p {
    margin: 4px 0 0 0;
    font-size: 11px;
    opacity: 0.85;
  }
  .header-date {
    font-size: 11px;
    text-align: right;
  }
  .void-banner {
    background-color: #FEF2F2;
    border-left: 3px solid #B91C1C;
    padding: 8px 14px;
    font-size: 11px;
    font-weight: bold;
    color: #B91C1C;
    margin-top: 8px;
  }
  .info-bar {
    background-color: #F7F5F9;
    padding: 10px 16px;
    font-size: 11.5px;
    font-weight: bold;
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid #E0E0E0;
    margin-bottom: 14px;
  }
  .section-title {
    font-size: 11.5px;
    font-weight: bold;
    color: #B91C1C;
    letter-spacing: 0.5px;
    margin-top: 14px;
    margin-bottom: 4px;
    text-transform: uppercase;
  }
  .divider {
    border-top: 1px solid #E0E0E0;
    margin-bottom: 10px;
  }
  .grid {
    display: flex;
    flex-wrap: wrap;
    margin-bottom: 12px;
    gap: 15px;
  }
  .col {
    flex: 1;
    min-width: 200px;
  }
  .info-row {
    display: flex;
    margin-bottom: 5px;
    font-size: 11.5px;
  }
  .info-label {
    width: 120px;
    font-weight: bold;
    color: #666666;
  }
  .info-value {
    flex: 1;
    color: #1A1A2E;
  }
  .amount-box {
    background-color: #FEF2F2;
    border-left: 4px solid #B91C1C;
    padding: 12px 16px;
    margin: 14px 0;
    display: flex;
    gap: 40px;
  }
  .amount-col {
    flex: 1;
  }
  .amount-label {
    font-size: 10px;
    font-weight: bold;
    color: #666666;
    letter-spacing: 0.5px;
  }
  .amount-value {
    font-size: 22px;
    font-weight: 700;
    margin-top: 3px;
  }
  .letter-body {
    font-size: 12px;
    color: #1A1A2E;
    line-height: 1.5;
    margin: 14px 0;
  }
  .signature-block {
    margin-top: 16px;
    font-size: 11.5px;
  }
  .signature-title {
    font-weight: bold;
    margin-top: 4px;
  }
  .footer {
    border-top: 1px solid #E0E0E0;
    margin-top: 20px;
    padding-top: 10px;
    text-align: center;
    font-size: 9.5px;
    color: #888888;
  }
</style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div class="header-title">
        {{#if logo_url}}
          <img src="{{logo_url}}" style="max-height: 42px; max-width: 180px; object-fit: contain; margin-bottom: 8px; display: block;" />
        {{/if}}
        <h1>CANCELLATION RECEIPT</h1>
        <p>Smart Donate &middot; Recurring & Receipts</p>
      </div>
      <div class="header-date">
        Cancellation Date: {{cancel_date}}
      </div>
    </div>
    
    <div class="void-banner">
      VOIDED &mdash; This donation has been cancelled. This receipt is not valid for tax deduction purposes.
    </div>
    
    <div class="info-bar" style="margin-top: 8px;">
      <span>Receipt: {{receipt_number}}</span>
      <span>Order: {{order_number}}</span>
      <span>Date: {{date}}</span>
    </div>
    
    <div class="section-title">Donor Information</div>
    <div class="divider"></div>
    
    <div class="grid">
      <div class="col">
        <div class="info-row">
          <span class="info-label">Name:</span>
          <span class="info-value">{{customer_name}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value">{{customer_email}}</span>
        </div>
      </div>
      <div class="col">
        <div class="info-row">
          <span class="info-label">Billing Address:</span>
          <span class="info-value" style="white-space: pre-line;">{{billing_address}}</span>
        </div>
      </div>
    </div>
    
    <div class="section-title">Donation Summary</div>
    <div class="divider"></div>
    
    <div class="info-row">
      <span class="info-label">Campaign:</span>
      <span class="info-value">{{donation_name}}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Donation Type:</span>
      <span class="info-value">{{donation_type}}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Gift Date:</span>
      <span class="info-value">{{date}}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Cancellation Date:</span>
      <span class="info-value">{{cancel_date}}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Original Receipt:</span>
      <span class="info-value">{{original_receipt_number}}</span>
    </div>
    
    <div class="amount-box">
      <div class="amount-col">
        <div class="amount-label">ORIGINAL AMOUNT</div>
        <div class="amount-value" style="color: #666666; text-decoration: line-through;">{{amount}}</div>
      </div>
      <div class="amount-col">
        <div class="amount-label">ELIGIBLE AMOUNT</div>
        <div class="amount-value" style="color: #B91C1C;">{{zero_amount}}</div>
      </div>
    </div>
    
    <div class="section-title">Cancellation Notice</div>
    <div class="divider"></div>
    
    <div class="letter-body">
      {{acknowledgement_text}}
    </div>
    
    <div class="signature-block">
      <p style="font-style: italic; color: #666666; margin-bottom: 10px;">Authorized by,</p>
      <div class="signature-title">Smart Donate Team</div>
      <div style="color: #666666;">{{shop_name}}</div>
    </div>
    
    <div class="footer">
      <p style="margin: 2px 0;">This receipt was generated by Smart Donate &middot; Recurring & Receipts. Please retain this document for your records.</p>
      <p style="margin: 2px 0;">VOID &mdash; This receipt has been cancelled and is not valid for tax deductions.</p>
    </div>
  </div>
</body>
</html>`;

export const DEFAULT_DONATION_LETTER_BODY = `<p>Dear {{first_name}},</p>
<p>Thank you for your generous donation of {{amount}} to "{{donation_name}}". Your contribution is greatly appreciated and makes a meaningful difference.</p>
<p>This receipt serves as official confirmation of your donation and should be retained for your personal records.</p>
<p>On behalf of {{shop_name}}, we are truly grateful for your kindness and support.</p>`;

export const DEFAULT_CANCEL_LETTER_BODY = `<p>Dear {{first_name}},</p>
<p>This confirms that your donation receipt ({{original_receipt_number}}), dated {{date}}, for {{amount}} has been cancelled and voided. The eligible amount has been adjusted to {{zero_amount}}.</p>
<p>This receipt is no longer valid for tax deduction purposes. If you have questions, please contact the store where you made your donation.</p>
<p>We appreciate your generosity and hope to support your giving in the future.</p>`;

export function substituteReceiptVars(html: string, args: ReceiptPDFArgs): string {
    const formattedGiftDate = new Date(args.createdDate).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
    });
    const formattedCancelDate = args.cancellationDate
        ? new Date(args.cancellationDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    
    const firstName = args.customerName.split(" ")[0] || "Donor";
    const lastName = args.customerName.split(" ").slice(1).join(" ") || "";
    const shopDisplayName = args.shopName.charAt(0).toUpperCase() + args.shopName.slice(1);
    const currencyCode = (args.currencyCode || "USD").toUpperCase().trim();
    let amountStr: string;
    let zeroAmountStr: string;
    try {
        const formatter = new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode });
        amountStr = formatter.format(parseFloat(args.donationAmount || "0"));
        zeroAmountStr = formatter.format(0);
    } catch {
        amountStr = `${currencyCode} ${parseFloat(args.donationAmount || "0").toFixed(2)}`;
        zeroAmountStr = `${currencyCode} 0.00`;
    }

    const effectiveLogo = getEffectiveLogoUrl(args.logoUrl);

    const vars: Record<string, string> = {
        first_name: firstName,
        last_name: lastName,
        customer_name: args.customerName,
        customer_email: args.customerEmail,
        email: args.customerEmail,
        amount: amountStr,
        donation_type: args.donationType,
        frequency: args.frequency,
        campaign_name: args.campaignName || "General Donation",
        donation_name: args.campaignName || "General Donation",
        date: formattedGiftDate,
        cancel_date: formattedCancelDate,
        order_number: args.orderNumber,
        receipt_number: args.receiptNumber || "N/A",
        original_receipt_number: args.originalReceiptNumber || "N/A",
        shop_name: shopDisplayName,
        billing_address: args.billingAddress || "",
        shipping_address: args.shippingAddress || "",
        logo_url: effectiveLogo,
        footer_note: args.footerNote || `Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
        zero_amount: zeroAmountStr,
    };

    let result = html;

    // Handle logo_url conditional block before variable substitution
    if (effectiveLogo) {
        result = result.replace(/\{\{#if logo_url\}\}([\s\S]*?)\{\{\/if\}\}/gi, "$1");
    } else {
        result = result.replace(/\{\{#if logo_url\}\}([\s\S]*?)\{\{\/if\}\}/gi, "");
    }

    Object.entries(vars).forEach(([key, val]) => {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
        result = result.replace(regex, val);
    });

    return result;
}

