interface MonthlyData {
  month: string;
  amount: number;
}

interface Campaign {
  id: string;
  name: string;
}

interface TrackDonationComponentProps {
  campaigns: Campaign[];
  selectedDonationName: string;
  selectedYear: string;
  years: string[];
  chartData: MonthlyData[];
  loading: boolean;
  onDonationNameChange: (id: string) => void;
  onYearChange: (year: string) => void;
  onTrack: () => void;
}

export default function TrackDonationComponent({
  campaigns,
  selectedDonationName,
  selectedYear,
  years,
  chartData,
  loading,
  onDonationNameChange,
  onYearChange,
  onTrack,
}: TrackDonationComponentProps) {
  const isLoading = loading;

  return (
    <>
      <s-banner tone="info">
        <s-paragraph>
          View detailed year-wise statistics of customer donations for the
          selected organization.
        </s-paragraph>
      </s-banner>

      <FilterSection
        campaigns={campaigns}
        selectedDonationName={selectedDonationName}
        selectedYear={selectedYear}
        years={years}
        onDonationNameChange={onDonationNameChange}
        onYearChange={onYearChange}
        onTrack={onTrack}
        loading={isLoading}
      />

      <ChartSection
        chartData={chartData}
        loading={loading}
        year={selectedYear}
      />
    </>
  );
}

function FilterSection({
  campaigns,
  selectedDonationName,
  selectedYear,
  years,
  onDonationNameChange,
  onYearChange,
  onTrack,
  loading,
}: {
  campaigns: Campaign[];
  selectedDonationName: string;
  selectedYear: string;
  years: string[];
  onDonationNameChange: (id: string) => void;
  onYearChange: (year: string) => void;
  onTrack: () => void;
  loading: boolean;
}) {


  const selectStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "4px",
    border: "1px solid #c9cccf",
    fontSize: "14px",
    backgroundColor: "#ffffff",
    color: "#202223",
    appearance: "auto",
    cursor: "pointer",
    height: "36px",
  };

  return (
    <s-box padding="base" background="subdued" borderRadius="base">
      <s-stack gap="base">
        <s-heading>Filters</s-heading>

        <s-grid gap="base" columns={{ sm: 1, md: 3 }}>
          {/* ── Donation Name ── */}
          <s-grid-item>
            <s-block-stack gap="base">
              <s-label>Select Donation Name</s-label>
              <select
                value={selectedDonationName || "all"}
                onChange={(e) => onDonationNameChange(e.target.value)}
                style={selectStyle}
                aria-label="Select Donation Name"
              >
                <option value="all">All Donations</option>
                {campaigns?.length === 0 ? (
                  <option value="" disabled>
                    No campaigns available
                  </option>
                ) : (
                  campaigns?.map((campaign) => (
                    <option key={campaign.id} value={campaign.name}>
                      {campaign.name}
                    </option>
                  ))
                )}
              </select>
            </s-block-stack>
          </s-grid-item>

          {/* ── Year ── */}
          <s-grid-item>
            <s-block-stack gap="base">
              <s-label>Select Year</s-label>
              <select
                value={selectedYear || "all"}
                onChange={(e) => onYearChange(e.target.value)}
                style={selectStyle}
                aria-label="Select Year"
              >
                <option value="all">All Years</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </s-block-stack>
          </s-grid-item>

          {/* ── Track Button ── */}
          <s-grid-item>
            <s-block-stack gap="base">
              <s-label>&nbsp;</s-label>
              <s-button
                variant="primary"
                onClick={onTrack}
                disabled={!selectedDonationName || !selectedYear || loading}
              >
                {loading ? "Loading..." : "Track"}
              </s-button>
            </s-block-stack>
          </s-grid-item>
        </s-grid>
      </s-stack>
    </s-box>
  );
}

function ChartSection({
  chartData,
  loading,
  year,
}: {
  chartData: MonthlyData[];
  loading: boolean;
  year: string;
}) {
  return (
    <s-box marginBlock="base">
      <s-block-stack gap="base">
        <s-heading>Donation Data Overview: {year === "all" ? "All Years" : year}</s-heading>

        <s-box padding="base" borderWidth="base" borderRadius="base">
          {chartData.length === 0 && !loading ? (
            <s-block-stack gap="base" align="center">
              <s-text>
                No data available. Select a donation and year, then click
                "Track" to view data.
              </s-text>
            </s-block-stack>
          ) : (
            <div
              style={{ height: "400px", width: "100%" }}
              id="donation-chart-container"
            >
              <canvas id="donation-chart"></canvas>
            </div>
          )}
        </s-box>
      </s-block-stack>
    </s-box>
  );
}
