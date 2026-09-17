import type { Campaign } from "@prisma/client";

type DonationRecord = {
  id: string;
  orderId: string | null;
  amount: number;
  donationOption: string;
  createdAt: Date | string;
};

type AnalyticsData = {
  stats: {
    recentDonations: number | { primary?: { amount: number } };
    totalDonations: number | { primary?: { amount: number } };
  };
  lastDonations: DonationRecord[];
  recentCampaigns: Campaign[];
};

type AnalyticsComponentProps = {
  data: AnalyticsData;
  currency?: string;
};

function formatMoney(amount: number | string, currency = "USD") {
  const num = typeof amount === "number" ? amount : parseFloat(amount || "0");
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
    }).format(num);
  } catch (e) {
    return `${currency || "USD"} ${num.toFixed(2)}`;
  }
}

export default function AnalyticsComponent({ data, currency = "USD" }: AnalyticsComponentProps) {
  const { stats } = data;

  const recentVal =
    typeof stats.recentDonations === "object" && stats.recentDonations !== null && "primary" in stats.recentDonations && (stats.recentDonations as any).primary
      ? (stats.recentDonations as any).primary.amount
      : typeof stats.recentDonations === "number" ? stats.recentDonations : 0;

  const totalVal =
    typeof stats.totalDonations === "object" && stats.totalDonations !== null && "primary" in stats.totalDonations && (stats.totalDonations as any).primary
      ? (stats.totalDonations as any).primary.amount
      : typeof stats.totalDonations === "number" ? stats.totalDonations : 0;

  return (
    <div className="analytics-component">
      <div className="analytics-cards-row">
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="base">
            <span className="dotted-title">Recent Donations</span>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#1A1C23", lineHeight: 1.2 }}>
              {formatMoney(recentVal, currency)}
            </div>
            <s-paragraph>
              Total donation amount collected in the last 7 days.
            </s-paragraph>
          </s-stack>
        </s-box>

        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="base">
            <span className="dotted-title">Total Donations</span>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#1A1C23", lineHeight: 1.2 }}>
              {formatMoney(totalVal, currency)}
            </div>
            <s-paragraph>
              All-time donation amount collected using Donation Preferences.
            </s-paragraph>
          </s-stack>
        </s-box>
      </div>

      <style>{`
        .analytics-cards-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .analytics-component {
          padding: 8px 0;
        }
        .dotted-title {
          border-bottom: 2px dotted #8c9196;
          font-weight: 500;
          color: #202223;
          padding-bottom: 2px;
          display: inline-block;
        }
      `}</style>
    </div>
  );
}

