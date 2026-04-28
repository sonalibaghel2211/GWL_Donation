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

  const { session } = await authenticate.admin(request);

  const shop = session.shop;

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
    presetStats,
    presetLast7Days,
    posLogs,
    recurringLogs,
    appSettings,
    posSettings,
    roundupSettings,
    campaignsCount
  ] = await Promise.all([
    prisma.donation.aggregate({
      where: { campaign: { shop } },
      _sum: { amount: true }
    }),
    prisma.donation.aggregate({
      where: { campaign: { shop }, createdAt: { gte: last7DaysDate } },
      _sum: { amount: true }
    }),
    prisma.posDonationLog.findMany({ where: { shop } }),
    prisma.recurringDonationLog.findMany({ where: { shop } }),
    prisma.appSettings.findUnique({ where: { shop } }),
    prisma.posDonationSettings.findUnique({ where: { shop } }),
    prisma.roundUpDonationSettings.findUnique({ where: { shop } }),
    prisma.campaign.count({ where: { shop, enabled: true } })
  ]);

  try {
    const fs = await import('fs');
    fs.writeFileSync('/tmp/dashboard_debug.json', JSON.stringify({
      shop,
      posLogsCount: posLogs.length,
      recurringLogsCount: recurringLogs.length,
      samplePosLog: posLogs[0],
      presetStats
    }, null, 2));
  } catch (e) { }

  // Aggregate POS and Round-Up in JS
  const allPosLogs = posLogs as any[];
  const posStats = allPosLogs.filter(l => l.type === 'pos');
  const roundupStats = allPosLogs.filter(l => l.type === 'roundup');

  const totalPos = posStats.reduce((acc, l) => acc + (l.donationAmount || 0), 0);
  const totalRoundup = roundupStats.reduce((acc, l) => acc + (l.donationAmount || 0), 0);
  const posOrderCountInt = posStats.length;

  const last7DaysPos = posStats
    .filter(l => new Date(l.createdAt) >= last7DaysDate)
    .reduce((acc, l) => acc + (l.donationAmount || 0), 0);

  const last7DaysRoundup = roundupStats
    .filter(l => new Date(l.createdAt) >= last7DaysDate)
    .reduce((acc, l) => acc + (l.donationAmount || 0), 0);

  // Recurring Stats
  const allRecurringLogs = recurringLogs as any[];
  const totalRecurring = allRecurringLogs.reduce((acc, l) => acc + (l.donationAmount || 0), 0);
  const last7DaysRecurring = allRecurringLogs
    .filter(l => new Date(l.createdAt) >= last7DaysDate)
    .reduce((acc, l) => acc + (l.donationAmount || 0), 0);

  const totalPreset = presetStats._sum.amount || 0;
  const totalImpact = totalPreset + totalPos + totalRoundup + totalRecurring;

  const last7DaysPreset = presetLast7Days._sum.amount || 0;
  const totalLast7Days = last7DaysPreset + last7DaysPos + last7DaysRoundup + last7DaysRecurring;

  // Count active channels
  let activeChannels = 0;
  if (campaignsCount > 0) activeChannels++;
  if (posSettings?.enabled) activeChannels++;
  if (roundupSettings?.enabled) activeChannels++;

  return {
    enabled: appSettings?.enabled ?? true,
    shop: session.shop,
    stats: {
      totalImpact: totalImpact.toFixed(2),
      totalLast7Days: totalLast7Days.toFixed(2),
      activeChannels: activeChannels,
      preset: {
        total: totalPreset.toFixed(2),
        last7Days: last7DaysPreset.toFixed(2)
      },
      pos: {
        total: totalPos.toFixed(2),
        orderCount: posOrderCountInt,
        last7Days: last7DaysPos.toFixed(2)
      },
      roundup: {
        total: totalRoundup.toFixed(2)
      },
      recurring: {
        total: totalRecurring.toFixed(2)
      }
    }
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {

  const { session, admin } = await authenticate.admin(request);

  const shop = session.shop;

  const formData = await request.formData();

  const enabled = formData.get("enabled") === "true";

  await prisma.appSettings.upsert({

    where: { shop },

    update: { enabled },

    create: { shop, enabled },

  });

  try {

    const appResponse = await admin.graphql(`query { currentAppInstallation { id } }`);

    const appData = await appResponse.json();

    const appId = appData.data.currentAppInstallation.id;

    await admin.graphql(`

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

            namespace: "common",

            key: "enabled",

            type: "boolean",

            value: String(enabled)

          }

        ]

      }

    });

  } catch (e) {

    console.error("Error syncing global settings to Metafields:", e);

  }

  return { status: "success" };

};

export default function Index() {

  const loaderData = useLoaderData<typeof loader>();

  const fetcher = useFetcher();

  const shopify = useAppBridge();

  const navigate = useNavigate();

  const [enabled, setEnabled] = useState(loaderData?.enabled ?? true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");

  useEffect(() => {
    if (fetcher.data?.status === "success") {
      shopify.toast.show(`App ${enabled ? "enabled" : "disabled"} successfully`);
    }
  }, [fetcher.data, enabled, shopify]);

  const toggleStatus = () => {
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    const formData = new FormData();
    formData.append("enabled", String(nextEnabled));
    fetcher.submit(formData, { method: "POST" });
  };

  const handleContactSupport = () => {
    if ((window as any).Tawk_API) {
      (window as any).Tawk_API.maximize();
    } else {
      shopify.toast.show("Support chat is loading...", { duration: 3000 });
    }
  };

  const submitReview = () => {
    shopify.toast.show("Thank you for your feedback!", { duration: 5000 });
    setShowReviewModal(false);
  };

  return (
    <s-page>
      {/* --- REVIEW MODAL --- */}
      {showReviewModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'white', padding: '32px', borderRadius: '16px',
            width: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <s-stack gap="large">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <s-text type="strong">Write a Review</s-text>
                <s-button variant="secondary" onClick={() => setShowReviewModal(false)}>✕</s-button>
              </div>

              <s-stack gap="base">
                <s-text color="subdued">How would you rate your experience?</s-text>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      style={{
                        background: 'none', border: 'none', fontSize: '24px',
                        cursor: 'pointer', color: star <= rating ? '#FFB800' : '#E5E7EB'
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </s-stack>

              <s-stack gap="small">
                <s-text color="subdued">Your feedback helps us improve.</s-text>
                <textarea
                  placeholder="Tell us what you think..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  style={{
                    width: '100%', minHeight: '120px', padding: '12px',
                    borderRadius: '8px', border: '1px solid #E1E3E5',
                    fontFamily: 'inherit'
                  }}
                />
              </s-stack>

              <div style={{ display: 'flex', gap: '12px' }}>
                <s-button full-width variant="primary" onClick={submitReview}>Submit Feedback</s-button>
                <s-button full-width variant="secondary" onClick={() => setShowReviewModal(false)}>Cancel</s-button>
              </div>
            </s-stack>
          </div>
        </div>
      )}

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
              <div style={{ fontSize: '48px', fontWeight: 800, color: 'white' }}>$ {loaderData.stats.totalImpact}</div>
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
                <div style={{ background: '#F9FAFB', padding: '32px 24px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 600, color: '#637381' }}>$</span>
                    <span style={{ fontSize: '32px', fontWeight: 700, color: '#1A1C23' }}>{loaderData.stats.preset.total}</span>
                  </div>
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
                <div style={{ background: '#F9FAFB', padding: '32px 24px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 600, color: '#637381' }}>$</span>
                    <span style={{ fontSize: '32px', fontWeight: 700, color: '#1A1C23' }}>{loaderData.stats.pos.total}</span>
                  </div>
                </div>
                <s-button full-width variant="secondary" onClick={() => navigate("/app/pos-donation")}>View details</s-button>
              </s-stack>
            </s-box>
          </div>

          {/* ROUNDUP STATS */}
          <div style={{ borderTop: '4px solid #965A00', borderRadius: '12px' }}>
            <s-box padding="large" background="base" borderWidth="base" borderRadius="large" borderColor="base">
              <s-stack gap="base">
                <s-text type="strong">Round-Up Donation</s-text>
                <div style={{ background: '#F9FAFB', padding: '32px 24px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 600, color: '#637381' }}>$</span>
                    <span style={{ fontSize: '32px', fontWeight: 700, color: '#1A1C23' }}>{loaderData.stats.roundup.total}</span>
                  </div>
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
                <div style={{ background: '#F9FAFB', padding: '32px 24px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 600, color: '#637381' }}>$</span>
                    <span style={{ fontSize: '32px', fontWeight: 700, color: '#1A1C23' }}>{loaderData.stats.recurring?.total || "0.00"}</span>
                  </div>
                </div>
                <s-button full-width variant="secondary" onClick={() => navigate("/app/recurring-subscriptions")}>View details</s-button>
              </s-stack>
            </s-box>
          </div>
        </div>

        {/* --- GLOBAL CONTROL --- */}
        <s-box padding="large" background="base" borderWidth="base" borderRadius="large" borderColor="base">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <s-stack gap="base">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <s-text type="strong">Global App Status</s-text>
                <s-badge tone={enabled ? "success" : "warning"}>{enabled ? "Enable" : "Paused"}</s-badge>
              </div>
              <s-text color="subdued">
                {enabled
                  ? "Your donation widgets are currently visible and active on your storefront."
                  : "All donation features are currently hidden. Enable to resume collecting contributions."}
              </s-text>
            </s-stack>
            <s-button variant={enabled ? "secondary" : "primary"} onClick={toggleStatus}>
              {enabled ? "Disable All Widgets" : "Enable All Widgets"}
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
                  <s-text type="strong">One-Time Donations</s-text>
                  <s-text color="subdued">Customers choose fixed amounts from your predefined list.</s-text>
                </s-stack>
                <div style={{ marginTop: '12px' }}>
                  <s-stack gap="small">
                    <s-button full-width variant="primary" onClick={() => navigate("/app/preset-donation")}>Manage Setting</s-button>
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
                  <s-text type="strong">Revenue Sharing</s-text>
                  <s-text color="subdued">Automatically donate a percentage of every order or product sale.</s-text>
                </s-stack>
                <div style={{ marginTop: '12px' }}>
                  <s-stack gap="small">
                    <s-button full-width variant="primary" onClick={() => navigate("/app/pos-donation")}>Manage Setting</s-button>
                    <s-button full-width variant="secondary" onClick={() => navigate("/app/pos-donation?tab=configuration")}>Configure Theme</s-button>
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
                  <s-text type="strong">Change Roundups</s-text>
                  <s-text color="subdued">Round up the order total at checkout and donate the difference.</s-text>
                </s-stack>
                <div style={{ marginTop: '12px' }}>
                  <s-stack gap="small">
                    <s-button full-width variant="primary" onClick={() => navigate("/app/roundup")}>Manage Setting</s-button>
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
                  <s-stack direction="inline" gap="base">
                    <s-button variant="primary" onClick={() => setShowReviewModal(true)}>Write Review</s-button>
                    <s-button variant="secondary" onClick={handleContactSupport}>Contact Support</s-button>
                  </s-stack>
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
