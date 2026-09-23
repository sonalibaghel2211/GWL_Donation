import { useState, useCallback, useEffect, useRef } from "react";
import type {
    ActionFunctionArgs,
    HeadersFunction,
    LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import { hasActiveSubscription } from "../utils/features";
import { Link } from "react-router";
import RichTextEditor from "../components/RichTextEditor";
import {
    DEFAULT_DONATION_RECEIPT_TEMPLATE,
    DEFAULT_CANCEL_RECEIPT_TEMPLATE,
    DEFAULT_DONATION_LETTER_BODY,
    DEFAULT_CANCEL_LETTER_BODY,
    substituteReceiptVars,
    getEffectiveLogoUrl,
} from "../utils/receipt-shared";

function getCurrencySymbol(currency?: string): string {
    const code = (currency || "USD").toUpperCase().trim();
    try {
        const formatter = new Intl.NumberFormat(undefined, {
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

// ─── Types ──────────────────────────────────────────────────
interface EmailSettings {
    contactEmail: string;
    ccEmail: string;
    logoUrl: string;
    receiptSubject: string;
    receiptBody: string;
    refundSubject: string;
    refundBody: string;
    cancelSubject: string;
    cancelBody: string;
    pauseSubject: string;
    pauseBody: string;
    resumeSubject: string;
    resumeBody: string;
    reminderSubject: string;
    reminderBody: string;
    recoverySubject: string;
    recoveryBody: string;
    notifyMerchantOnSubscriptionChange: boolean;
    receiptAcknowledgementText: string;
    receiptFooterNote: string;
    receiptCancelAcknowledgementText: string;
}

const DEFAULT_SETTINGS: EmailSettings = {
    contactEmail: "donations@yourstore.com",
    ccEmail: "",
    logoUrl: "",
    receiptSubject: "Thank you for your donation",
    receiptBody: `<h2 style="color:#008060;">Thank You for Your Donation ❤️</h2>

<p>Hello <strong>{{first_name}}</strong>,</p>

<p>We truly appreciate your generous contribution. Here are your donation details:</p>

<hr />

<p><strong>Donation Name:</strong> {{donation_name}}</p>
<p><strong>Order Number:</strong> {{orderNumber}}</p>
<p><strong>Date:</strong> {{date}}</p>
<p><strong>Amount:</strong> {{currency}}{{amount}}</p>

<hr />

<p>Your support helps us make a meaningful impact.</p>

<p>Thank you for your kindness ❤️</p>`,
    refundSubject: "Donation Refund Confirmation",
    refundBody: `<h2 style="color:#d82c0d;">Donation Refund Processed</h2>

<p>Hello <strong>{{first_name}}</strong>,</p>

<p>Your donation has been successfully refunded.</p>

<hr />

<p><strong>Donation Name:</strong> {{donation_name}}</p>
<p><strong>Order Number:</strong> {{orderNumber}}</p>
<p><strong>Refund Amount:</strong> {{currency}}{{amount}}</p>
<p><strong>Date:</strong> {{date}}</p>

<hr />

<p>The amount will reflect in your account within a few business days.</p>

<p>If you have any questions, feel free to contact us.</p>`,
    cancelSubject: "Donation Cancellation",
    cancelBody: `<h2 style="color:#6d7175;">Donation Cancelled</h2>

<p>Hello <strong>{{first_name}}</strong>,</p>

<p>Your donation has been cancelled successfully.</p>

<hr />

<p><strong>Donation Name:</strong> {{donation_name}}</p>
<p><strong>Order Number:</strong> {{orderNumber}}</p>
<p><strong>Amount:</strong> {{currency}}{{amount}}</p>
<p><strong>Date:</strong> {{date}}</p>

<hr />

<p>If this was not intended, please reach out to us.</p>

<p>We appreciate your support 🙏</p>`,
    pauseSubject: "Subscription Paused",
    pauseBody: `<h2 style="color:#92400e;">Subscription Paused</h2>

<p>Hello <strong>{{first_name}}</strong>,</p>

<p>Your subscription for <strong>{{donation_name}}</strong> has been paused.</p>

<hr />

<p><strong>Order Number:</strong> {{orderNumber}}</p>
<p><strong>Amount:</strong> {{currency}}{{amount}}</p>
<p><strong>Frequency:</strong> {{frequency}}</p>

<hr />

<p>You can resume your subscription at any time from your account management page.</p>

<p>Thank you for your support ❤️</p>`,
    resumeSubject: "Subscription Resumed",
    resumeBody: `<h2 style="color:#008060;">Subscription Resumed</h2>

<p>Hello <strong>{{first_name}}</strong>,</p>

<p>Your subscription for <strong>{{donation_name}}</strong> has been successfully resumed.</p>

<hr />

<p><strong>Order Number:</strong> {{orderNumber}}</p>
<p><strong>Amount:</strong> {{currency}}{{amount}}</p>
<p><strong>Frequency:</strong> {{frequency}}</p>
<p><strong>Next Billing Date:</strong> {{nextBillingDate}}</p>

<hr />

<p>We are glad to have you back!</p>

<p>Thank you for your continued support ❤️</p>`,
    reminderBody: `<h2 style="color:#6c4a79;">Donation Reminder ❤️</h2>
<p>Hello <strong>{{first_name}}</strong>,</p>
<p>This is a friendly reminder that your next donation of <strong>{{currency}}{{amount}}</strong> for <strong>{{donation_name}}</strong> is scheduled for {{nextBillingDate}}.</p>
<hr />
<p><strong>Frequency:</strong> {{frequency}}</p>
<p><strong>Amount:</strong> {{currency}}{{amount}}</p>
<hr />
<p>Thank you for your continued support! You can manage your subscription at any time using the link below.</p>`,
    recoverySubject: "Action Required: Your donation payment failed",
    recoveryBody: `<h2 style="color:#d82c0d;">Payment Failed ⚠️</h2>

<p>Hello <strong>{{first_name}}</strong>,</p>

<p>We're writing to let you know that we were unable to process your recurring donation of <strong>{{currency}}{{amount}}</strong> for <strong>{{donation_name}}</strong>.</p>

<p>Don't worry! We will automatically retry the payment in a few days. However, to ensure your donation continues without interruption, please verify your payment details in your account.</p>

<hr />

<p><strong>Reason:</strong> Payment method declined</p>
<p><strong>Amount:</strong> {{currency}}{{amount}}</p>
<p><strong>Next Retry:</strong> {{nextBillingDate}}</p>

<hr />

<p>You can update your payment information by clicking the button below:</p>

<p><a href="{{account_url}}" style="display:inline-block;padding:12px 24px;background:#51395c;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Update Payment Info</a></p>

<p>Thank you for your ongoing support!</p>`,
    notifyMerchantOnSubscriptionChange: false,
    receiptAcknowledgementText: DEFAULT_DONATION_RECEIPT_TEMPLATE,
    receiptFooterNote: "",
    receiptCancelAcknowledgementText: DEFAULT_CANCEL_RECEIPT_TEMPLATE,
    reminderSubject: "Upcoming Donation Reminder: {{amount}}",
};

// ─── Loader ─────────────────────────────────────────────────
export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session, admin } = await authenticate.admin(request);
    const shop = session.shop;

    let currencyCode = "USD";
    try {
        const currencyResponse = await admin.graphql(`query { shop { currencyCode } }`);
        const currencyData = await currencyResponse.json();
        if (currencyData.data?.shop?.currencyCode) {
            currencyCode = currencyData.data.shop.currencyCode;
        }
    } catch (e) {
        console.error("Error fetching shop currency in email settings loader:", e);
    }

    const settings = await prisma.emailSettings.findUnique({
        where: { shop },
    });

    const subscription = await prisma.planSubscription.findUnique({
        where: { shop },
    });

    return {
        settings: settings ?? { ...DEFAULT_SETTINGS },
        plan: subscription?.plan ?? "basic",
        subscription: subscription ? { plan: subscription.plan, status: subscription.status } : null,
        shop,
        currencyCode,
    };
};

// ─── Action ─────────────────────────────────────────────────
export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const formData = await request.formData();

    let logoUrl = (formData.get("logoUrl") as string) || "";
    if (logoUrl.startsWith("data:image/")) {
        try {
            const matches = logoUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
            if (matches) {
                const ext = matches[1] === "svg+xml" ? "svg" : matches[1];
                const base64Data = matches[2];
                const buffer = Buffer.from(base64Data, "base64");

                const fs = await import("fs/promises");
                const path = await import("path");

                // Ensure public/uploads exists
                const uploadsDir = path.join(process.cwd(), "public", "uploads");
                await fs.mkdir(uploadsDir, { recursive: true });

                const filename = `logo-${shop.replace(/[^a-zA-Z0-9]/g, "-")}.${ext}`;
                const filepath = path.join(uploadsDir, filename);
                await fs.writeFile(filepath, buffer);

                const requestUrl = new URL(request.url);
                logoUrl = `${requestUrl.origin}/uploads/${filename}`;
            }
        } catch (err) {
            console.error("Failed to save uploaded logo to disk:", err);
        }
    }

    const data = {
        contactEmail: (formData.get("contactEmail") as string) || DEFAULT_SETTINGS.contactEmail,
        ccEmail: (formData.get("ccEmail") as string) || "",
        logoUrl: logoUrl,
        receiptSubject: (formData.get("receiptSubject") as string) || DEFAULT_SETTINGS.receiptSubject,
        receiptBody: (formData.get("receiptBody") as string) || DEFAULT_SETTINGS.receiptBody,
        refundSubject: (formData.get("refundSubject") as string) || DEFAULT_SETTINGS.refundSubject,
        refundBody: (formData.get("refundBody") as string) || DEFAULT_SETTINGS.refundBody,
        cancelSubject: (formData.get("cancelSubject") as string) || DEFAULT_SETTINGS.cancelSubject,
        cancelBody: (formData.get("cancelBody") as string) || DEFAULT_SETTINGS.cancelBody,
        pauseSubject: (formData.get("pauseSubject") as string) || DEFAULT_SETTINGS.pauseSubject,
        pauseBody: (formData.get("pauseBody") as string) || DEFAULT_SETTINGS.pauseBody,
        resumeSubject: (formData.get("resumeSubject") as string) || DEFAULT_SETTINGS.resumeSubject,
        resumeBody: (formData.get("resumeBody") as string) || DEFAULT_SETTINGS.resumeBody,
        reminderSubject: (formData.get("reminderSubject") as string) || DEFAULT_SETTINGS.reminderSubject,
        reminderBody: (formData.get("reminderBody") as string) || DEFAULT_SETTINGS.reminderBody,
        recoverySubject: (formData.get("recoverySubject") as string) || DEFAULT_SETTINGS.recoverySubject,
        recoveryBody: (formData.get("recoveryBody") as string) || DEFAULT_SETTINGS.recoveryBody,
        notifyMerchantOnSubscriptionChange: formData.get("notifyMerchantOnSubscriptionChange") === "true",
        receiptAcknowledgementText: (formData.get("receiptAcknowledgementText") as string) || "",
        receiptFooterNote: (formData.get("receiptFooterNote") as string) || "",
        receiptCancelAcknowledgementText: (formData.get("receiptCancelAcknowledgementText") as string) || "",
    };

    await prisma.emailSettings.upsert({
        where: { shop },
        update: data,
        create: { shop, ...data },
    });

    return { status: "success" };
};

// ─── Component ──────────────────────────────────────────────
export default function EmailSettingsPage() {
    const loaderData = useLoaderData<typeof loader>();
    const { settings: savedSettings, plan, subscription } = loaderData;
    const fetcher = useFetcher<typeof action>();
    const shopify = useAppBridge();

    const [settings, setSettings] = useState<EmailSettings>({
        contactEmail: savedSettings.contactEmail,
        ccEmail: savedSettings.ccEmail || "",
        logoUrl: savedSettings.logoUrl || "",
        receiptSubject: savedSettings.receiptSubject,
        receiptBody: savedSettings.receiptBody || "",
        refundSubject: savedSettings.refundSubject,
        refundBody: savedSettings.refundBody || "",
        cancelSubject: savedSettings.cancelSubject,
        cancelBody: savedSettings.cancelBody || "",
        pauseSubject: savedSettings.pauseSubject || DEFAULT_SETTINGS.pauseSubject,
        pauseBody: savedSettings.pauseBody || DEFAULT_SETTINGS.pauseBody,
        resumeSubject: savedSettings.resumeSubject || DEFAULT_SETTINGS.resumeSubject,
        resumeBody: savedSettings.resumeBody || DEFAULT_SETTINGS.resumeBody,
        reminderSubject: savedSettings.reminderSubject || DEFAULT_SETTINGS.reminderSubject,
        reminderBody: savedSettings.reminderBody || DEFAULT_SETTINGS.reminderBody,
        recoverySubject: savedSettings.recoverySubject || DEFAULT_SETTINGS.recoverySubject,
        recoveryBody: savedSettings.recoveryBody || DEFAULT_SETTINGS.recoveryBody,
        notifyMerchantOnSubscriptionChange: savedSettings.notifyMerchantOnSubscriptionChange ?? false,
        receiptAcknowledgementText: (savedSettings as any).receiptAcknowledgementText || DEFAULT_DONATION_RECEIPT_TEMPLATE,
        receiptFooterNote: (savedSettings as any).receiptFooterNote || "",
        receiptCancelAcknowledgementText: (savedSettings as any).receiptCancelAcknowledgementText || DEFAULT_CANCEL_RECEIPT_TEMPLATE,
    });

    // Snapshot of initial settings for dirty-state detection
    const [initialSettings, setInitialSettings] = useState<EmailSettings>(() => ({ ...settings }));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [selectedTab, setSelectedTab] = useState("receipt");
    const [previewMode, setPreviewMode] = useState(false);
    const [receiptPreviewMode, setReceiptPreviewMode] = useState(false);
    const [previewingType, setPreviewingType] = useState<"donation" | "cancel" | null>(null);
    const [downloadingType, setDownloadingType] = useState<"donation" | "cancel" | null>(null);
    const [verticalSection, setVerticalSection] = useState<"emails" | "receipts">("emails");
    const [previewPdfUrl, setPreviewPdfUrl] = useState<string>("");

    const isSaving =
        fetcher.state === "submitting" && fetcher.formMethod === "POST";

    const lastHandledSubmissionRef = useRef<string | null>(null);
    useEffect(() => {
        if (fetcher.state === "idle" && fetcher.data?.status === "success") {
            const submissionKey = fetcher.data.status + (new Date().getTime()); // Simple unique key for this success
            
            // We want to trigger this only once per successful submission
            // Using a unique key from the data if possible, or just checking if we already handled this fetcher run
            if (lastHandledSubmissionRef.current !== "handled") {
                lastHandledSubmissionRef.current = "handled";
                shopify.toast.show(verticalSection === "receipts" ? "Receipt settings saved successfully" : "Email settings saved successfully");
                setInitialSettings({ ...settings });
            }
        } else if (fetcher.state === "submitting") {
            lastHandledSubmissionRef.current = "submitting";
        }
    }, [fetcher.state, fetcher.data, shopify, settings, verticalSection]);

    const hasChanges = Object.keys(settings).some(
        (key) => settings[key as keyof EmailSettings] !== initialSettings[key as keyof EmailSettings]
    );

    const buildReceiptPreviewHtml = useCallback(() => {
        const isCancel = selectedTab === "pdf-cancel";
        let template = isCancel
            ? (settings.receiptCancelAcknowledgementText || DEFAULT_CANCEL_RECEIPT_TEMPLATE)
            : (settings.receiptAcknowledgementText || DEFAULT_DONATION_RECEIPT_TEMPLATE);

        if (!template || !template.trim()) {
            template = isCancel ? DEFAULT_CANCEL_RECEIPT_TEMPLATE : DEFAULT_DONATION_RECEIPT_TEMPLATE;
        }

        const isHtml = /<[a-z][\s\S]*>/i.test(template);

        let htmlContent = "";
        if (isHtml) {
            htmlContent = template;
        } else {
            const defaultTemplate = isCancel ? DEFAULT_CANCEL_RECEIPT_TEMPLATE : DEFAULT_DONATION_RECEIPT_TEMPLATE;
            const formattedText = template.replace(/\n/g, "<br>");
            const defaultBodyPlaceholder = isCancel ? DEFAULT_CANCEL_LETTER_BODY : DEFAULT_DONATION_LETTER_BODY;

            if (defaultTemplate.includes("{{acknowledgement_text}}")) {
                htmlContent = defaultTemplate.replace("{{acknowledgement_text}}", formattedText);
            } else {
                htmlContent = defaultTemplate.replace("{{acknowledgement_text}}", defaultBodyPlaceholder);
            }
        }

        if (htmlContent.includes("{{acknowledgement_text}}")) {
            const defaultBody = isCancel ? DEFAULT_CANCEL_LETTER_BODY : DEFAULT_DONATION_LETTER_BODY;
            htmlContent = htmlContent.replace("{{acknowledgement_text}}", defaultBody);
        }

        const shopDisplayName = (loaderData as any)?.shop?.replace(".myshopify.com", "") || "Smart Donate Store";

        // Mock sample data
        const sampleArgs = {
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
            currencyCode: loaderData.currencyCode || "USD",
            status: isCancel ? "cancelled" : "active",
            receiptNumber: "RCP-PREVIEW",
            cancellationDate: new Date(),
            originalReceiptNumber: "RCP-ORIGINAL",
            logoUrl: settings.logoUrl || "",
            footerNote: settings.receiptFooterNote || `Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
        };

        return substituteReceiptVars(htmlContent, sampleArgs as any);
    }, [settings, selectedTab, loaderData]);

    const handlePreviewReceipt = useCallback(async (type: "donation" | "cancel") => {
        setPreviewingType(type);
        shopify.toast.show(`Generating ${type === "cancel" ? "cancellation" : "donation"} receipt preview...`);
        try {
            const response = await fetch(`/api/preview-receipt?type=${type}`);
            if (!response.ok) {
                const errorText = await response.text();
                shopify.toast.show(errorText || "Failed to generate receipt preview", { isError: true } as any);
                return;
            }
            const blob = await response.blob();
            const pdfBlob = new Blob([blob], { type: "application/pdf" });
            const blobUrl = URL.createObjectURL(pdfBlob);
            window.open(blobUrl, "_blank");
        } catch (err: any) {
            console.error("[PreviewReceipt] Error:", err);
            shopify.toast.show("Failed to open receipt preview", { isError: true } as any);
        } finally {
            setPreviewingType(null);
        }
    }, [shopify]);

    const handleDownloadReceipt = useCallback(async (type: "donation" | "cancel") => {
        setDownloadingType(type);
        shopify.toast.show(`Generating ${type === "cancel" ? "cancellation" : "donation"} receipt for download...`);
        try {
            const response = await fetch(`/api/preview-receipt?type=${type}`);
            if (!response.ok) {
                const errorText = await response.text();
                shopify.toast.show(errorText || "Failed to generate receipt for download", { isError: true } as any);
                return;
            }
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = `receipt-${type}-preview.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
            shopify.toast.show("Receipt downloaded successfully!");
        } catch (err: any) {
            console.error("[DownloadReceipt] Error:", err);
            shopify.toast.show("Failed to download receipt", { isError: true } as any);
        } finally {
            setDownloadingType(null);
        }
    }, [shopify]);

    // ─── Sample data for email preview ───────────────────────────────────────
    const SAMPLE_VARS: Record<string, string> = {
        first_name: "Jane",
        last_name: "Doe",
        email: "jane.doe@example.com",
        currency: getCurrencySymbol(loaderData.currencyCode || "USD"),
        amount: "25.00",
        orderNumber: "#1042",
        date: new Date().toLocaleDateString(),
        donation_name: "Children's Education Fund",
        frequency: "Monthly",
        nextBillingDate: new Date(Date.now() + 30 * 86400000).toLocaleDateString(),
        account_url: "#",
    };

    const substitutePreviewVars = (html: string) => {
        let result = html;
        Object.entries(SAMPLE_VARS).forEach(([key, val]) => {
            const regex = new RegExp(`\\{\\{(\\s*<[^>]*>\\s*)*${key}(\\s*<[^>]*>\\s*)*\\}\\}`, 'gi');
            if (key === "account_url") {
                result = result.replace(regex, val);
            } else {
                result = result.replace(regex, `<strong style="color:#6C4A79">${val}</strong>`);
            }
        });
        return result;
    };

    // Build the full preview email HTML (mirrors the sendgrid.server.ts structure)
    const buildPreviewHtml = () => {
        const body = substitutePreviewVars(
            selectedTab === "receipt" ? settings.receiptBody :
                selectedTab === "refund" ? settings.refundBody :
                    selectedTab === "cancel" ? settings.cancelBody :
                        selectedTab === "reminder" ? settings.reminderBody :
                            settings.recoveryBody
        );
        const effectiveLogo = getEffectiveLogoUrl(settings.logoUrl);
        const isValidLogo = effectiveLogo && effectiveLogo.trim() && effectiveLogo !== "null";
        return `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;line-height:1.6;">
                ${isValidLogo ? `<div style="margin-bottom:24px;"><img src="${effectiveLogo}" alt="Logo" style="max-height:50px;display:block;" /></div>` : ""}
                <div>${body}</div>
            </div>
        `;
    };


    const validate = () => {
        const newErrors: Record<string, string> = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!settings.contactEmail) {
            newErrors.contactEmail = "Contact email is required";
        } else if (!emailRegex.test(settings.contactEmail)) {
            newErrors.contactEmail = "Invalid email format";
        }

        if (settings.ccEmail && !emailRegex.test(settings.ccEmail)) {
            newErrors.ccEmail = "Invalid CC email format";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSettingChange = useCallback(
        (field: keyof EmailSettings, value: any) => {
            setSettings((prev) => ({ ...prev, [field]: value }));
            if (errors[field]) {
                setErrors(prev => {
                    const next = { ...prev };
                    delete next[field];
                    return next;
                });
            }
        },
        [errors],
    );

    const handleSave = useCallback(() => {
        if (!validate()) {
            shopify.toast.show("Please fix the errors before saving", { isError: true });
            return;
        }
        const formData = new FormData();
        Object.entries(settings).forEach(([key, value]) => {
            formData.append(key, value);
        });
        fetcher.submit(formData, { method: "POST" });
    }, [settings, fetcher, shopify]);

    const handleRestoreDefault = useCallback(() => {
        if (selectedTab === "receipt") {
            setSettings(prev => ({
                ...prev,
                receiptSubject: DEFAULT_SETTINGS.receiptSubject,
                receiptBody: DEFAULT_SETTINGS.receiptBody
            }));
            shopify.toast.show("Restored default format for Donation Receipt Email");
        } else if (selectedTab === "refund") {
            setSettings(prev => ({
                ...prev,
                refundSubject: DEFAULT_SETTINGS.refundSubject,
                refundBody: DEFAULT_SETTINGS.refundBody
            }));
            shopify.toast.show("Restored default format for Donation Refund Email");
        } else if (selectedTab === "cancel") {
            setSettings(prev => ({
                ...prev,
                cancelSubject: DEFAULT_SETTINGS.cancelSubject,
                cancelBody: DEFAULT_SETTINGS.cancelBody
            }));
            shopify.toast.show("Restored default format for Donation Cancellation Email");
        } else if (selectedTab === "reminder") {
            setSettings(prev => ({
                ...prev,
                reminderSubject: DEFAULT_SETTINGS.reminderSubject,
                reminderBody: DEFAULT_SETTINGS.reminderBody
            }));
            shopify.toast.show("Restored default format for Donation Reminder Email");
        } else if (selectedTab === "recovery") {
            setSettings(prev => ({
                ...prev,
                recoverySubject: DEFAULT_SETTINGS.recoverySubject,
                recoveryBody: DEFAULT_SETTINGS.recoveryBody
            }));
            shopify.toast.show("Restored default format for Payment Recovery Email");
        } else if (selectedTab === "pdf-donation") {
            setSettings(prev => ({
                ...prev,
                receiptAcknowledgementText: DEFAULT_DONATION_RECEIPT_TEMPLATE
            }));
            shopify.toast.show("Restored default format for PDF Donation Receipt");
        } else if (selectedTab === "pdf-cancel") {
            setSettings(prev => ({
                ...prev,
                receiptCancelAcknowledgementText: DEFAULT_CANCEL_RECEIPT_TEMPLATE
            }));
            shopify.toast.show("Restored default format for PDF Cancellation Receipt");
        }
    }, [selectedTab, shopify]);

    const isInvalid = Object.keys(errors).length > 0;

    return (
        <s-page heading="Email Configuration Settings">
            <s-button
                slot="primary-action"
                variant="primary"
                onClick={handleSave}
                disabled={isSaving || !hasChanges || isInvalid}
                {...(isSaving ? { loading: true } : {})}
            >
                {isSaving ? "Saving..." : (hasChanges ? "Save" : "No Changes")}
            </s-button>

            <div style={{ display: "flex", gap: "24px", marginTop: "16px" }}>
                <div style={{ flex: "0 0 250px", display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div style={{ background: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid #e1e3e5", display: "flex", flexDirection: "column", gap: "8px" }}>
                        <button
                            type="button"
                            onClick={() => {
                                setVerticalSection("emails");
                                setSelectedTab("receipt");
                            }}
                            style={{
                                display: "flex", alignItems: "center", gap: "10px",
                                width: "100%", padding: "10px 12px", border: "none",
                                borderRadius: "6px", background: verticalSection === "emails" ? "#f1ecf4" : "transparent",
                                color: verticalSection === "emails" ? "#6C4A79" : "#202223",
                                fontWeight: verticalSection === "emails" ? "600" : "500",
                                fontSize: "13px", textAlign: "left", cursor: "pointer",
                                transition: "all 0.2s ease"
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            Emails
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setVerticalSection("receipts");
                                setSelectedTab("pdf-donation");
                            }}
                            style={{
                                display: "flex", alignItems: "center", gap: "10px",
                                width: "100%", padding: "10px 12px", border: "none",
                                borderRadius: "6px", background: verticalSection === "receipts" ? "#f1ecf4" : "transparent",
                                color: verticalSection === "receipts" ? "#6C4A79" : "#202223",
                                fontWeight: verticalSection === "receipts" ? "600" : "500",
                                fontSize: "13px", textAlign: "left", cursor: "pointer",
                                transition: "all 0.2s ease"
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            Receipts
                        </button>
                    </div>

                    <s-text color="subdued">
                        Configure either automated transactional emails or print-ready PDF receipt templates for your store's donation operations.
                    </s-text>
                </div>

                <div style={{ flex: 1 }}>
                    <s-box padding="large-200" borderWidth="base" borderRadius="large-100" background="subdued">
                        <s-stack direction="block" gap="large-200">

                            {/* General Settings */}
                            {verticalSection === "emails" && (
                                <s-box>
                                    <div style={{ marginBottom: "16px" }}>
                                        <s-text-field
                                            label="Your Contact Email"
                                            value={settings.contactEmail}
                                            error={errors.contactEmail}
                                            onChange={(e: any) => handleSettingChange("contactEmail", e.target.value)}
                                        />
                                        <div style={{ marginTop: "4px" }}>
                                            <s-text color="subdued">Customers who reply to the email will reach you at this address.</s-text>
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: "16px" }}>
                                        <s-text-field
                                            label="Additional/CC Email ID (Optional)"
                                            value={settings.ccEmail}
                                            error={errors.ccEmail}
                                            onChange={(e: any) => handleSettingChange("ccEmail", e.target.value)}
                                        />
                                    </div>
                                    <div style={{ marginBottom: "16px", padding: "12px", background: "#f8f9fa", borderRadius: "8px", border: "1px solid #e1e3e5" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <input 
                                                type="checkbox" 
                                                id="notifyMerchantOnSubscriptionChange"
                                                checked={settings.notifyMerchantOnSubscriptionChange}
                                                onChange={(e) => handleSettingChange("notifyMerchantOnSubscriptionChange", e.target.checked)}
                                                style={{ width: "18px", height: "18px", cursor: "pointer" }}
                                            />
                                            <label htmlFor="notifyMerchantOnSubscriptionChange" style={{ fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
                                                Receive subscription status change notifications
                                            </label>
                                        </div>
                                        <div style={{ marginTop: "4px", marginLeft: "28px" }}>
                                            <s-text color="subdued" {...{ size: "small" } as any}>Get an email whenever a customer pauses, resumes, or cancels their recurring donation.</s-text>
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: "16px" }}>
                                        <div style={{ marginBottom: "8px" }}>
                                            <strong>Email Logo (Optional)</strong>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                            {settings.logoUrl && (
                                                <div style={{ padding: "8px", border: "1px solid #e1e3e5", borderRadius: "6px", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "80px" }}>
                                                    <img 
                                                        src={settings.logoUrl} 
                                                        alt="Logo Preview" 
                                                        style={{ maxHeight: "45px", maxWidth: "150px", objectFit: "contain", display: "block" }} 
                                                    />
                                                </div>
                                            )}
                                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                <s-button onClick={() => document.getElementById('logo-upload')?.click()}>
                                                    {settings.logoUrl ? "Change Logo" : "Upload Logo"}
                                                </s-button>
                                                <input
                                                    id="logo-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    style={{ display: "none" }}
                                                    onChange={(e: any) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            if (file.size > 1024 * 1024) { // 1MB limit for base64
                                                                shopify.toast.show("File too large. Please use an image under 1MB.");
                                                                return;
                                                            }
                                                            const reader = new FileReader();
                                                            reader.onload = (event: any) => {
                                                                handleSettingChange("logoUrl", event.target.result);
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />
                                                {settings.logoUrl && (
                                                    <s-button variant="tertiary" tone="critical" onClick={() => handleSettingChange("logoUrl", "")}>
                                                        Remove
                                                    </s-button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </s-box>
                            )}

                                {/* Template Tabs & Content */}
                                <s-box>
                                {verticalSection === "emails" ? (
                                    <>
                                        <div className="polaris-tabs">
                                            <div className="polaris-tabs-list" role="tablist">
                                                {[
                                                    { id: "receipt", label: "Receipt Template" },
                                                    { id: "refund", label: "Refund Template" },
                                                    { id: "cancel", label: "Cancellation Template" },
                                                    { id: "reminder", label: "Reminder Template" },
                                                    { id: "recovery", label: "Recovery Template" },
                                                ].map((tab) => (
                                                    <button
                                                        key={tab.id}
                                                        type="button"
                                                        role="tab"
                                                        aria-selected={selectedTab === tab.id}
                                                        className={`polaris-tab ${selectedTab === tab.id ? "active" : ""}`}
                                                        onClick={() => setSelectedTab(tab.id)}
                                                    >
                                                        {tab.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <s-stack direction="block" gap="base">
                                            {(selectedTab === "receipt" && !hasActiveSubscription(subscription, "canSendReceiptEmail")) ||
                                            (selectedTab === "refund" && !hasActiveSubscription(subscription, "canSendRefundEmail")) ||
                                            (selectedTab === "cancel" && !hasActiveSubscription(subscription, "canSendCancelEmail")) ||
                                            (selectedTab === "reminder" && !hasActiveSubscription(subscription, "canSendReminders")) ? (
                                                <s-box padding="large-200" background="subdued" borderRadius="base" borderWidth="base">
                                                    <s-stack direction="block" gap="base">
                                                        <div style={{ textAlign: "center", width: "100%" }}>
                                                            <s-text type="strong">Plan Upgrade Required</s-text>
                                                            <s-box padding-block-start="base">
                                                                <s-text color="subdued">
                                                                    The {selectedTab} email feature is available on the
                                                                    <strong> {selectedTab === "cancel" ? "Pro" : "Advanced"}</strong> plan and above.
                                                                </s-text>
                                                            </s-box>
                                                            <s-box padding-block-start="base">
                                                                <Link to="/app/pricing" style={{ textDecoration: "none" }}>
                                                                    <s-button variant="primary">View Pricing Plans</s-button>
                                                                </Link>
                                                            </s-box>
                                                        </div>
                                                    </s-stack>
                                                </s-box>
                                            ) : (
                                                <>
                                                    <s-text-field
                                                        label="Email Subject Line"
                                                        disabled={!hasActiveSubscription(subscription, "canEditTemplates")}
                                                        value={
                                                            selectedTab === "receipt" ? settings.receiptSubject :
                                                                selectedTab === "refund" ? settings.refundSubject :
                                                                    selectedTab === "cancel" ? settings.cancelSubject :
                                                                        selectedTab === "reminder" ? settings.reminderSubject :
                                                                            settings.recoverySubject
                                                        }
                                                        onInput={(e: any) => handleSettingChange(
                                                            selectedTab === "receipt" ? "receiptSubject" :
                                                                selectedTab === "refund" ? "refundSubject" :
                                                                    selectedTab === "cancel" ? "cancelSubject" :
                                                                        selectedTab === "reminder" ? "reminderSubject" :
                                                                            "recoverySubject",
                                                            e.target.value
                                                        )}
                                                    />

                                                    <div>
                                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                                            <span style={{ fontWeight: 500 }}>Email Template</span>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                                {!hasActiveSubscription(subscription, "canEditTemplates") && (
                                                                    <s-badge tone="caution">View Only</s-badge>
                                                                )}
                                                                {hasActiveSubscription(subscription, "canEditTemplates") && !previewMode && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleRestoreDefault}
                                                                        style={{
                                                                            display: "inline-flex", alignItems: "center", gap: "6px",
                                                                            padding: "5px 12px", border: "1px solid #d32f2f",
                                                                            borderRadius: "6px", background: "#fff",
                                                                            color: "#d32f2f",
                                                                            fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease",
                                                                        }}
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                                                                        Restore Default
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPreviewMode(p => !p)}
                                                                    style={{
                                                                        display: "inline-flex", alignItems: "center", gap: "6px",
                                                                        padding: "5px 12px", border: "1px solid #6C4A79",
                                                                        borderRadius: "6px", background: previewMode ? "#6C4A79" : "#fff",
                                                                        color: previewMode ? "#fff" : "#6C4A79",
                                                                        fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease",
                                                                    }}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                                                    {previewMode ? "Back to Edit" : "Preview Email"}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div style={{ padding: "12px", background: "#f4f6f8", borderRadius: "4px", fontSize: "13px", marginBottom: "12px", color: "#5c5f62" }}>
                                                            <strong>Available Variables:</strong>{" "}
                                                            <code>{`{{first_name}}`}</code>, <code>{`{{last_name}}`}</code>, <code>{`{{email}}`}</code>, <code>{`{{currency}}`}</code>, <code>{`{{amount}}`}</code>, <code>{`{{orderNumber}}`}</code>, <code>{`{{date}}`}</code>, <code>{`{{donation_name}}`}</code>, <code>{`{{frequency}}`}</code>, <code>{`{{nextBillingDate}}`}</code>
                                                        </div>

                                                        {previewMode ? (
                                                            <div style={{ border: "1px solid #e1e3e5", borderRadius: "8px", overflow: "hidden" }}>
                                                                <div style={{ background: "#f8f9fa", borderBottom: "1px solid #e1e3e5", padding: "10px 16px", fontSize: "12px", color: "#6D7175" }}>
                                                                    <div style={{ display: "grid", gridTemplateColumns: "50px 1fr", gap: "4px", lineHeight: 1.8 }}>
                                                                        <span style={{ fontWeight: 600 }}>From:</span><span>Smart Donate &lt;donations@yourstore.com&gt;</span>
                                                                        <span style={{ fontWeight: 600 }}>To:</span><span>jane.doe@example.com</span>
                                                                        <span style={{ fontWeight: 600 }}>Subj:</span>
                                                                        <span style={{ color: "#202223", fontWeight: 600 }}>
                                                                            {substitutePreviewVars(
                                                                                selectedTab === "receipt" ? settings.receiptSubject :
                                                                                    selectedTab === "refund" ? settings.refundSubject :
                                                                                        selectedTab === "cancel" ? settings.cancelSubject :
                                                                                            selectedTab === "reminder" ? settings.reminderSubject :
                                                                                                settings.recoverySubject
                                                                            ).replace(/<[^>]+>/g, "")}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div style={{ background: "#f3f4f6", padding: "16px" }}>
                                                                    <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                                                                        <iframe
                                                                            title="Email body preview"
                                                                            sandbox="allow-same-origin"
                                                                            srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#333;line-height:1.6}img{max-width:100%;height:auto}</style></head><body>${buildPreviewHtml()}</body></html>`}
                                                                            style={{ width: "100%", minHeight: "320px", border: "none", display: "block", borderRadius: "8px" }}
                                                                            onLoad={(e) => {
                                                                                try {
                                                                                    const h = (e.currentTarget as HTMLIFrameElement).contentDocument?.body?.scrollHeight;
                                                                                    if (h) (e.currentTarget as HTMLIFrameElement).style.height = (h + 40) + 'px';
                                                                                } catch { /* ignore */ }
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div style={{ background: "#f8f9fa", borderTop: "1px solid #e1e3e5", padding: "8px 16px", fontSize: "11px", color: "#6D7175", textAlign: "center" }}>
                                                                    Preview uses sample data: <strong>Jane Doe</strong>, <strong>$25.00</strong>, Order <strong>#1042</strong>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {!hasActiveSubscription(subscription, "canEditTemplates") && (
                                                                    <div style={{ marginBottom: "12px" }}>
                                                                        <s-banner tone="info">
                                                                            <div slot="title">Custom Templates Locked</div>
                                                                            <p>Upgrade to the <strong>Pro</strong> plan to customize your email templates with dynamic variables.</p>
                                                                        </s-banner>
                                                                    </div>
                                                                )}

                                                                <RichTextEditor
                                                                    disabled={!hasActiveSubscription(subscription, "canEditTemplates")}
                                                                    value={
                                                                        selectedTab === "receipt" ? settings.receiptBody :
                                                                            selectedTab === "refund" ? settings.refundBody :
                                                                                selectedTab === "cancel" ? settings.cancelBody :
                                                                                    selectedTab === "reminder" ? settings.reminderBody :
                                                                                        settings.recoveryBody
                                                                    }
                                                                    onChange={(value: string) => handleSettingChange(
                                                                        selectedTab === "receipt" ? "receiptBody" :
                                                                            selectedTab === "refund" ? "refundBody" :
                                                                                selectedTab === "cancel" ? "cancelBody" :
                                                                                    selectedTab === "reminder" ? "reminderBody" :
                                                                                        "recoveryBody",
                                                                        value
                                                                    )}
                                                                />
                                                            </>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </s-stack>
                                    </>
                                ) : (
                                    <>
                                        <div className="polaris-tabs">
                                            <div className="polaris-tabs-list" role="tablist">
                                                {[
                                                    { id: "pdf-donation", label: "Donation Receipt" },
                                                    { id: "pdf-cancel", label: "Cancellation Receipt" },
                                                ].map((tab) => (
                                                    <button
                                                        key={tab.id}
                                                        type="button"
                                                        role="tab"
                                                        aria-selected={selectedTab === tab.id}
                                                        className={`polaris-tab ${selectedTab === tab.id ? "active" : ""}`}
                                                        onClick={() => setSelectedTab(tab.id)}
                                                    >
                                                        {tab.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <s-stack direction="block" gap="base">
                                            {!hasActiveSubscription(subscription, "canDownloadReceipt") && (
                                                <s-box padding="large-200" background="subdued" borderRadius="base" borderWidth="base" style={{ marginBottom: "16px" }}>
                                                    <s-stack direction="block" gap="base">
                                                        <div style={{ textAlign: "center", width: "100%" }}>
                                                            <s-text type="strong">Plan Upgrade Required</s-text>
                                                            <s-box padding-block-start="base">
                                                                <s-text color="subdued">
                                                                    PDF receipt downloads and customization are available on the <strong>Advanced</strong> and <strong>Pro</strong> plans.
                                                                </s-text>
                                                            </s-box>
                                                            <s-box padding-block-start="base">
                                                                <Link to="/app/pricing" style={{ textDecoration: "none" }}>
                                                                    <s-button variant="primary">View Pricing Plans</s-button>
                                                                </Link>
                                                            </s-box>
                                                        </div>
                                                    </s-stack>
                                                </s-box>
                                            )}
                                            <div style={{ padding: "4px 0" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                                    <span style={{ fontWeight: 500 }}>
                                                        {selectedTab === "pdf-donation" ? "Donation Receipt Template" : "Cancellation Receipt Template"}
                                                    </span>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                        {!hasActiveSubscription(subscription, "canEditTemplates") && (
                                                            <s-badge tone="caution">View Only</s-badge>
                                                        )}
                                                        {hasActiveSubscription(subscription, "canEditTemplates") && !receiptPreviewMode && (
                                                            <button
                                                                type="button"
                                                                onClick={handleRestoreDefault}
                                                                style={{
                                                                    display: "inline-flex", alignItems: "center", gap: "6px",
                                                                    padding: "5px 12px", border: "1px solid #d32f2f",
                                                                    borderRadius: "6px", background: "#fff",
                                                                    color: "#d32f2f",
                                                                    fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease",
                                                                }}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                                                                Restore Default
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => setReceiptPreviewMode(p => !p)}
                                                            style={{
                                                                display: "inline-flex", alignItems: "center", gap: "6px",
                                                                padding: "5px 12px", border: "1px solid #6C4A79",
                                                                borderRadius: "6px", background: receiptPreviewMode ? "#6C4A79" : "#fff",
                                                                color: receiptPreviewMode ? "#fff" : "#6C4A79",
                                                                fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease",
                                                            }}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                                            {receiptPreviewMode ? "Back to Edit" : "Preview HTML"}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div style={{ marginBottom: "16px", padding: "12px", background: selectedTab === "pdf-donation" ? "#f8f0fc" : "#fee2e2", borderRadius: "8px", border: selectedTab === "pdf-donation" ? "1px solid #e1d5eb" : "1px solid #fecaca", fontSize: "13px", color: selectedTab === "pdf-donation" ? "#5c5f62" : "#991b1b" }}>
                                                    <strong>Customize Receipt Template</strong>
                                                    <div style={{ marginTop: "6px" }}>Use variables: <code>{`{{first_name}}`}</code>, <code>{`{{customer_name}}`}</code>, <code>{`{{customer_email}}`}</code>, <code>{`{{amount}}`}</code>, <code>{`{{donation_type}}`}</code>, <code>{`{{shop_name}}`}</code>, <code>{`{{date}}`}</code>, <code>{`{{order_number}}`}</code>, <code>{`{{receipt_number}}`}</code>{selectedTab === "pdf-cancel" && <>, <code>{`{{cancel_date}}`}</code>, <code>{`{{original_receipt_number}}`}</code></>}</div>
                                                </div>

                                                {receiptPreviewMode ? (
                                                    <div style={{ border: "1px solid #e1e3e5", borderRadius: "8px", overflow: "hidden", background: "#f3f4f6", padding: "16px" }}>
                                                        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                                                            <iframe
                                                                title="Receipt HTML preview"
                                                                sandbox="allow-same-origin"
                                                                srcDoc={buildReceiptPreviewHtml()}
                                                                style={{ width: "100%", minHeight: "450px", border: "none", display: "block", borderRadius: "8px" }}
                                                                onLoad={(e) => {
                                                                    try {
                                                                        const h = (e.currentTarget as HTMLIFrameElement).contentDocument?.body?.scrollHeight;
                                                                        if (h) (e.currentTarget as HTMLIFrameElement).style.height = (h + 40) + 'px';
                                                                    } catch { /* ignore */ }
                                                                }}
                                                            />
                                                        </div>
                                                        <div style={{ background: "#f8f9fa", borderTop: "1px solid #e1e3e5", padding: "8px 16px", marginTop: "12px", borderRadius: "4px", fontSize: "11px", color: "#6D7175", textAlign: "center" }}>
                                                            Preview uses sample data: <strong>Jane Doe</strong>, <strong>$25.00</strong>, Order <strong>#1042</strong>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <RichTextEditor
                                                        disabled={!hasActiveSubscription(subscription, "canEditTemplates")}
                                                        value={
                                                            selectedTab === "pdf-donation"
                                                                ? settings.receiptAcknowledgementText
                                                                : settings.receiptCancelAcknowledgementText
                                                        }
                                                        onChange={(value: string) =>
                                                            handleSettingChange(
                                                                selectedTab === "pdf-donation"
                                                                    ? "receiptAcknowledgementText"
                                                                    : "receiptCancelAcknowledgementText",
                                                                value
                                                            )
                                                        }
                                                    />
                                                )}

                                                <div style={{ marginTop: "20px", marginBottom: "20px" }}>
                                                    <label style={{ display: "block", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>Custom Footer Note</label>
                                                    <div style={{ fontSize: "12px", color: "#6D7175", marginBottom: "8px" }}>Replaces the generated date/info line at the bottom of the PDF. Shared across all receipt types.</div>
                                                    <input
                                                        type="text"
                                                        value={settings.receiptFooterNote}
                                                        onChange={(e) => handleSettingChange("receiptFooterNote", e.target.value)}
                                                        placeholder={`Generated by {{shop_name}} on {{date}}`}
                                                        style={{ width: "100%", padding: "8px 12px", border: "1px solid #c9cccf", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box", fontFamily: "inherit" }}
                                                    />
                                                </div>

                                                <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e1e3e5", display: "flex", gap: "12px", alignItems: "center" }}>
                                                    <button
                                                        type="button"
                                                        disabled={previewingType !== null || downloadingType !== null}
                                                        onClick={() => handlePreviewReceipt(selectedTab === "pdf-donation" ? "donation" : "cancel")}
                                                        style={{
                                                            display: "inline-flex", alignItems: "center", gap: "8px",
                                                            padding: "10px 20px", background: selectedTab === "pdf-donation" ? "#6C4A79" : "#b91c1c", color: "#fff",
                                                            border: "none", borderRadius: "8px", fontWeight: 600,
                                                            fontSize: "13px", cursor: (previewingType !== null || downloadingType !== null) ? "wait" : "pointer",
                                                            opacity: (previewingType !== null || downloadingType !== null) ? 0.7 : 1,
                                                        }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                                        {previewingType === (selectedTab === "pdf-donation" ? "donation" : "cancel") ? "Opening Preview..." : "Preview PDF Receipt"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={previewingType !== null || downloadingType !== null}
                                                        onClick={() => handleDownloadReceipt(selectedTab === "pdf-donation" ? "donation" : "cancel")}
                                                        style={{
                                                            display: "inline-flex", alignItems: "center", gap: "8px",
                                                            padding: "9px 20px", background: "#fff", color: selectedTab === "pdf-donation" ? "#6C4A79" : "#b91c1c",
                                                            border: selectedTab === "pdf-donation" ? "1px solid #6C4A79" : "1px solid #b91c1c", borderRadius: "8px", fontWeight: 600,
                                                            fontSize: "13px", cursor: (previewingType !== null || downloadingType !== null) ? "wait" : "pointer",
                                                            opacity: (previewingType !== null || downloadingType !== null) ? 0.7 : 1,
                                                        }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                        {downloadingType === (selectedTab === "pdf-donation" ? "donation" : "cancel") ? "Downloading..." : "Download PDF"}
                                                    </button>
                                                </div>
                                            </div>
                                        </s-stack>
                                    </>
                                )}
                            </s-box>

                        </s-stack>
                    </s-box>
                </div>
            </div>
            <style>{`
                .polaris-tabs {
                  border-bottom: 1px solid #dfe3e8;
                  margin-bottom: 20px;
                }
                .polaris-tabs-list {
                  display: flex;
                  gap: 0;
                  overflow-x: auto;
                }
                .polaris-tab {
                  padding: 12px 16px;
                  background: none;
                  border: none;
                  border-bottom: 3px solid transparent;
                  color: #000000;
                  font-size: 14px;
                  font-weight: 500;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  white-space: nowrap;
                }
                .polaris-tab:hover {
                  color: #6C4A79;
                }
                .polaris-tab.active {
                  color: #6C4A79;
                  border-bottom-color: #6C4A79;
                }
            `}</style>
        </s-page>
    );
}

export const headers: HeadersFunction = (headersArgs) => {
    return boundary.headers(headersArgs);
};
