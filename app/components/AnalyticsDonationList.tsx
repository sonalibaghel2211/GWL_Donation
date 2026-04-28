import { useState, useEffect } from "react";
import { useFetcher } from "react-router";

interface DonationRecord {
  id: string;
  campaignName: string;
  donorName: string | null;
  donorEmail: string | null;
  amount: number;
  createdAt: string;
}

interface Campaign {
  id: string;
  name: string;
}

interface AnalyticsDonationListProps {
  campaigns?: Campaign[];
  donations: DonationRecord[];
  loading: boolean;
}

export default function AnalyticsDonationList({
  campaigns,
  donations,
  loading,
}: AnalyticsDonationListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const resendFetcher = useFetcher<{ success?: boolean; error?: string }>();
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{message: string, isError: boolean} | null>(null);

  useEffect(() => {
    if (resendFetcher.state === "idle" && resendingId !== null) {
      if (resendFetcher.data?.success) {
        setToastMsg({ message: "Email sent successfully", isError: false });
      } else if (resendFetcher.data?.error) {
        setToastMsg({ message: resendFetcher.data.error, isError: true });
      }
      setResendingId(null);
      setTimeout(() => setToastMsg(null), 3000);
    }
  }, [resendFetcher.state, resendFetcher.data, resendingId]);

  const handleResend = (donationId: string) => {
    setResendingId(donationId);
    resendFetcher.submit(
      { donationId },
      { method: "post", action: "/api/resend-donation-email" }
    );
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [donations]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const totalPages = Math.ceil(donations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDonations = donations.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  if (!loading && donations.length === 0) {
    return (
      <s-box>
        <s-card>
          <s-block-stack gap="base" align="center">
            <s-text>No donation records available</s-text>
          </s-block-stack>
        </s-card>
      </s-box>
    );
  }

  return (
    <s-box>
      {toastMsg && (
        <div style={{ marginBottom: "16px" }}>
          <s-banner tone={toastMsg.isError ? "critical" : "success"}>
            <s-text>{toastMsg.message}</s-text>
          </s-banner>
        </div>
      )}
      <s-stack gap="base">
        <s-card>
          {loading ? (
            <s-block-stack gap="base" align="center">
              <s-text>Loading...</s-text>
            </s-block-stack>
          ) : (
            <>
              <div className="donation-table-wrapper">
                <table className="donation-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Donation Name</th>
                      <th>Donor Name</th>
                      <th>Donor Email</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Resend Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDonations.map((donation, index) => (
                      <tr key={donation.id}>
                        <td>{startIndex + index + 1}</td>
                        <td>{donation.campaignName}</td>
                        <td>{donation.donorName || "-"}</td>
                        <td>{donation.donorEmail || "-"}</td>
                        <td>
                          <s-badge tone="success">
                            {formatCurrency(donation.amount)}
                          </s-badge>
                        </td>
                        <td>{formatDate(donation.createdAt)}</td>
                        <td>
                          {donation.donorEmail ? (
                            <s-button
                              disabled={resendingId === donation.id}
                              onClick={() => handleResend(donation.id)}
                              variant={resendingId === donation.id ? "secondary" : "primary"}
                            >
                              {resendingId === donation.id ? "Sending..." : "Resend"}
                            </s-button>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <s-grid gap="base">
                  <s-grid-item gridColumn="span 4">
                    <s-block-stack gap="base">
                      <s-text>
                        Page {currentPage} of {totalPages}
                      </s-text>
                    </s-block-stack>
                  </s-grid-item>
                  <s-grid-item gridColumn="span 4">
                    <s-block-stack gap="base" align="center">
                      <s-stack direction="inline" gap="base">
                        <s-button
                          variant="secondary"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => p - 1)}
                        >
                          Previous
                        </s-button>
                        <s-button
                          variant="secondary"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((p) => p + 1)}
                        >
                          Next
                        </s-button>
                      </s-stack>
                    </s-block-stack>
                  </s-grid-item>
                  <s-grid-item gridColumn="span 4">
                    <s-block-stack gap="base" align="end">
                      <s-text>Total: {donations.length} records</s-text>
                    </s-block-stack>
                  </s-grid-item>
                </s-grid>
              )}
            </>
          )}
        </s-card>
      </s-stack>

      <style>{`
        .donation-table-wrapper {
          overflow-x: auto;
        }
        .donation-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .donation-table th {
          text-align: left;
          padding: 12px 16px;
          background-color: #f6f6f7;
          border-bottom: 1px solid #dfe3e8;
          font-weight: 600;
          color: #000000;
        }
        .donation-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #dfe3e8;
        }
        .donation-table tr:hover td {
          background-color: #fafafa;
        }
      `}</style>
    </s-box>
  );
}
