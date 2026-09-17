import puppeteer from "puppeteer-core";
import {
    ReceiptPDFArgs,
    DEFAULT_DONATION_RECEIPT_TEMPLATE,
    DEFAULT_CANCEL_RECEIPT_TEMPLATE,
    DEFAULT_DONATION_LETTER_BODY,
    DEFAULT_CANCEL_LETTER_BODY,
    substituteReceiptVars,
    getEffectiveLogoUrl
} from "./receipt-shared";

export async function generateReceiptPDF(args: ReceiptPDFArgs): Promise<Buffer> {
    const isVoided = args.status === "cancelled" || args.status === "refunded";
    
    // Resolve effective logo URL (base64 Data URI)
    const logoUrl = getEffectiveLogoUrl(args.logoUrl);
    const pdfArgs = { ...args, logoUrl };

    let template = isVoided
        ? (pdfArgs.cancelAcknowledgementText || DEFAULT_CANCEL_RECEIPT_TEMPLATE)
        : (pdfArgs.acknowledgementText || DEFAULT_DONATION_RECEIPT_TEMPLATE);

    if (!template || !template.trim()) {
        template = isVoided ? DEFAULT_CANCEL_RECEIPT_TEMPLATE : DEFAULT_DONATION_RECEIPT_TEMPLATE;
    }

    const isHtml = /<[a-z][\s\S]*>/i.test(template);

    let htmlContent = "";
    if (isHtml) {
        htmlContent = template;
    } else {
        const defaultTemplate = isVoided ? DEFAULT_CANCEL_RECEIPT_TEMPLATE : DEFAULT_DONATION_RECEIPT_TEMPLATE;
        const formattedText = template.replace(/\n/g, "<br>");
        const defaultBodyPlaceholder = isVoided ? DEFAULT_CANCEL_LETTER_BODY : DEFAULT_DONATION_LETTER_BODY;

        // Wrap plain text in the default template's body placeholder
        if (defaultTemplate.includes("{{acknowledgement_text}}")) {
            htmlContent = defaultTemplate.replace("{{acknowledgement_text}}", formattedText);
        } else {
            htmlContent = defaultTemplate.replace("{{acknowledgement_text}}", defaultBodyPlaceholder);
        }
    }

    // Resolve any remaining placeholders in the template first
    if (htmlContent.includes("{{acknowledgement_text}}")) {
        const defaultBody = isVoided ? DEFAULT_CANCEL_LETTER_BODY : DEFAULT_DONATION_LETTER_BODY;
        htmlContent = htmlContent.replace("{{acknowledgement_text}}", defaultBody);
    }

    // Run variable substitution
    const finalHtml = substituteReceiptVars(htmlContent, pdfArgs);

    // Generate PDF using puppeteer-core pointing to pre-installed Google Chrome binary
    const browser = await puppeteer.launch({
        executablePath: "/usr/bin/google-chrome",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    try {
        const page = await browser.newPage();
        await page.setContent(finalHtml, { waitUntil: "load" });
        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true,
            margin: {
                top: "20px",
                bottom: "20px",
                left: "25px",
                right: "25px"
            }
        });
        return Buffer.from(pdfBuffer);
    } finally {
        await browser.close();
    }
}

