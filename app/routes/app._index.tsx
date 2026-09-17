import { useEffect, useState } from "react";

import type {

  ActionFunctionArgs,

  HeadersFunction,

  LoaderFunctionArgs,

} from "react-router";

import { useFetcher, useLoaderData, useNavigate } from "react-router";

import { useAppBridge } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";

import { boundary } from "@shopify/shopify-app-react-router/server";

import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {

  const { session, admin } = await authenticate.admin(request);

  const shop = session.shop;

  // Fetch shop currency
  let currencyCode = "USD";
  try {
    const currencyResponse = await admin.graphql(`
      query {
        shop {
          currencyCode
        }
      }
    `);
    const currencyData = await currencyResponse.json();
    currencyCode = currencyData.data?.shop?.currencyCode || "USD";
  } catch (e) {
    console.error("Error fetching shop currency:", e);
  }

  // Force register webhooks on dashboard load to ensure topics are synced

  try {

    const { registerWebhooks } = await import("../shopify.server");

    await registerWebhooks({ session });

    console.log(`[Webhook Registration] Webhooks successfully registered for ${session.shop}`);

  } catch (e) {

    console.error(`[Webhook Registration] Failed to manual register:`, e);

  }

  const last7DaysDate = new Date();
  last7DaysDate.setDate(last7DaysDate.getDate() - 7);

  const [
    presetDonations,
    posLogs,
    recurringLogs,
    appSettings,
    posSettings,
    roundupSettings,
    campaignsCount,
    subscription
  ] = await Promise.all([
    prisma.donation.findMany({
      where: { campaign: { shop }, status: "active" },
      select: { amount: true, currency: true }
    }),
    prisma.posDonationLog.findMany({ where: { shop, status: "active" }, select: { donationAmount: true, currency: true } }),
    prisma.recurringDonationLog.findMany({ where: { shop, status: "active" }, select: { donationAmount: true, currency: true, frequency: true } }),
    prisma.appSettings.findUnique({ where: { shop } }),
    prisma.posDonationSettings.findUnique({ where: { shop } }),
    prisma.roundUpDonationSettings.findUnique({ where: { shop } }),
    prisma.campaign.count({ where: { shop, enabled: true } }),
    prisma.planSubscription.findUnique({ where: { shop } })
  ]);

  // Fetch roundup stats from dedicated table
  const roundupLogs = await prisma.roundUpDonationLog.findMany({
    where: { shop, status: "active" },
    select: { donationAmount: true, currency: true }
  });

  const posOrderCountInt = posLogs.length;

  const presetTotal = presetDonations.reduce((sum, d) => sum + (d.amount || 0), 0);
  const posTotal = posLogs.reduce((sum, l) => sum + (l.donationAmount || 0), 0);
  const roundupTotal = roundupLogs.reduce((sum, l) => sum + (l.donationAmount || 0), 0);
  const recurringTotal = recurringLogs.filter(l => l.frequency !== "one_time").reduce((sum, l) => sum + (l.donationAmount || 0), 0);
  const totalImpact = presetTotal + posTotal + roundupTotal + recurringTotal;

  // Count active channels
  let activeChannels = 0;
  if (campaignsCount > 0) activeChannels++;
  if (posSettings?.enabled) activeChannels++;
  if (roundupSettings?.enabled) activeChannels++;

  return {
    enabled: appSettings?.enabled ?? true,
    showOnEmptyCart: appSettings?.showOnEmptyCart ?? false,
    shop: session.shop,
    currency: currencyCode,
    currentPlan: subscription?.plan ?? "basic",
    stats: {
      totalImpact,
      activeChannels,
      preset: presetTotal,
      pos: {
        total: posTotal,
        orderCount: posOrderCountInt,
      },
      roundup: roundupTotal,
      recurring: recurringTotal
    }
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {

  const { session, admin } = await authenticate.admin(request);

  const shop = session.shop;

  const formData = await request.formData();

  const enabledStr = formData.get("enabled");
  const showOnEmptyCartStr = formData.get("showOnEmptyCart");

  const updateData: any = {};
  if (enabledStr !== null) updateData.enabled = enabledStr === "true";
  if (showOnEmptyCartStr !== null) updateData.showOnEmptyCart = showOnEmptyCartStr === "true";

  await prisma.appSettings.upsert({
    where: { shop },
    update: updateData,
    create: { shop, ...updateData },
  });

  try {
    const appResponse = await admin.graphql(`query { currentAppInstallation { id } }`);
    const appData = await appResponse.json();
    const appId = appData.data.currentAppInstallation.id;

    const metafields = [];
    if (enabledStr !== null) {
      metafields.push({
        ownerId: appId,
        namespace: "common",
        key: "enabled",
        type: "boolean",
        value: enabledStr
      });
    }
    if (showOnEmptyCartStr !== null) {
      metafields.push({
        ownerId: appId,
        namespace: "common",
        key: "show_on_empty_cart",
        type: "boolean",
        value: showOnEmptyCartStr
      });
    }

    if (metafields.length > 0) {
      await admin.graphql(`
        mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields { id }
            userErrors { field message }
          }
        }
      `, {
        variables: { metafields }
      });
    }

  } catch (e) {

    console.error("Error syncing global settings to Metafields:", e);

  }

  return { status: "success" };

};

function FormatMoneyDisplay({
  amount,
  currency = "USD",
  fontSize = "32px",
  color = "#1A1C23"
}: {
  amount: number | string;
  currency?: string;
  fontSize?: string;
  color?: string;
}) {
  const num = typeof amount === "number" ? amount : parseFloat(amount || "0");
  let formatted = "";
  try {
    formatted = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
    }).format(num);
  } catch (e) {
    formatted = `${currency || "USD"} ${num.toFixed(2)}`;
  }

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize, fontWeight: 800, color, lineHeight: 1.2 }}>
        {formatted}
      </div>
    </div>
  );
}

export default function Index() {

  const loaderData = useLoaderData<typeof loader>();

  const fetcher = useFetcher();

  const shopify = useAppBridge();

  const navigate = useNavigate();

  const [enabled, setEnabled] = useState(loaderData?.enabled ?? true);
  const [showOnEmptyCart, setShowOnEmptyCart] = useState(loaderData?.showOnEmptyCart ?? false);

  useEffect(() => {
    if (fetcher.data?.status === "success") {
      shopify.toast.show("Settings updated successfully");
    }
  }, [fetcher.data, shopify]);

  const toggleStatus = () => {
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    const formData = new FormData();
    formData.append("enabled", String(nextEnabled));
    fetcher.submit(formData, { method: "POST" });
  };

  const toggleEmptyCart = () => {
    const nextVal = !showOnEmptyCart;
    setShowOnEmptyCart(nextVal);
    const formData = new FormData();
    formData.append("showOnEmptyCart", String(nextVal));
    fetcher.submit(formData, { method: "POST" });
  };

  const handleContactSupport = () => {
    if ((window as any).Tawk_API) {
      (window as any).Tawk_API.maximize();
    } else {
      shopify.toast.show("Support chat is loading...", { duration: 3000 });
    }
  };

  return (
    <s-page>
      <div style={{ paddingBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, paddingBottom: '8px', color: '#1A1C23' }}>Performance Dashboard</h1>
        <s-text color="subdued">Detailed overview of your donation channels and their individual performance.</s-text>
      </div>

      <s-stack direction="block" gap="large">

        {/* --- GLOBAL IMPACT --- */}
        <div style={{ background: 'linear-gradient(135deg, #6C4A79 0%, #4A3454 100%)', color: 'white', padding: '32px', borderRadius: '12px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <s-stack gap="small">
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px', fontWeight: 500 }}>Total Donation Amount</div>
              <FormatMoneyDisplay amount={loaderData.stats.totalImpact} currency={loaderData.currency} fontSize="48px" color="white" />
            </s-stack>
          </div>
        </div>


        {/* --- PERFORMANCE CARDS --- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>

          {/* PRESET STATS */}
          <div style={{ borderTop: '4px solid #008060', borderRadius: '12px' }}>
            <s-box padding="large" background="base" borderWidth="base" borderRadius="large" borderColor="base">
              <s-stack gap="base">
                <s-text type="strong">Preset Donation</s-text>
                <div style={{ background: '#F9FAFB', padding: '24px 16px', borderRadius: '8px', textAlign: 'center', minHeight: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FormatMoneyDisplay amount={loaderData.stats.preset} currency={loaderData.currency} fontSize="32px" color="#1A1C23" />
                </div>
                <s-button full-width variant="secondary" onClick={() => navigate("/app/preset-donation")}>View details</s-button>
              </s-stack>
            </s-box>
          </div>

          {/* POS STATS */}
          <div style={{ borderTop: '4px solid #D82C0D', borderRadius: '12px' }}>
            <s-box padding="large" background="base" borderWidth="base" borderRadius="large" borderColor="base">
              <s-stack gap="base">
                <s-text type="strong">Portion of Sale</s-text>
                <div style={{ background: '#F9FAFB', padding: '24px 16px', borderRadius: '8px', textAlign: 'center', minHeight: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FormatMoneyDisplay amount={typeof loaderData.stats.pos === 'object' ? loaderData.stats.pos.total : loaderData.stats.pos} currency={loaderData.currency} fontSize="32px" color="#1A1C23" />
                </div>
                <s-button full-width variant="secondary" onClick={() => navigate("/app/portion-sale")}>View details</s-button>
              </s-stack>
            </s-box>
          </div>

          {/* ROUNDUP STATS */}
          <div style={{ borderTop: '4px solid #965A00', borderRadius: '12px' }}>
            <s-box padding="large" background="base" borderWidth="base" borderRadius="large" borderColor="base">
              <s-stack gap="base">
                <s-text type="strong">Round-Up Donation</s-text>
                <div style={{ background: '#F9FAFB', padding: '24px 16px', borderRadius: '8px', textAlign: 'center', minHeight: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FormatMoneyDisplay amount={loaderData.stats.roundup} currency={loaderData.currency} fontSize="32px" color="#1A1C23" />
                </div>
                <s-button full-width variant="secondary" onClick={() => navigate("/app/roundup")}>View details</s-button>
              </s-stack>
            </s-box>
          </div>

          {/* RECURRING STATS */}
          <div style={{ borderTop: '4px solid #6C4A79', borderRadius: '12px' }}>
            <s-box padding="large" background="base" borderWidth="base" borderRadius="large" borderColor="base">
              <s-stack gap="base">
                <s-text type="strong">Recurring Donation</s-text>
                <div style={{ background: '#F9FAFB', padding: '24px 16px', borderRadius: '8px', textAlign: 'center', minHeight: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FormatMoneyDisplay amount={loaderData.stats.recurring} currency={loaderData.currency} fontSize="32px" color="#1A1C23" />
                </div>
                <s-button full-width variant="secondary" onClick={() => navigate("/app/recurring-subscriptions")}>View details</s-button>
              </s-stack>
            </s-box>
          </div>
        </div>

        {/* --- GLOBAL CONTROL --- */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <s-box padding="large" background="base" borderWidth="base" borderRadius="large" borderColor="base">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <s-stack gap="base">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <s-text type="strong">Global App Status</s-text>
                  <s-badge tone={enabled ? "success" : "warning"}>{enabled ? "Enabled" : "Paused"}</s-badge>
                </div>
                <s-text color="subdued">
                  {enabled
                    ? "Your donation widgets are currently visible and active on your storefront."
                    : "All donation features are currently hidden. Enable to resume collecting contributions."}
                </s-text>
              </s-stack>
              <s-button variant={enabled ? "secondary" : "primary"} onClick={toggleStatus}>
                {enabled ? "Disable All" : "Enable All"}
              </s-button>
            </div>
          </s-box>

          <s-box padding="large" background="base" borderWidth="base" borderRadius="large" borderColor="base">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <s-stack gap="base">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <s-text type="strong">Display Settings</s-text>
                  <s-badge tone={showOnEmptyCart ? "info" : "subdued"}>{showOnEmptyCart ? "Always Visible" : "Smart Hidden"}</s-badge>
                </div>
                <s-text color="subdued">
                  {showOnEmptyCart
                    ? "Donation blocks are always visible, even when the cart is empty."
                    : "Donation blocks are automatically hidden when the cart has 0 items."}
                </s-text>
              </s-stack>
              <s-button variant={showOnEmptyCart ? "secondary" : "primary"} onClick={toggleEmptyCart}>
                {showOnEmptyCart ? "Hide on Empty Cart" : "Show on Empty Cart"}
              </s-button>
            </div>
          </s-box>
        </div>

        {/* --- CURRENT PLAN --- */}
        <s-box padding="large" background="base" borderWidth="base" borderRadius="large" borderColor="base">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <s-stack gap="base">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <s-text type="strong">Current Pricing Plan</s-text>
                <s-badge tone="info">{(loaderData.currentPlan || 'basic').charAt(0).toUpperCase() + (loaderData.currentPlan || 'basic').slice(1)}</s-badge>
              </div>
              <s-text color="subdued">
                {loaderData.currentPlan === "pro" ? (
                  "You are currently on the Pro plan, which includes all available features."
                ) : (
                  `You are currently on the ${(loaderData.currentPlan || 'basic').charAt(0).toUpperCase() + (loaderData.currentPlan || 'basic').slice(1)} plan. Upgrade to unlock more features.`
                )}
              </s-text>
            </s-stack>
            <s-button variant="secondary" onClick={() => navigate('/app/pricing')}>
              View Plans
            </s-button>
          </div>
        </s-box>

        {/* --- CHANNELS --- */}
        <s-stack gap="base">
          <div style={{ paddingBottom: '8px' }}>
            <s-stack gap="small">
              <s-text type="strong">Giving Channels</s-text>
              <s-text color="subdued">Configure how your customers contribute to your causes.</s-text>
            </s-stack>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>

            {/* PRESET */}
            <s-box padding="large" background="base" borderWidth="base" borderRadius="large" borderColor="base">
              <s-stack gap="base">
                <div style={{ background: '#E3F1DF', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 20 20" style={{ width: '22px', fill: '#008060' }}><path d="M10 18.25a.75.75 0 0 1-.53-.22l-6.8-6.73a4.52 4.52 0 0 1 0-6.4 4.5 4.5 0 0 1 6.36 0L10 5.86l.97-.96a4.5 4.5 0 0 1 6.36 0 4.52 4.52 0 0 1 0 6.4l-6.8 6.73a.75.75 0 0 1-.53.22Z" /></svg>
                </div>
                <s-stack gap="base">
                  <s-text type="strong">Preset Donations</s-text>
                  <s-text color="subdued">Customers choose fixed amounts from your predefined list.</s-text>
                </s-stack>
                <div style={{ marginTop: '12px' }}>
                  <s-stack gap="small">
                    <s-button full-width variant="primary" onClick={() => navigate("/app/preset-donation")}>Manage Settings</s-button>
                    <s-button full-width variant="secondary" onClick={() => navigate("/app/preset-donation?tab=configuration")}>Configure Theme</s-button>
                  </s-stack>
                </div>
              </s-stack>
            </s-box>

            {/* POS */}
            <s-box padding="large" background="base" borderWidth="base" borderRadius="large" borderColor="base">
              <s-stack gap="base">
                <div style={{ background: '#FCEBE3', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 20 20" style={{ width: '22px', fill: '#D82C0D' }}><path d="M7 14.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm6-6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm1.28-4.78a.75.75 0 0 1 0 1.06l-10 10a.75.75 0 0 1-1.06-1.06l10-10a.75.75 0 0 1 1.06 0Z" /></svg>
                </div>
                <s-stack gap="base">
                  <s-text type="strong">Portion of Sale</s-text>
                  <s-text color="subdued">Donate a fixed amount or percentage from every order to your cause.</s-text>
                </s-stack>
                <div style={{ marginTop: '12px' }}>
                  <s-stack gap="small">
                    <s-button full-width variant="primary" onClick={() => navigate("/app/portion-sale")}>Manage Settings</s-button>
                    <s-button full-width variant="secondary" onClick={() => navigate("/app/portion-sale?tab=configuration")}>Configure Theme</s-button>
                  </s-stack>
                </div>
              </s-stack>
            </s-box>

            {/* ROUNDUP */}
            <s-box padding="large" background="base" borderWidth="base" borderRadius="large" borderColor="base">
              <s-stack gap="base">
                <div style={{ background: '#FFF4E5', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 20 20" style={{ width: '22px', fill: '#965A00' }}><path d="M10 2c-3.5 0-6.5 1.5-6.5 3.5s3 3.5 6.5 3.5 6.5-1.5 6.5-3.5-3-3.5-6.5-3.5Zm0 12c-3.5 0-6.5-1.5-6.5-3.5v-2.26c1.61 1.07 3.93 1.76 6.5 1.76s4.89-.69 6.5-1.76v2.26c0 2-3 3.5-6.5 3.5Zm0 4c-3.5 0-6.5-1.5-6.5-3.5v-2.26c1.61 1.07 3.93 1.76 6.5 1.76s4.89-.69 6.5-1.76v2.26c0 2-3 3.5-6.5 3.5Z" /></svg>
                </div>
                <s-stack gap="base">
                  <s-text type="strong">Round-Up Donation</s-text>
                  <s-text color="subdued">Round up the cart total and donate the spare change to your cause.</s-text>
                </s-stack>
                <div style={{ marginTop: '12px' }}>
                  <s-stack gap="small">
                    <s-button full-width variant="primary" onClick={() => navigate("/app/roundup")}>Manage Settings</s-button>
                    <s-button full-width variant="secondary" onClick={() => navigate("/app/roundup?tab=integration")}>Configure Theme</s-button>
                  </s-stack>
                </div>
              </s-stack>
            </s-box>

          </div>
        </s-stack>

        {/* --- SUPPORT --- */}
        <s-box padding="large" background="base" borderWidth="base" borderRadius="large" borderColor="base">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ maxWidth: '600px' }}>
              <s-stack gap="base">
                <div style={{ background: '#EBEBEB', padding: '4px 12px', borderRadius: '100px', display: 'inline-block', fontSize: '11px', fontWeight: 700 }}>EXPERT ASSISTANCE</div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>Need custom integration or business strategy?</div>
                <s-text color="subdued">Our dedicated impact consultants are available to help you with store setup, technical integration, and donation strategy at no extra cost.</s-text>
                <div style={{ marginTop: '12px' }}>
                  <s-button variant="primary" onClick={handleContactSupport}>Contact Support</s-button>
                </div>
              </s-stack>
            </div>
            <div style={{ textAlign: 'center', background: '#F9FAFB', padding: '24px', borderRadius: '16px', border: '1px solid #F1F2F3', marginLeft: '20px' }}>
              <img src="https://easydonation.zestardshop.com/assets/images/support.png" style={{ height: '70px', marginBottom: '12px' }} alt="Support" />
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#1A1C23' }}>Rapid Support</div>
            </div>
          </div>
        </s-box>

      </s-stack>
    </s-page>

  );

}

export const headers: HeadersFunction = (headersArgs) => {

  return boundary.headers(headersArgs);

};
