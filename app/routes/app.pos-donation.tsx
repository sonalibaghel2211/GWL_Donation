import { useState, useCallback, useEffect } from "react";
import RichTextEditor from "../components/RichTextEditor";
import type {
    ActionFunctionArgs,
    HeadersFunction,
    LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData, useSearchParams, useLocation, Form } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import { checkFeatureAccess } from "../utils/features";
import { Link } from "react-router";
import ConfigurationTab, { PRODUCT_PREVIEW_SVG, CART_PREVIEW_SVG } from "../components/ConfigurationTab";

// ─── Types ──────────────────────────────────────────────────

interface PosDonationSettings {
    enabled: boolean;
    donationBasis: string;
    donationType: string;
    donationValue: number;
    minimumValue: number;
    donationMessage: string;
    tooltipMessage: string;
    orderTag: string;
}

const DEFAULT_SETTINGS: PosDonationSettings = {
    enabled: false,
    donationBasis: "order",
    donationType: "percentage",
    donationValue: 5,
    minimumValue: 0,
    donationMessage:
        "{donationAmount} of {totalOrderValue} will be donated to charity.\n\nThank you for making a difference with your purchase!",
    tooltipMessage: "A portion of your purchase supports charity",
    orderTag: "galaxy_pos_donation",
};

// ─── Loader ─────────────────────────────────────────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session, admin } = await authenticate.admin(request);
    const shop = session.shop;

    const settings = await prisma.posDonationSettings.findUnique({
        where: { shop },
    });

    const logs = await prisma.posDonationLog.findMany({
        where: { shop },
        orderBy: { createdAt: "desc" },
    });

    const activeLogs = logs.filter((log: any) => log.status === "active");
    const totalDonations = activeLogs.reduce((sum: any, log: any) => sum + (log.donationAmount || 0), 0);
    const ordersWithDonations = activeLogs.length;
    const avgDonation = ordersWithDonations > 0 ? totalDonations / ordersWithDonations : 0;

    const response = await admin.graphql(`
      query {
        shop {
          currencyCode
        }
      }
    `);
    const shopData = await response.json();
    const currency = shopData.data?.shop?.currencyCode || "USD";

    const extensionId = process.env.SHOPIFY_POS_DONATION_ID;

    const subscription = await prisma.planSubscription.findUnique({
        where: { shop },
    });

    return {
        settings: settings ?? { ...DEFAULT_SETTINGS, shop },
        extensionId: extensionId || "MISSING_UUID",
        currency,
        analytics: { totalDonations, ordersWithDonations, avgDonation },
        logs,
        plan: subscription?.plan ?? "basic",
    };
};

// ─── Action ─────────────────────────────────────────────────

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session, admin } = await authenticate.admin(request);
    const shop = session.shop;
    const formData = await request.formData();

    const data = {
        enabled: formData.get("enabled") === "true",
        donationBasis: (formData.get("donationBasis") as string) || "order",
        donationType: (formData.get("donationType") as string) || "percentage",
        donationValue: parseFloat(formData.get("donationValue") as string) || 5,
        minimumValue: parseFloat(formData.get("minimumValue") as string) || 0,
        donationMessage:
            (formData.get("donationMessage") as string) ||
            DEFAULT_SETTINGS.donationMessage,
        tooltipMessage:
            (formData.get("tooltipMessage") as string) ||
            DEFAULT_SETTINGS.tooltipMessage,
        orderTag:
            (formData.get("orderTag") as string) || DEFAULT_SETTINGS.orderTag,
    };

    await prisma.posDonationSettings.upsert({
        where: { shop },
        update: data,
        create: { shop, ...data },
    });

    try {
        // Sync to Shopify App Metafields so Liquid theme blocks can read them synchronously
        const appResponse = await admin.graphql(`query { currentAppInstallation { id } }`);
        const appData = await appResponse.json();
        const appId = appData.data.currentAppInstallation.id;

        const response = await admin.graphql(`
            mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
                metafieldsSet(metafields: $metafields) {
                    metafields { id }
                    userErrors { field message }
                }
            }
        `, {
            variables: {
                metafields: [
                    {
                        ownerId: appId,
                        namespace: "pos_donation",
                        key: "settings",
                        type: "json",
                        value: JSON.stringify(data)
                    }
                ]
            }
        });

        const debugObj = await response.json();
        if (debugObj.data?.metafieldsSet?.userErrors?.length) {
            console.error("MetafieldsSet UserErrors:", JSON.stringify(debugObj.data.metafieldsSet.userErrors, null, 2));
        } else {
            console.log("Successfully synced POS settings to App Metafields!");
        }
    } catch (e) {
        console.error("Error syncing POS settings to Metafields:", e);
    }

    return { status: "success" };
};

// ─── Component ──────────────────────────────────────────────

export default function PosDonation() {
    const loaderData = useLoaderData<typeof loader>();
    const fetcher = useFetcher<typeof action>();
    const resendFetcher = useFetcher();
    const shopify = useAppBridge();

    const { settings: savedSettings, currency: currencyCode, logs, analytics, plan } = loaderData;

    // Build a static generic formatter for previews
    const moneyFormatter = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode,
    });

    const [searchParams, setSearchParams] = useSearchParams();
    const initialTabParam = searchParams.get("tab");
    let initialTabIndex = 0;
    if (initialTabParam === "configuration") initialTabIndex = 1;

    const [selectedTab, setSelectedTab] = useState(initialTabIndex);

    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab === "configuration") setSelectedTab(1);
        else setSelectedTab(0);
    }, [searchParams]);

    const handleTabChange = (index: number) => {
        setSelectedTab(index);
        const tabId = index === 1 ? "configuration" : "settings";
        setSearchParams({ tab: tabId });
    };

    const [settings, setSettings] = useState<PosDonationSettings>({
        enabled: savedSettings.enabled,
        donationBasis: savedSettings.donationBasis,
        donationType: savedSettings.donationType,
        donationValue: savedSettings.donationValue,
        minimumValue: savedSettings.minimumValue,
        donationMessage: savedSettings.donationMessage,
        tooltipMessage: savedSettings.tooltipMessage,
        orderTag: savedSettings.orderTag,
    });

    const isSaving =
        fetcher.state === "submitting" && fetcher.formMethod === "POST";

    const hasChanges =
        settings.enabled !== (savedSettings.enabled ?? false) ||
        settings.donationBasis !== (savedSettings.donationBasis ?? "order") ||
        settings.donationType !== (savedSettings.donationType ?? "percentage") ||
        Number(settings.donationValue) !== Number(savedSettings.donationValue ?? 0) ||
        Number(settings.minimumValue) !== Number(savedSettings.minimumValue ?? 0) ||
        settings.donationMessage !== (savedSettings.donationMessage ?? "") ||
        settings.tooltipMessage !== (savedSettings.tooltipMessage ?? "") ||
        settings.orderTag !== (savedSettings.orderTag ?? "");

    useEffect(() => {
        if (fetcher.data?.status === "success") {
            shopify.toast.show("Settings saved successfully");
        }
    }, [fetcher.data, shopify]);

    const handleSettingChange = useCallback(
        (field: keyof PosDonationSettings, value: string | number | boolean) => {
            setSettings((prev) => ({ ...prev, [field]: value }));
        },
        [],
    );

    const handleSave = useCallback(() => {
        const formData = new FormData();
        formData.append("enabled", String(settings.enabled));
        formData.append("donationBasis", settings.donationBasis);
        formData.append("donationType", settings.donationType);
        formData.append("donationValue", String(settings.donationValue));
        formData.append("minimumValue", String(settings.minimumValue));
        formData.append("donationMessage", settings.donationMessage);
        formData.append("tooltipMessage", settings.tooltipMessage);
        formData.append("orderTag", settings.orderTag);
        fetcher.submit(formData, { method: "POST" });
    }, [settings, fetcher]);

    const handleResend = useCallback((logId: string) => {
        resendFetcher.submit({ logId }, { method: "POST", action: "/api/resend-donation-email" });
        shopify.toast.show("Attempting to resend receipt...");
    }, [resendFetcher, shopify]);

    // ── Preview helpers ──────────────────────────────────────

    const getPreviewMessage = useCallback(
        (samplePrice: number) => {
            let donationAmt: number;

            if (settings.donationType === "percentage") {
                donationAmt = (settings.donationValue / 100) * samplePrice;
            } else {
                donationAmt = settings.donationValue;
            }

            const smartReplace = (html: string, variable: string, value: string) => {
                const regex = new RegExp('\\{(\\s*<[^>]*>\\s*)*' + variable + '(\\s*<[^>]*>\\s*)*\\}', 'gi');
                return html.replace(regex, value);
            };

            let msg = settings.donationMessage;
            msg = smartReplace(msg, "Percentage", `${settings.donationValue}%`);
            msg = smartReplace(msg, "FixedAmount", moneyFormatter.format(settings.donationValue));
            msg = smartReplace(msg, "donationAmount", moneyFormatter.format(donationAmt));
            msg = smartReplace(msg, "totalOrderValue", moneyFormatter.format(samplePrice));

            return msg;
        },
        [settings, moneyFormatter],
    );

    const handleModeSwitch = (mode: string) => {
        let newMessage = settings.donationMessage;

        if (mode === "order") {
            if (settings.donationType === "percentage") {
                newMessage = "{Percentage} of your total order value - {donationAmount} from {totalOrderValue} - will be donated to help provide meals to those in need.\n\nThank you for making a difference with your purchase!";
            } else {
                newMessage = "{FixedAmount} of your total order value - {donationAmount} from {totalOrderValue} - will be donated to help provide meals to those in need.\n\nThank you for making a difference with your purchase!";
            }
        } else {
            if (settings.donationType === "percentage") {
                newMessage = "{Percentage} of your product value - {donationAmount} from {totalOrderValue} - will be donated to help provide meals to those in need.\n\nThank you for making a difference with your purchase!";
            } else {
                newMessage = "{FixedAmount} of your product value - {donationAmount} from {totalOrderValue} - will be donated to help provide meals to those in need.\n\nThank you for making a difference with your purchase!";
            }
        }

        setSettings((prev) => ({
            ...prev,
            donationBasis: mode,
            donationMessage: newMessage,
            tooltipMessage: "With your order, you are helping the Feed India Mission provide meals."
        }));
    };

    const handleTypeSwitch = (type: string) => {
        let newMessage = settings.donationMessage;

        if (settings.donationBasis === "order") {
            if (type === "percentage") {
                newMessage = "{Percentage} of your total order value - {donationAmount} from {totalOrderValue} - will be donated to help provide meals to those in need.\n\nThank you for making a difference with your purchase!";
            } else {
                newMessage = "{FixedAmount} of your total order value - {donationAmount} from {totalOrderValue} - will be donated to help provide meals to those in need.\n\nThank you for making a difference with your purchase!";
            }
        } else {
            if (type === "percentage") {
                newMessage = "{Percentage} of your product value - {donationAmount} from {totalOrderValue} - will be donated to help provide meals to those in need.\n\nThank you for making a difference with your purchase!";
            } else {
                newMessage = "{FixedAmount} of your product value - {donationAmount} from {totalOrderValue} - will be donated to help provide meals to those in need.\n\nThank you for making a difference with your purchase!";
            }
        }

        setSettings((prev) => ({
            ...prev,
            donationType: type,
            donationMessage: newMessage
        }));
    };

    // ── Tab content renderers ────────────────────────────────

    const renderAnalytics = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ backgroundColor: "#fff", border: "1px solid #EBEBEB", borderRadius: "8px", padding: "24px" }}>
                <div style={{ marginBottom: "20px" }}>
                    <div style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "8px" }}>Donation Analytics</div>
                    <div style={{ fontSize: "13px", color: "#6D7175" }}>Track your store's donation performance at a glance.</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                    <div style={{ padding: "20px", border: "1px solid #EBEBEB", borderRadius: "8px", background: "#f9f9f9" }}>
                        <div style={{ fontSize: "13px", color: "#6D7175", marginBottom: "8px", fontWeight: "600" }}>Total Donations</div>
                        <div style={{ fontSize: "24px", fontWeight: "bold", color: "#202223" }}>{moneyFormatter.format(analytics.totalDonations)}</div>
                        <div style={{ fontSize: "12px", color: "#6D7175", marginTop: "4px" }}>All time</div>
                    </div>

                    <div style={{ padding: "20px", border: "1px solid #EBEBEB", borderRadius: "8px", background: "#f9f9f9" }}>
                        <div style={{ fontSize: "13px", color: "#6D7175", marginBottom: "8px", fontWeight: "600" }}>Orders with Donations</div>
                        <div style={{ fontSize: "24px", fontWeight: "bold", color: "#202223" }}>{String(analytics.ordersWithDonations)}</div>
                        <div style={{ fontSize: "12px", color: "#6D7175", marginTop: "4px" }}>Total orders tagged</div>
                    </div>

                    <div style={{ padding: "20px", border: "1px solid #EBEBEB", borderRadius: "8px", background: "#f9f9f9" }}>
                        <div style={{ fontSize: "13px", color: "#6D7175", marginBottom: "8px", fontWeight: "600" }}>Avg Donation / Order</div>
                        <div style={{ fontSize: "24px", fontWeight: "bold", color: "#202223" }}>{moneyFormatter.format(analytics.avgDonation)}</div>
                        <div style={{ fontSize: "12px", color: "#6D7175", marginTop: "4px" }}>Per order average</div>
                    </div>
                </div>
            </div>

            <div style={{ backgroundColor: "#fff", border: "1px solid #EBEBEB", borderRadius: "8px", padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div style={{ fontWeight: "600", fontSize: "14px" }}>Detailed Activity Logs</div>
                        <div style={{ fontSize: "13px", color: "#6D7175" }}>View detailed donation activity logs across your entire business.</div>
                    </div>
                    <button
                        onClick={() => window.location.href = "/app/donation-activity"}
                        style={{
                            background: "#202223",
                            color: "white",
                            border: "none",
                            padding: "8px 16px",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: "600",
                            cursor: "pointer"
                        }}
                    >
                        View Full Activity
                    </button>
                </div>
            </div>
        </div>
    );

    const renderSettings = () => (
        <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
            <div style={{ flex: 1, backgroundColor: "#fff", border: "1px solid #EBEBEB", borderRadius: "8px", padding: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <div>
                        <div style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "4px" }}>
                            General Status <span style={{ padding: "2px 10px", background: settings.enabled ? "#eafff0" : "#fff4e5", color: settings.enabled ? "#1a512e" : "#8e4b0b", borderRadius: "20px", fontSize: "11px", marginLeft: "10px", fontWeight: "600" }}>{settings.enabled ? "Active" : "Inactive"}</span>
                        </div>
                        <div style={{ fontSize: "13px", color: "#6D7175" }}>Enable or disable the Portion Of Sale widget completely</div>
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !hasChanges}
                            style={{
                                background: !hasChanges ? "#f4f4f4" : "#202223",
                                color: !hasChanges ? "#8e8e8e" : "white",
                                border: !hasChanges ? "1px solid #dcdcdc" : "none",
                                padding: "8px 24px",
                                borderRadius: "8px",
                                fontSize: "13px",
                                fontWeight: "600",
                                cursor: (isSaving || !hasChanges) ? "not-allowed" : "pointer",
                                opacity: isSaving ? 0.7 : 1
                            }}
                        >
                            {isSaving ? "Saving..." : "Save"}
                        </button>
                        <button
                            onClick={() => handleSettingChange("enabled", !settings.enabled)}
                            style={{
                                background: settings.enabled ? "#fbeae5" : "#202223",
                                color: settings.enabled ? "#8e1f0b" : "white",
                                border: "none",
                                padding: "8px 16px",
                                borderRadius: "8px",
                                fontSize: "13px",
                                fontWeight: "600",
                                cursor: "pointer"
                            }}
                        >
                            {settings.enabled ? "Disable" : "Enable"}
                        </button>
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div style={{ display: "flex", borderBottom: "1px solid #EBEBEB" }}>
                        <div
                            onClick={() => handleModeSwitch("order")}
                            style={{ padding: "10px 24px", cursor: "pointer", fontWeight: settings.donationBasis === "order" ? "600" : "400", borderBottom: settings.donationBasis === "order" ? `2px solid #6C4A79` : "none", marginBottom: "-1px", color: settings.donationBasis === "order" ? "#202223" : "#6D7175", fontSize: "14px" }}
                        >
                            Order-Based Donations
                        </div>
                        <div
                            onClick={() => handleModeSwitch("product")}
                            style={{ padding: "10px 24px", cursor: "pointer", fontWeight: settings.donationBasis === "product" ? "600" : "400", borderBottom: settings.donationBasis === "product" ? `2px solid #6C4A79` : "none", marginBottom: "-1px", color: settings.donationBasis === "product" ? "#202223" : "#6D7175", fontSize: "14px" }}
                        >
                            Product Based Donations
                        </div>
                    </div>

                    <div style={{ padding: "12px 16px", background: "#f4f4f7", borderRadius: "8px", color: "#6C4A79", fontSize: "13px", border: "1px solid #e2e2e7" }}>
                        Apply a percentage or fixed amount from {settings.donationBasis === "order" ? "the order total" : "each product"} as a donation.
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ fontSize: "14px", fontWeight: "600" }}>Donation Type</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: checkFeatureAccess(plan, "canUsePercentageDonation") ? "pointer" : "not-allowed", fontSize: "14px", opacity: checkFeatureAccess(plan, "canUsePercentageDonation") ? 1 : 0.6 }}>
                                    <input
                                        type="radio"
                                        disabled={!checkFeatureAccess(plan, "canUsePercentageDonation")}
                                        checked={settings.donationType === "percentage"}
                                        onChange={() => handleTypeSwitch("percentage")}
                                        style={{ accentColor: "#6C4A79" }}
                                    />
                                    Percentage (%)
                                    {!checkFeatureAccess(plan, "canUsePercentageDonation") && <s-badge tone="caution">Advanced</s-badge>}
                                </label>
                                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                                    <input
                                        type="radio"
                                        checked={settings.donationType === "fixed"}
                                        onChange={() => handleTypeSwitch("fixed")}
                                        style={{ accentColor: "#6C4A79" }}
                                    />
                                    Fixed Amount ({currencyCode})
                                </label>
                            </div>

                            {!checkFeatureAccess(plan, "canUsePercentageDonation") && (
                                <s-banner tone="info">
                                    <div slot="title">Percentage Donations Locked</div>
                                    <p>Percentage-based donations are available on the <strong>Advanced</strong> plan.</p>
                                    <Link to="/app/pricing" style={{ color: "inherit", textDecoration: "none" }}>
                                        <div style={{ marginTop: "4px", fontSize: "13px", color: "#6D7175" }}>
                                            Upgrade your plan to unlock ↗
                                        </div>
                                    </Link>
                                </s-banner>
                            )}
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "16px" }}>
                        <div style={{ flex: 1 }}>
                            <s-text-field
                                label={settings.donationType === "percentage" ? "Donation Percentage" : "Donation Amount"}
                                value={String(settings.donationValue)}
                                onInput={(e: any) => handleSettingChange("donationValue", parseFloat(e.target.value) || 0)}
                            />
                        </div>
                        {settings.donationType === "fixed" && (
                            <div style={{ flex: 1 }}>
                                <s-text-field
                                    label={settings.donationBasis === "order" ? "Minimum Order Value" : "Minimum Product Value"}
                                    value={String(settings.minimumValue)}
                                    onInput={(e: any) => handleSettingChange("minimumValue", parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>Custom Message</div>
                        <div style={{ fontSize: "12px", color: "#6D7175", marginBottom: "12px" }}>
                            Use: {settings.donationType === "percentage" ? "{Percentage}" : "{FixedAmount}"}, {"{totalOrderValue}"}, {"{donationAmount}"}
                        </div>
                        <RichTextEditor
                            value={settings.donationMessage}
                            onChange={(value: string) => handleSettingChange("donationMessage", value)}
                        />
                    </div>
                    <div>
                        <s-text-field
                            label="Tooltip (Small Text)"
                            value={settings.tooltipMessage}
                            onInput={(e: any) => handleSettingChange("tooltipMessage", e.target.value)}
                        />
                    </div>

                    <div>
                        <s-text-field
                            label="Order Internal Tag"
                            value={settings.orderTag}
                            onInput={(e: any) => handleSettingChange("orderTag", e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div style={{ width: "350px", backgroundColor: "#fff", border: "1px solid #EBEBEB", borderRadius: "8px", padding: "24px", position: "sticky", top: "20px" }}>
                <div style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "20px" }}>Widget Preview</div>

                <div style={{ borderRadius: "8px", border: "1px solid #EBEBEB", overflow: "hidden" }}>
                    <div style={{ padding: "12px 16px", background: "#f9f9f9", borderBottom: "1px solid #EBEBEB", fontSize: "12px", fontWeight: "bold", color: "#6D7175" }}>
                        STOREFRONT PREVIEW
                    </div>
                    <div style={{ padding: "20px", background: "white" }}>
                        <div style={{ fontSize: "14px", fontWeight: "bold", color: "#202223", marginBottom: "12px" }}>Helping Feed India Mission</div>
                        <div style={{ fontSize: "13px", color: "#202223", lineHeight: "1.5" }}>
                            {settings.minimumValue > 599
                                ? "(Donation badge hidden: Value below minimum)"
                                : <div dangerouslySetInnerHTML={{ __html: getPreviewMessage(599) }} />}
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #F0F0F0" }}>
                            <div style={{ background: "#007ace", color: "white", width: "16px", height: "16px", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "bold", flexShrink: 0 }}>i</div>
                            <div style={{ fontSize: "12px", color: "#6D7175", lineHeight: "1.4" }}>
                                {settings.tooltipMessage}
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: "20px", padding: "12px", background: "#e8f5e9", borderRadius: "8px", fontSize: "12px", color: "#2e7d32" }}>
                    This is how the donation information will appear to your customers on the storefront.
                </div>
            </div>
        </div>
    );

    const renderConfiguration = () => (
        <ConfigurationTab
            blocks={[
                {
                    id: "pos-product",
                    title: "Product Page Setup",
                    description: "To add the donation section to your product page, click the button below to insert the app block.",
                    themeEditorUrl: `https://admin.shopify.com/store/${shopify.config?.shop?.replace(".myshopify.com", "") || ""}/themes/current/editor?template=product`,
                    buttonLabel: "Open Product Editor ↗",
                    previewSvg: PRODUCT_PREVIEW_SVG,
                    enabled: settings.enabled,
                    instructions: [
                        "Go to ", "Online Store", " ➺ ", "Themes", " ➺ Click on ", "Customize",
                        " ➺ Select ", "Product Page", " Template ➺ Click ", "Add Block",
                        " ➺ Select ", "POS Donation"
                    ],
                    onToggle: (val) => handleSettingChange("enabled", val)
                },
                {
                    id: "pos-cart",
                    title: "Cart Page Setup",
                    description: "To add the donation section to your cart page, click the button below to insert the app block.",
                    themeEditorUrl: `https://admin.shopify.com/store/${shopify.config?.shop?.replace(".myshopify.com", "") || ""}/themes/current/editor?template=cart`,
                    buttonLabel: "Open Cart Editor ↗",
                    previewSvg: CART_PREVIEW_SVG,
                    enabled: settings.enabled,
                    instructions: [
                        "Go to ", "Online Store", " ➺ ", "Themes", " ➺ Click on ", "Customize",
                        " ➺ Select ", "Cart Page", " Template ➺ Click ", "Add Block",
                        " ➺ Select ", "POS Donation"
                    ],
                    onToggle: (val) => handleSettingChange("enabled", val)
                }
            ]}
        />
    );

    const tabs = [
        { id: "settings", label: "Settings" },
        { id: "configuration", label: "Configuration" },
    ];

    return (
        <s-page heading="Portion of Sale Donation">
            <div className="polaris-tabs">
                <div className="polaris-tabs-list" role="tablist">
                    {tabs.map((tab, index) => (
                        <button
                            key={tab.id}
                            role="tab"
                            aria-selected={selectedTab === index}
                            className={`polaris-tab ${selectedTab === index ? "active" : ""}`}
                            onClick={() => handleTabChange(index)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ marginTop: "20px" }}>
                {selectedTab === 0 && (
                    <Form method="post" id="pos-form">
                        {renderSettings()}
                    </Form>
                )}
                {selectedTab === 1 && renderConfiguration()}
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