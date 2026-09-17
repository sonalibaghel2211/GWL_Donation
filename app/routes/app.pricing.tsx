import { useState, useEffect } from "react";
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
import { PLAN_DETAILS, type PlanType } from "../utils/features";

// ─── Loader ─────────────────────────────────────────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session, admin } = await authenticate.admin(request);
    const shop = session.shop;

    const subscription = await prisma.planSubscription.findUnique({
        where: { shop },
    });

    let currentPlan = (subscription?.status === "active") ? subscription.plan : null;
    let status = subscription?.status ?? "none";
    let subscriptionId = subscription?.subscriptionId ?? null;

    if (status === "pending" && subscriptionId) {
        try {
            const response = await admin.graphql(
                `#graphql
                query getAppSubscription($id: ID!) {
                    node(id: $id) {
                        ... on AppSubscription {
                            status
                        }
                    }
                }`,
                { variables: { id: subscriptionId } }
            );
            const json: any = await response.json();
            const shopifyStatus = json.data?.node?.status;

            if (shopifyStatus === "ACTIVE" && subscription) {
                status = "active";
                currentPlan = subscription.pendingPlan || "basic";
                await prisma.planSubscription.update({
                    where: { shop },
                    data: {
                        status: "active",
                        plan: currentPlan!,
                        pendingPlan: null,
                    },
                });
            } else if (shopifyStatus && shopifyStatus !== "PENDING" && subscription) {
                status = "none";
                currentPlan = null;
                await prisma.planSubscription.update({
                    where: { shop },
                    data: {
                        status: "none",
                        pendingPlan: null,
                        subscriptionId: null,
                    },
                });
            }
        } catch (err) {
            console.error(`[PricingLoader] Self-healing subscription check failed for ${subscriptionId}:`, err);
        }
    }

    const response = await admin.graphql(`
        query {
            shop {
                currencyCode
            }
        }
    `);
    const shopData = await response.json();
    const currency = shopData.data?.shop?.currencyCode || "USD";

    return {
        currentPlan,
        status,
        subscriptionId,
        currency,
    };
};

// ─── Action ─────────────────────────────────────────────────

export const action = async ({ request }: ActionFunctionArgs) => {
    const { admin, session } = await authenticate.admin(request);
    const shop = session.shop;
    const formData = await request.formData();
    const intent = formData.get("_intent") as string;

    const plans = ["basic", "advanced", "pro"];
    const plan = intent.replace("select", "").toLowerCase() as PlanType;

    if (plans.includes(plan)) {
        const planDetail = PLAN_DETAILS[plan];
        const price = parseFloat(planDetail.price.replace("$", ""));
        const url = new URL(request.url);
        const shopifyHost = url.searchParams.get("host");

        const existingSub = await prisma.planSubscription.findUnique({ where: { shop } });

        // Free plan (Basic plan with price 0)
        if (price === 0 || plan === "basic") {
            if (existingSub?.subscriptionId && existingSub?.status === "active") {
                try {
                    await admin.graphql(
                        `#graphql
                        mutation appSubscriptionCancel($id: ID!) {
                            appSubscriptionCancel(id: $id) {
                                userErrors {
                                    field
                                    message
                                }
                                appSubscription {
                                    id
                                    status
                                }
                            }
                        }`,
                        { variables: { id: existingSub.subscriptionId } }
                    );
                } catch (e) {
                    console.error(`[PricingAction] Failed to cancel active subscription ${existingSub.subscriptionId}:`, e);
                }
            }

            await prisma.planSubscription.upsert({
                where: { shop },
                update: {
                    plan: "basic",
                    status: "active",
                    pendingPlan: null,
                    subscriptionId: null,
                },
                create: {
                    shop,
                    plan: "basic",
                    status: "active",
                    pendingPlan: null,
                    subscriptionId: null,
                },
            });

            return {
                success: true,
                plan: "basic",
            };
        }

        const appUrl = (process.env.SHOPIFY_APP_URL || url.origin).replace(/\/$/, "");
        const returnUrl = `${appUrl}/app/billing?plan=${plan}&shop=${shop}${shopifyHost ? `&host=${encodeURIComponent(shopifyHost)}` : ""}`;

        let trialDays = 7;
        // If the merchant has ever had an approved Shopify subscription
        // (an activated subscription with a valid subscriptionId), skip the trial.
        // Only merchants with no previously approved subscription get the 7-day trial.
        if (existingSub && existingSub.subscriptionId) {
            trialDays = 0;
        }

        const response = await admin.graphql(
            `#graphql
            mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $trialDays: Int, $test: Boolean) {
              appSubscriptionCreate(name: $name, lineItems: $lineItems, returnUrl: $returnUrl, trialDays: $trialDays, test: $test) {
                appSubscription {
                  id
                }
                confirmationUrl
                userErrors {
                  field
                  message
                }
              }
            }`,
            {
                variables: {
                    name: `Donations: Subscriptions & Receipts - ${planDetail.name} Plan`,
                    returnUrl,
                    test: process.env.SHOPIFY_BILLING_TEST_MODE === "true",
                    trialDays: trialDays,
                    lineItems: [
                        {
                            plan: {
                                appRecurringPricingDetails: {
                                    price: {
                                        amount: price,
                                        currencyCode: "USD",
                                    },
                                    interval: "EVERY_30_DAYS",
                                },
                            },
                        },
                    ],
                },
            }
        );

        const responseJson = await response.json();

        if (!responseJson?.data?.appSubscriptionCreate) {
            return { success: false, error: "Failed to create subscription in Shopify." };
        }

        const data = responseJson.data.appSubscriptionCreate;

        if (data.userErrors.length > 0) {
            return { success: false, error: data.userErrors[0].message };
        }

        // Mark as pending
        await prisma.planSubscription.upsert({
            where: { shop },
            update: {
                status: existingSub && existingSub.status === "active" ? "active" : "pending",
                pendingPlan: plan,
                subscriptionId: existingSub && existingSub.status === "active" ? existingSub.subscriptionId : data.appSubscription.id
            },
            create: {
                shop,
                plan: "basic", // Default to basic if new
                pendingPlan: plan,
                status: "pending",
                subscriptionId: data.appSubscription.id
            },
        });

        let confirmationUrl = data.confirmationUrl;
        if (confirmationUrl && confirmationUrl.includes(".myshopify.com/admin/")) {
            const shopName = shop.replace(".myshopify.com", "");
            confirmationUrl = confirmationUrl.replace(`https://${shop}/admin/`, `https://admin.shopify.com/store/${shopName}/`);
        }

        return {
            success: true,
            plan: plan,
            confirmationUrl: confirmationUrl
        };
    }

    return { success: false, error: "Unknown intent" };
};

// ─── Component ──────────────────────────────────────────────

const BASIC_FEATURES = [
    "Donation create (basic)",
    "Portion of sale (fixed only)",
    "Basic UI & Design",
    "Order Tagging",
    "Community support",
];

const ADVANCED_FEATURES = [
    "Everything in Basic",
    "Receipt email notification",
    "PDF receipt download",
    "Portion of sale (percentage based)",
    "Refund email notification",
    "Filters / pagination",
    "Advanced Analytics",
    "Priority support",
];

const PRO_FEATURES = [
    "Everything in Advanced",
    "Cancellation email notification",
    "Custom email templates",
    "Branding removal",
    "Dynamic variables",
    "Unlimited logs",
];

export default function PricingPage() {
    const { currentPlan, status, currency } = useLoaderData<typeof loader>();
    const fetcher = useFetcher<typeof action>();
    const shopify = useAppBridge();

    const moneyFormatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: "USD",
    });

    const isSubmitting = fetcher.state !== "idle";
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const data = fetcher.data as any;
        if (data?.success) {
            if (data.confirmationUrl) {
                // Redirect the merchant to the confirmation URL
                // We use window.top.location.href to break out of the iframe
                window.top!.location.href = data.confirmationUrl;
            } else {
                shopify.toast.show(`You are now on the ${data.plan.charAt(0).toUpperCase() + data.plan.slice(1)} plan.`);
                setErrorMessage(null);
            }
        }
        if (data?.success === false && data?.error) {
            setErrorMessage(data.error);
        }
    }, [fetcher.data, shopify]);

    const activePlan = (fetcher.data as any)?.plan ?? currentPlan;

    const selectPlan = (plan: string) => {
        const form = new FormData();
        form.append("_intent", `select${plan.charAt(0).toUpperCase() + plan.slice(1)}`);
        fetcher.submit(form, { method: "POST" });
    };

    // ── Styles ────────────────────────────────────────────────

    const pageStyle: React.CSSProperties = {
        maxWidth: "1100px",
        margin: "0 auto",
        paddingBottom: "48px",
    };

    const heroStyle: React.CSSProperties = {
        textAlign: "center",
        padding: "40px 24px 32px",
    };

    const gridStyle: React.CSSProperties = {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "20px",
        padding: "0 8px",
    };

    const cardBase: React.CSSProperties = {
        backgroundColor: "#ffffff",
        border: "1px solid #EBEBEB",
        borderRadius: "12px",
        padding: "32px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        position: "relative",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
    };

    const featuredCard: React.CSSProperties = {
        ...cardBase,
        border: "2px solid #6C4A79",
        boxShadow: "0 8px 24px rgba(108,74,121,0.12)",
        transform: "scale(1.02)",
        zIndex: 1,
    };

    const popularBadge: React.CSSProperties = {
        position: "absolute",
        top: "-13px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "#6C4A79",
        color: "white",
        fontSize: "11px",
        fontWeight: "700",
        padding: "4px 16px",
        borderRadius: "20px",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
    };

    const featureItem: React.CSSProperties = {
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        fontSize: "13px",
        color: "#202223",
        padding: "4px 0",
        lineHeight: "1.4",
    };

    const checkIcon = (color: string) => (
        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{ flexShrink: 0, marginTop: "2px" }}
        >
            <circle cx="8" cy="8" r="8" fill={color} fillOpacity="0.15" />
            <path
                d="M4.5 8l2.5 2.5 4.5-5"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );

    const btnBase: React.CSSProperties = {
        width: "100%",
        padding: "12px 24px",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer",
        border: "none",
        transition: "filter 0.15s",
        marginTop: "auto",
    };

    const getButtonText = (planKey: string, planName: string) => {
        if (status === "active" && activePlan === planKey) return "✓ Current Plan";
        if (status === "pending") return "Switching...";

        if (!activePlan || status === "none") {
            return `Select ${planName}`;
        }

        const planRanks: Record<string, number> = { basic: 0, advanced: 1, pro: 2 };
        const currentRank = planRanks[activePlan] ?? 0;
        const targetRank = planRanks[planKey] ?? 0;

        if (targetRank > currentRank) return `Upgrade to ${planName}`;
        return `Switch to ${planName}`;
    };

    return (
        <div style={pageStyle}>
            <s-page heading="Pricing Plans">
                <div style={heroStyle}>
                    <div style={{ fontSize: "28px", fontWeight: "700", color: "#202223", marginBottom: "12px" }}>
                        Choose the right plan for your growth
                    </div>
                    <div style={{ fontSize: "15px", color: "#6D7175", maxWidth: "540px", margin: "0 auto", lineHeight: "1.6" }}>
                        From simple donations to advanced automated receipts.
                        Scale your charitable impact with our powerful tools.
                    </div>
                </div>

                {errorMessage && (
                    <div style={{ margin: "0 8px 24px", padding: "12px 16px", background: "#fee2e2", border: "1px solid #ef4444", borderRadius: "8px", color: "#991b1b", fontSize: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span><strong>Error:</strong> {errorMessage}</span>
                        </div>
                    </div>
                )}

                <div style={gridStyle}>
                    {/* BASIC PLAN */}
                    <div style={activePlan === "basic" ? featuredCard : cardBase}>
                        {activePlan === "basic" && <div style={popularBadge}>✓ Active</div>}
                        <div>
                            <div style={{ fontSize: "18px", fontWeight: "700", marginBottom: "6px" }}>Basic</div>
                            <div style={{ fontSize: "13px", color: "#6D7175", marginBottom: "20px" }}>{PLAN_DETAILS.basic.description}</div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                                <span style={{ fontSize: "36px", fontWeight: "800", color: activePlan === "basic" ? "#6C4A79" : "inherit" }}>{moneyFormatter.format(0.00)}</span>
                                <span style={{ fontSize: "14px", color: "#6D7175" }}>/ month</span>
                            </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {BASIC_FEATURES.map((f) => (
                                <div key={f} style={featureItem}>
                                    {checkIcon(activePlan === "basic" ? "#6C4A79" : "#6D7175")}
                                    {f}
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => selectPlan("basic")}
                            disabled={isSubmitting || activePlan === "basic"}
                            style={{
                                ...btnBase,
                                background: activePlan === "basic" ? "#f4f4f4" : "#202223",
                                color: activePlan === "basic" ? "#6D7175" : "white",
                                cursor: activePlan === "basic" ? "default" : "pointer",
                            }}
                        >
                            {getButtonText("basic", "Basic")}
                        </button>
                    </div>

                    {/* ADVANCED PLAN */}
                    <div style={activePlan === "advanced" ? featuredCard : cardBase}>
                        {activePlan === "advanced" ? (
                            <div style={popularBadge}>✓ Active</div>
                        ) : (
                            <div style={popularBadge}>⭐ Recommended</div>
                        )}
                        <div>
                            <div style={{ fontSize: "18px", fontWeight: "700", marginBottom: "6px" }}>Advanced</div>
                            <div style={{ fontSize: "13px", color: "#6D7175", marginBottom: "20px" }}>{PLAN_DETAILS.advanced.description}</div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                                <span style={{ fontSize: "36px", fontWeight: "800", color: "#6C4A79" }}>{moneyFormatter.format(4.99)}</span>
                                <span style={{ fontSize: "14px", color: "#6D7175" }}>/ month</span>
                            </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {ADVANCED_FEATURES.map((f) => (
                                <div key={f} style={featureItem}>
                                    {checkIcon("#6C4A79")}
                                    {f}
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => selectPlan("advanced")}
                            disabled={isSubmitting || activePlan === "advanced"}
                            style={{
                                ...btnBase,
                                background: activePlan === "advanced" ? "#f4f4f4" : "#6C4A79",
                                color: activePlan === "advanced" ? "#6D7175" : "white",
                                cursor: activePlan === "advanced" ? "default" : "pointer",
                            }}
                        >
                            {getButtonText("advanced", "Advanced")}
                        </button>
                    </div>

                    {/* PRO PLAN */}
                    <div style={activePlan === "pro" ? featuredCard : cardBase}>
                        {activePlan === "pro" && <div style={popularBadge}>✓ Active</div>}
                        <div>
                            <div style={{ fontSize: "18px", fontWeight: "700", marginBottom: "6px" }}>Pro</div>
                            <div style={{ fontSize: "13px", color: "#6D7175", marginBottom: "20px" }}>{PLAN_DETAILS.pro.description}</div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                                <span style={{ fontSize: "36px", fontWeight: "800", color: activePlan === "pro" ? "#6C4A79" : "inherit" }}>{moneyFormatter.format(9.99)}</span>
                                <span style={{ fontSize: "14px", color: "#6D7175" }}>/ month</span>
                            </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {PRO_FEATURES.map((f) => (
                                <div key={f} style={featureItem}>
                                    {checkIcon(activePlan === "pro" ? "#6C4A79" : "#202223")}
                                    {f}
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => selectPlan("pro")}
                            disabled={isSubmitting || activePlan === "pro"}
                            style={{
                                ...btnBase,
                                background: activePlan === "pro" ? "#f4f4f4" : "#202223",
                                color: activePlan === "pro" ? "#6D7175" : "white",
                                cursor: activePlan === "pro" ? "default" : "pointer",
                            }}
                        >
                            {getButtonText("pro", "Pro")}
                        </button>
                    </div>
                </div>

            </s-page>
        </div>
    );
}

export const headers: HeadersFunction = (headersArgs) => {
    return boundary.headers(headersArgs);
};
