import PDFDocument from "pdfkit";
import {
    ReceiptPDFArgs,
    DEFAULT_DONATION_LETTER_BODY,
    DEFAULT_CANCEL_LETTER_BODY,
    getEffectiveLogoUrl
} from "./receipt-shared";

// ─── Color Palette ──────────────────────────────────────────
const COLORS = {
    primary: "#6C4A79",
    primaryLight: "#F8F0FC",
    infoBg: "#F7F5F9",
    text: "#1A1A2E",
    label: "#666666",
    border: "#E0E0E0",
    white: "#FFFFFF",
    footer: "#888888",
    // Cancel-specific
    cancelPrimary: "#B91C1C",
    cancelLight: "#FEF2F2",
};

// ─── Helper: strip HTML tags from acknowledgement text ──────
function stripHtml(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
        .replace(/<\/?(p|div|span|strong|em|b|i|u|a|h[1-6]|ul|ol|li|table|tr|td|th|thead|tbody|img|hr|blockquote)[^>]*>/gi, "")
        .replace(/&middot;/g, "·")
        .replace(/&mdash;/g, "—")
        .replace(/&ndash;/g, "–")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

// ─── Helper: format variables ───────────────────────────────
function resolveVars(args: ReceiptPDFArgs) {
    const formattedGiftDate = new Date(args.createdDate).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
    });
    const formattedCancelDate = args.cancellationDate
        ? new Date(args.cancellationDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    const firstName = args.customerName.split(" ")[0] || "Donor";
    const shopDisplayName = args.shopName.charAt(0).toUpperCase() + args.shopName.slice(1);
    const currencyCode = (args.currencyCode || "USD").toUpperCase().trim();

    let amountStr: string;
    let zeroAmountStr: string;
    try {
        const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode });
        amountStr = formatter.format(parseFloat(args.donationAmount || "0"));
        zeroAmountStr = formatter.format(0);
    } catch {
        amountStr = `${currencyCode} ${parseFloat(args.donationAmount || "0").toFixed(2)}`;
        zeroAmountStr = `${currencyCode} 0.00`;
    }

    return {
        firstName,
        shopDisplayName,
        amountStr,
        zeroAmountStr,
        formattedGiftDate,
        formattedCancelDate,
        currencyCode,
    };
}

// ─── Helper: resolve acknowledgement body text ──────────────
function resolveAcknowledgement(args: ReceiptPDFArgs, isVoided: boolean, vars: ReturnType<typeof resolveVars>): string {
    let bodyTemplate: string;

    if (isVoided) {
        bodyTemplate = args.cancelAcknowledgementText || DEFAULT_CANCEL_LETTER_BODY;
    } else {
        bodyTemplate = args.acknowledgementText || DEFAULT_DONATION_LETTER_BODY;
    }

    // If the merchant saved a full HTML template (the entire receipt), extract just the letter-body part
    if (/<html/i.test(bodyTemplate) || /<style/i.test(bodyTemplate)) {
        // They saved the full template; use the default letter body instead
        bodyTemplate = isVoided ? DEFAULT_CANCEL_LETTER_BODY : DEFAULT_DONATION_LETTER_BODY;
    }

    // Substitute template variables
    const replacements: Record<string, string> = {
        first_name: vars.firstName,
        customer_name: args.customerName,
        amount: vars.amountStr,
        donation_name: args.campaignName || "General Donation",
        campaign_name: args.campaignName || "General Donation",
        shop_name: vars.shopDisplayName,
        date: vars.formattedGiftDate,
        cancel_date: vars.formattedCancelDate,
        original_receipt_number: args.originalReceiptNumber || "N/A",
        zero_amount: vars.zeroAmountStr,
        receipt_number: args.receiptNumber || "N/A",
        order_number: args.orderNumber,
    };

    let result = bodyTemplate;
    Object.entries(replacements).forEach(([key, val]) => {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
        result = result.replace(regex, val);
    });

    return stripHtml(result);
}

// ─── Main PDF Generator ─────────────────────────────────────
export async function generateReceiptPDF(args: ReceiptPDFArgs): Promise<Buffer> {
    const isVoided = args.status === "cancelled" || args.status === "refunded";
    const logoUrl = getEffectiveLogoUrl(args.logoUrl);
    const pdfArgs = { ...args, logoUrl };
    const vars = resolveVars(pdfArgs);

    const accent = isVoided ? COLORS.cancelPrimary : COLORS.primary;
    const accentLight = isVoided ? COLORS.cancelLight : COLORS.primaryLight;

    const doc = new PDFDocument({
        size: "A4",
        margins: { top: 40, bottom: 40, left: 50, right: 50 },
        bufferPages: true,
    });

    const chunks: Uint8Array[] = [];
    doc.on("data", (chunk: Uint8Array) => chunks.push(chunk));

    const finished = new Promise<Buffer>((resolve, reject) => {
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);
    });

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const leftMargin = doc.page.margins.left;

    // ─── Header Bar ────────────────────────────────────────
    const headerY = doc.y;
    const headerHeight = 60;
    doc.save();
    doc.roundedRect(leftMargin, headerY, pageWidth, headerHeight, 6)
        .fill(accent);

    // Logo (if data URI)
    let logoXOffset = 0;
    if (logoUrl && logoUrl.startsWith("data:image/")) {
        try {
            const logoBuffer = Buffer.from(logoUrl.split(",")[1], "base64");
            doc.image(logoBuffer, leftMargin + 16, headerY + 15, {
                height: 30,
                fit: [120, 30],
            });
            logoXOffset = 140;
        } catch {
            // Ignore logo errors
        }
    }

    const headerTextX = leftMargin + 16 + logoXOffset;
    const headerTextY = headerY + 14;
    doc.font("Helvetica-Bold").fontSize(16).fillColor(COLORS.white)
        .text(isVoided ? "CANCELLATION RECEIPT" : "DONATION RECEIPT", headerTextX, headerTextY);
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.white).fillOpacity(0.85)
        .text("Smart Donate · Recurring & Receipts", headerTextX, headerTextY + 20);
    doc.fillOpacity(1); // Reset opacity

    // Date on right side
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.white)
        .text(
            `Date: ${vars.formattedGiftDate}`,
            leftMargin, headerTextY + 8,
            { width: pageWidth - 16, align: "right" }
        );
    doc.restore();

    // Advance doc.y past the header bar
    doc.y = headerY + headerHeight + 16;

    // ─── Void Banner (cancel only) ─────────────────────────
    if (isVoided) {
        const voidY = doc.y;
        doc.save();
        doc.rect(leftMargin, voidY, pageWidth, 28).fill(COLORS.cancelLight);
        doc.rect(leftMargin, voidY, 3, 28).fill(COLORS.cancelPrimary);
        doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.cancelPrimary)
            .text(
                "VOIDED — This donation has been cancelled. This receipt is not valid for tax deduction purposes.",
                leftMargin + 14, voidY + 8,
                { width: pageWidth - 28 }
            );
        doc.restore();
        doc.y = voidY + 36;
    }

    // ─── Info Bar ──────────────────────────────────────────
    const infoBarY = doc.y;
    doc.save();
    doc.rect(leftMargin, infoBarY, pageWidth, 26).fill(COLORS.infoBg);
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COLORS.text);
    doc.text(`Receipt: ${pdfArgs.receiptNumber || "N/A"}`, leftMargin + 12, infoBarY + 7);
    doc.text(`Order: ${pdfArgs.orderNumber}`, leftMargin + pageWidth * 0.35, infoBarY + 7);
    doc.text(`Date: ${vars.formattedGiftDate}`, leftMargin + pageWidth * 0.65, infoBarY + 7);
    doc.restore();

    // Border below info bar
    doc.moveTo(leftMargin, infoBarY + 26).lineTo(leftMargin + pageWidth, infoBarY + 26)
        .strokeColor(COLORS.border).lineWidth(0.5).stroke();

    doc.y = infoBarY + 38;

    // ─── Section: Donor Information ────────────────────────
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(accent)
        .text("DONOR INFORMATION", leftMargin, doc.y);
    doc.y += 4;
    doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + pageWidth, doc.y)
        .strokeColor(COLORS.border).lineWidth(0.5).stroke();
    doc.y += 10;

    const donorInfoY = doc.y;
    const infoLabelWidth = 90;
    const colWidth = (pageWidth - 20) / 2;

    // Left column (Name & Email)
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COLORS.label)
        .text("Name:", leftMargin, donorInfoY, { width: infoLabelWidth });
    doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.text)
        .text(pdfArgs.customerName || "Valued Donor", leftMargin + infoLabelWidth, donorInfoY, { width: colWidth - infoLabelWidth });
    const nameEndY = doc.y;

    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COLORS.label)
        .text("Email:", leftMargin, nameEndY + 4, { width: infoLabelWidth });
    doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.text)
        .text(pdfArgs.customerEmail || "N/A", leftMargin + infoLabelWidth, nameEndY + 4, { width: colWidth - infoLabelWidth });
    const leftColEndY = doc.y;

    // Right column — Billing Address
    const rightColX = leftMargin + colWidth + 20;
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COLORS.label)
        .text("Billing Address:", rightColX, donorInfoY, { width: infoLabelWidth });

    const addressText = pdfArgs.billingAddress || "N/A";
    doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.text)
        .text(addressText, rightColX + infoLabelWidth, donorInfoY, { width: colWidth - infoLabelWidth });
    const rightColEndY = doc.y;

    // Move Y past the taller of left or right column
    doc.y = Math.max(leftColEndY, rightColEndY) + 14;

    // ─── Section: Donation Summary ─────────────────────────
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(accent)
        .text("DONATION SUMMARY", leftMargin, doc.y);
    doc.y += 4;
    doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + pageWidth, doc.y)
        .strokeColor(COLORS.border).lineWidth(0.5).stroke();
    doc.y += 8;

    const summaryItems: [string, string][] = [
        ["Campaign:", pdfArgs.campaignName || "General Donation"],
        ["Donation Type:", pdfArgs.donationType],
        ["Gift Date:", vars.formattedGiftDate],
    ];

    if (isVoided) {
        summaryItems.push(
            ["Cancellation Date:", vars.formattedCancelDate],
            ["Original Receipt:", pdfArgs.originalReceiptNumber || "N/A"]
        );
    }

    for (const [label, value] of summaryItems) {
        const itemY = doc.y;
        doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COLORS.label)
            .text(label, leftMargin, itemY, { width: infoLabelWidth });
        const labelEndY = doc.y;

        doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.text)
            .text(value, leftMargin + infoLabelWidth, itemY, { width: pageWidth - infoLabelWidth });
        const valueEndY = doc.y;

        doc.y = Math.max(labelEndY, valueEndY) + 4;
    }

    // ─── Amount Box ────────────────────────────────────────
    doc.y += 6;
    const amountBoxY = doc.y;
    const amountBoxHeight = isVoided ? 50 : 46;
    doc.save();
    doc.rect(leftMargin, amountBoxY, pageWidth, amountBoxHeight).fill(accentLight);
    doc.rect(leftMargin, amountBoxY, 4, amountBoxHeight).fill(accent);

    if (isVoided) {
        // Two columns: Original + Eligible
        doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.label)
            .text("ORIGINAL AMOUNT", leftMargin + 14, amountBoxY + 8);
        doc.font("Helvetica-Bold").fontSize(18).fillColor(COLORS.label)
            .text(vars.amountStr, leftMargin + 14, amountBoxY + 22, {
                characterSpacing: 0.5,
            });
        // Strikethrough line over original amount
        const origWidth = doc.widthOfString(vars.amountStr);
        doc.moveTo(leftMargin + 14, amountBoxY + 32)
            .lineTo(leftMargin + 14 + origWidth, amountBoxY + 32)
            .strokeColor(COLORS.label).lineWidth(1).stroke();

        const eligibleX = leftMargin + pageWidth / 2;
        doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.label)
            .text("ELIGIBLE AMOUNT", eligibleX, amountBoxY + 8);
        doc.font("Helvetica-Bold").fontSize(18).fillColor(COLORS.cancelPrimary)
            .text(vars.zeroAmountStr, eligibleX, amountBoxY + 22);
    } else {
        doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.label)
            .text("DONATION AMOUNT", leftMargin + 14, amountBoxY + 8, { characterSpacing: 0.5 });
        doc.font("Helvetica-Bold").fontSize(18).fillColor(accent)
            .text(vars.amountStr, leftMargin + 14, amountBoxY + 24);
    }
    doc.restore();
    doc.y = amountBoxY + amountBoxHeight + 14;

    // ─── Section: Acknowledgement ──────────────────────────
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(accent)
        .text(isVoided ? "CANCELLATION NOTICE" : "ACKNOWLEDGEMENT", leftMargin, doc.y);
    doc.y += 4;
    doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + pageWidth, doc.y)
        .strokeColor(COLORS.border).lineWidth(0.5).stroke();
    doc.y += 8;

    const acknowledgement = resolveAcknowledgement(pdfArgs, isVoided, vars);
    doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.text)
        .text(acknowledgement, leftMargin, doc.y, {
            width: pageWidth,
            lineGap: 3,
        });

    doc.y += 14;

    // ─── Signature Block ───────────────────────────────────
    doc.font("Helvetica-Oblique").fontSize(9).fillColor(COLORS.label)
        .text("Authorized by,", leftMargin, doc.y);
    doc.y += 4;
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COLORS.text)
        .text("Smart Donate Team", leftMargin, doc.y);
    doc.y += 2;
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.label)
        .text(vars.shopDisplayName, leftMargin, doc.y);
    doc.y += 16;

    // ─── Footer ────────────────────────────────────────────
    const footerY = Math.max(doc.y, doc.page.height - doc.page.margins.bottom - 35);
    doc.moveTo(leftMargin, footerY).lineTo(leftMargin + pageWidth, footerY)
        .strokeColor(COLORS.border).lineWidth(0.5).stroke();

    doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.footer);
    doc.text(
        "This receipt was generated by Smart Donate · Recurring & Receipts. Please retain this document for your records.",
        leftMargin, footerY + 6,
        { width: pageWidth, align: "center" }
    );

    if (isVoided) {
        doc.text(
            "VOID — This receipt has been cancelled and is not valid for tax deductions.",
            leftMargin, footerY + 16,
            { width: pageWidth, align: "center" }
        );
    } else {
        const footerNote = pdfArgs.footerNote || `Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`;
        doc.text(footerNote, leftMargin, footerY + 16, { width: pageWidth, align: "center" });
    }

    doc.end();
    return finished;
}
