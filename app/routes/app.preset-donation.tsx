import { useState, useEffect } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import {
  useNavigate,
  useLoaderData,
  useSearchParams,
  data,
  useFetcher,
} from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import CampaignList from "../components/CampaignList";
import ConfigurationTab, { PRODUCT_PREVIEW_SVG, CART_PREVIEW_SVG } from "../components/ConfigurationTab";
import SettingsTab from "../components/SettingsTab";

const ITEMS_PER_PAGE = 10;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  let isAuthenticated = false;
  let session: { shop: string } | null = null;

  try {
    const auth = await authenticate.admin(request);
    session = auth.session;
    isAuthenticated = true;
  } catch (authError) {
    console.error("Authentication error:", authError);
    return {
      campaigns: [],
      error: "Authentication failed. Please refresh the page or log in again.",
      pagination: null,
      blockConfig: { productBlockEnabled: true, cartBlockEnabled: true },
      shop: "",
    };
  }

  if (!isAuthenticated || !session) {
    return {
      campaigns: [],
      error: "Please log in to access this page.",
      pagination: null,
      blockConfig: { productBlockEnabled: true, cartBlockEnabled: true },
      shop: "",
    };
  }

  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const skip = (page - 1) * ITEMS_PER_PAGE;

    const [campaigns, totalCount, blockConfig, appSettings] = await Promise.all([
      prisma.campaign.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: ITEMS_PER_PAGE,
      }),
      prisma.campaign.count(),
      prisma.blockConfig.findUnique({ where: { shop: session.shop } }),
      prisma.appSettings.findUnique({ where: { shop: session.shop } }),
    ]);

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return {
      campaigns,
      error: null,
      pagination: {
        page,
        totalPages,
        totalCount,
        itemsPerPage: ITEMS_PER_PAGE,
      },
      blockConfig: blockConfig ?? {
        productBlockEnabled: true,
        cartBlockEnabled: true,
      },
      shop: session.shop,
      appSettings,
    };
  } catch (error) {
    console.error("Loader error:", error);
    return {
      campaigns: [],
      error: "Failed to load data. Please try again.",
      pagination: null,
      blockConfig: { productBlockEnabled: true, cartBlockEnabled: true },
      shop: session?.shop ?? "",
      appSettings: null,
    };
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "getCampaigns") {
    const campaigns = await prisma.campaign.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return data({ success: true, campaigns });
  }

  if (intent === "saveSettings") {
    const shop = formData.get("shop") as string;
    const settingsPayload = JSON.parse(formData.get("settings") as string);
    try {
      await prisma.appSettings.upsert({
        where: { shop },
        create: {
          shop,
          ...settingsPayload,
        },
        update: {
          ...settingsPayload,
        },
      });
      return data({ success: true, message: "Settings saved successfully" });
    } catch (error) {
      console.error(error);
      return data({ success: false, error: "Failed to save settings" }, { status: 500 });
    }
  }

  return data({ success: false, error: "Invalid intent" }, { status: 400 });
};

const tabs = [
  { id: "campaign", label: "Donation Campaigns" },
  { id: "settings", label: "Settings" },
  { id: "config", label: "Configuration" },
];

export default function PresetDonation() {
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    initialTabParam === "configuration" ? "config" :
      (initialTabParam === "settings" ? "settings" : "campaign")
  );

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "configuration") setActiveTab("config");
    else if (tab === "settings") setActiveTab("settings");
    else if (tab === "campaign") setActiveTab("campaign");
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    const tabParam = tabId === "config" ? "configuration" : tabId;
    setSearchParams({ tab: tabParam });
  };
  const { campaigns, error, pagination, blockConfig, shop, appSettings } =
    useLoaderData<typeof loader>();

  const handlePageChange = (newPage: number) => {
    setSearchParams({ page: String(newPage) });
  };

  return (
    <s-page heading="Donation Preferences">
      {activeTab === "campaign" && (
        <s-button
          slot="primary-action"
          variant="primary"
          onClick={() => navigate("/app/preset-donation/add")}
        >
          Add Campaign
        </s-button>
      )}
      {activeTab === "settings" && (
        <s-button
          slot="primary-action"
          variant="primary"
          onClick={() => {
            const form = document.getElementById("settings-form");
            if (form) form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
            shopify.toast.show("Settings saved successfully");
          }}
        >
          Save Settings
        </s-button>
      )}

      <div className="polaris-tabs">
        <div className="polaris-tabs-list" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`polaris-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="polaris-tab-panel">
        {activeTab === "settings" && (
          <s-section>
            <SettingsTab initialSettings={appSettings} shop={shop} />
          </s-section>
        )}

        {activeTab === "campaign" && (
          <s-section>
            {error ? (
              <s-banner tone="critical">
                <s-paragraph>{error}</s-paragraph>
              </s-banner>
            ) : (
              <CampaignList
                campaigns={campaigns}
                pagination={pagination}
                onPageChange={handlePageChange}
              />
            )}
          </s-section>
        )}

        {activeTab === "config" && (
          <s-section>
            <ConfigurationTab
              blocks={[
                {
                  id: "product",
                  title: "Product Page Setup",
                  description: "To add the donation section to your product page, click the button below to insert the app block.",
                  themeEditorUrl: `https://${shop}/admin/themes/current/editor?template=product&context=apps`,
                  buttonLabel: "Donation App Block on Product Page",
                  previewSvg: PRODUCT_PREVIEW_SVG,
                  enabled: blockConfig.productBlockEnabled,
                  instructions: [
                    "Go to ", "Online Store → Themes", " → Click on ", "Customize",
                    " → Select Product Page Template ", "Click Add Block", " → Select ",
                    "Donation Product Page", " → Click ", "Save"
                  ],
                  onToggle: (enabled) => {
                    const formData = new FormData();
                    formData.append("productBlockEnabled", String(enabled));
                    formData.append("cartBlockEnabled", String(blockConfig.cartBlockEnabled));
                    fetcher.submit(formData, { method: "POST", action: "/api/block-config" });
                  }
                },
                {
                  id: "cart",
                  title: "Cart Page Setup",
                  description: "To add the donation section to your cart page, click the button below to insert the app block.",
                  themeEditorUrl: `https://${shop}/admin/themes/current/editor?template=cart&context=apps`,
                  buttonLabel: "Donation App Block on Cart Page",
                  previewSvg: CART_PREVIEW_SVG,
                  enabled: blockConfig.cartBlockEnabled,
                  instructions: [
                    "Go to ", "Online Store → Themes", " → Click on ", "Customize",
                    " → Select Cart Page Template ", "Click Add Block", " → Select ",
                    "Donation Cart Widget", " → Click ", "Save"
                  ],
                  onToggle: (enabled) => {
                    const formData = new FormData();
                    formData.append("productBlockEnabled", String(blockConfig.productBlockEnabled));
                    formData.append("cartBlockEnabled", String(enabled));
                    fetcher.submit(formData, { method: "POST", action: "/api/block-config" });
                  }
                }
              ]}
            />
          </s-section>
        )}
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
        .polaris-tab-panel {
          padding-top: 8px;
        }
      `}</style>
    </s-page>
  );
}
