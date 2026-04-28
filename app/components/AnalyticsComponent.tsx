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
    recentDonations: number;
    totalDonations: number;
  };
  lastDonations: DonationRecord[];
  recentCampaigns: Campaign[];
};

type AnalyticsComponentProps = {
  data: AnalyticsData;
};

export default function AnalyticsComponent({ data }: AnalyticsComponentProps) {
  const { stats, lastDonations } = data;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="analytics-component">
      <div className="analytics-cards-row">
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="base">
            <span className="dotted-title">Recent Donations</span>
            <s-heading>{formatCurrency(stats.recentDonations)}</s-heading>
            <s-paragraph>
              Total donation amount collected in the last 7 days.
            </s-paragraph>
          </s-stack>
        </s-box>

        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="base">
            <span className="dotted-title">Total Donations</span>
            <s-heading>{formatCurrency(stats.totalDonations)}</s-heading>
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
