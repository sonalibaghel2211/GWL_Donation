import { useState, useCallback, useEffect } from "react";
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
import { checkFeatureAccess } from "../utils/features";
import { Link } from "react-router";
import RichTextEditor from "../components/RichTextEditor";

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
};

// ─── Loader ─────────────────────────────────────────────────
export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    const settings = await prisma.emailSettings.findUnique({
        where: { shop },
    });

    const subscription = await prisma.planSubscription.findUnique({
        where: { shop },
    });

    return {
        settings: settings ?? { ...DEFAULT_SETTINGS },
        plan: subscription?.plan ?? "basic",
        shop,
    };
};

// ─── Action ─────────────────────────────────────────────────
export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const formData = await request.formData();

    const data = {
        contactEmail: (formData.get("contactEmail") as string) || DEFAULT_SETTINGS.contactEmail,
        ccEmail: (formData.get("ccEmail") as string) || "",
        logoUrl: (formData.get("logoUrl") as string) || "",
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
    const { settings: savedSettings, plan } = useLoaderData<typeof loader>();
    const fetcher = useFetcher<typeof action>();
    const shopify = useAppBridge();

    const [settings, setSettings] = useState<EmailSettings>({
        contactEmail: savedSettings.contactEmail,
        ccEmail: savedSettings.ccEmail || "",
        logoUrl: savedSettings.logoUrl || "",
        receiptSubject: savedSettings.receiptSubject,
        receiptBody: savedSettings.receiptBody,
        refundSubject: savedSettings.refundSubject,
        refundBody: savedSettings.refundBody,
        cancelSubject: savedSettings.cancelSubject,
        cancelBody: savedSettings.cancelBody,
        pauseSubject: savedSettings.pauseSubject || DEFAULT_SETTINGS.pauseSubject,
        pauseBody: savedSettings.pauseBody || DEFAULT_SETTINGS.pauseBody,
        resumeSubject: savedSettings.resumeSubject || DEFAULT_SETTINGS.resumeSubject,
        resumeBody: savedSettings.resumeBody || DEFAULT_SETTINGS.resumeBody,
    });

    // Snapshot of initial settings for dirty-state detection
    const [initialSettings] = useState<EmailSettings>(() => ({ ...settings }));

    const hasChanges = Object.keys(settings).some(
        (key) => settings[key as keyof EmailSettings] !== initialSettings[key as keyof EmailSettings]
    );

    const [selectedTab, setSelectedTab] = useState("receipt");

    const isSaving =
        fetcher.state === "submitting" && fetcher.formMethod === "POST";

    useEffect(() => {
        if (fetcher.data?.status === "success") {
            shopify.toast.show("Email settings saved successfully");
        }
    }, [fetcher.data, shopify]);

    const handleSettingChange = useCallback(
        (field: keyof EmailSettings, value: string) => {
            setSettings((prev) => ({ ...prev, [field]: value }));
        },
        [],
    );

    const handleSave = useCallback(() => {
        const formData = new FormData();
        Object.entries(settings).forEach(([key, value]) => {
            formData.append(key, value);
        });
        fetcher.submit(formData, { method: "POST" });
    }, [settings, fetcher]);

    return (
        <s-page heading="Email Configuration Settings">
            <s-button
                slot="primary-action"
                variant="primary"
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                {...(isSaving ? { loading: true } : {})}
            >
                {isSaving ? "Saving..." : (hasChanges ? "Save" : "No Changes")}
            </s-button>

            <div style={{ display: "flex", gap: "24px", marginTop: "16px" }}>
                <div style={{ flex: "0 0 250px" }}>
                    <s-text color="subdued">
                        Configure the email settings for the donation section. Ensure all fields are filled out correctly for proper functioning.
                    </s-text>
                </div>

                <div style={{ flex: 1 }}>
                    <s-box padding="large-200" borderWidth="base" borderRadius="large-100" background="subdued">
                        <s-stack direction="block" gap="large-200">

                            {/* General Settings */}
                            <s-box>
                                <div style={{ marginBottom: "16px" }}>
                                    <s-text-field
                                        label="Your Contact Email"
                                        value={settings.contactEmail}
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
                                        onChange={(e: any) => handleSettingChange("ccEmail", e.target.value)}
                                    />
                                </div>
                                <div style={{ marginBottom: "16px" }}>
                                    <div style={{ marginBottom: "8px" }}>
                                        <strong>Email Logo (Optional)</strong>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <s-button onClick={() => document.getElementById('logo-upload')?.click()}>
                                            Upload Logo
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
                                    {settings.logoUrl && (
                                        <div style={{ marginTop: "12px", padding: "12px", background: "#fff", borderRadius: "4px", border: "1px solid #eee", display: "inline-block" }}>
                                            <img src={settings.logoUrl} alt="Logo Preview" style={{ maxHeight: "60px", display: "block" }} />
                                        </div>
                                    )}
                                </div>
                            </s-box>

                            {/* Template Tabs */}
                            <s-box>
                                <div className="polaris-tabs">
                                    <div className="polaris-tabs-list" role="tablist">
                                        {[
                                            { id: "receipt", label: "Receipt Template" },
                                            { id: "refund", label: "Refund Template" },
                                            { id: "cancel", label: "Cancellation Template" },
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
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

                                {/* Dynamic Template Content */}
                                <s-stack direction="block" gap="base">
                                    {(selectedTab === "refund" && !checkFeatureAccess(plan, "canSendRefundEmail")) ||
                                        (selectedTab === "cancel" && !checkFeatureAccess(plan, "canSendCancelEmail")) ? (
                                        <s-box padding="large-200" background="subdued" borderRadius="base" borderWidth="base">
                                            <s-stack direction="block" gap="base">
                                                <div style={{ textAlign: "center", width: "100%" }}>
                                                    <s-text type="strong">Plan Upgrade Required</s-text>
                                                    <s-box padding-block-start="base">
                                                        <s-text color="subdued">
                                                            The {selectedTab} email feature is available on the
                                                            <strong> {selectedTab === "refund" ? "Advanced" : "Pro"}</strong> plan and above.
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
                                                disabled={!checkFeatureAccess(plan, "canEditTemplates")}
                                                value={
                                                    selectedTab === "receipt" ? settings.receiptSubject :
                                                        selectedTab === "refund" ? settings.refundSubject :
                                                            settings.cancelSubject
                                                }
                                                onInput={(e: any) => handleSettingChange(
                                                    selectedTab === "receipt" ? "receiptSubject" :
                                                        selectedTab === "refund" ? "refundSubject" :
                                                            "cancelSubject",
                                                    e.target.value
                                                )}
                                            />

                                            <div>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                                    <span style={{ fontWeight: 500 }}>Email Template</span>
                                                    {!checkFeatureAccess(plan, "canEditTemplates") && (
                                                        <s-badge tone="caution">View Only</s-badge>
                                                    )}
                                                </div>

                                                <div style={{ padding: "12px", background: "#f4f6f8", borderRadius: "4px", fontSize: "13px", marginBottom: "12px", color: "#5c5f62" }}>
                                                    <strong>Available Variables:</strong>{" "}
                                                    <code>{`{{first_name}}`}</code>, <code>{`{{last_name}}`}</code>, <code>{`{{email}}`}</code>, <code>{`{{currency}}`}</code>, <code>{`{{amount}}`}</code>, <code>{`{{orderNumber}}`}</code>, <code>{`{{date}}`}</code>, <code>{`{{donation_name}}`}</code>, <code>{`{{frequency}}`}</code>, <code>{`{{nextBillingDate}}`}</code>
                                                </div>

                                                {!checkFeatureAccess(plan, "canEditTemplates") && (
                                                    <div style={{ marginBottom: "12px" }}>
                                                        <s-banner tone="info">
                                                            <div slot="title">Custom Templates Locked</div>
                                                            <p>Upgrade to the <strong>Pro</strong> plan to customize your email templates with dynamic variables.</p>
                                                        </s-banner>
                                                    </div>
                                                )}

                                                <RichTextEditor
                                                    disabled={!checkFeatureAccess(plan, "canEditTemplates")}
                                                    value={
                                                        selectedTab === "receipt" ? settings.receiptBody :
                                                            selectedTab === "refund" ? settings.refundBody :
                                                                settings.cancelBody
                                                    }
                                                    onChange={(value: string) => handleSettingChange(
                                                        selectedTab === "receipt" ? "receiptBody" :
                                                            selectedTab === "refund" ? "refundBody" :
                                                                "cancelBody",
                                                        value
                                                    )}
                                                />
                                            </div>
                                        </>
                                    )}
                                </s-stack>
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
