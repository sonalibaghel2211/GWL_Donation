import type { Campaign } from "@prisma/client";
import { useNavigate, useFetcher } from "react-router";

type PaginationData = {
  page: number;
  totalPages: number;
  totalCount: number;
  itemsPerPage: number;
};

type CampaignListProps = {
  campaigns: Campaign[];
  pagination: PaginationData | null;
  onPageChange: (page: number) => void;
};

export default function CampaignList({
  campaigns,
  pagination,
  onPageChange,
}: CampaignListProps) {
  const navigate = useNavigate();
  const fetcher = useFetcher();

  if (!campaigns || campaigns.length === 0) {
    return (
      <s-stack gap="base">

        <s-heading>No Campaigns Added Yet</s-heading>
        <s-paragraph>
          Add a campaign from the &apos;Add Campaign&apos; button above.
        </s-paragraph>
      </s-stack>
    );
  }

  const currentPage = pagination?.page || 1;
  const totalPages = pagination?.totalPages || 1;
  const totalCount = pagination?.totalCount || campaigns.length;
  const itemsPerPage = pagination?.itemsPerPage || 10;
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalCount);

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid #dfe3e8" }}>
              <th style={{ padding: "12px 8px" }}>Sr. No.</th>
              <th style={{ padding: "12px 8px" }}>Campaign Title</th>
              <th style={{ padding: "12px 8px" }}>Description</th>
              <th style={{ padding: "12px 8px" }}>Status</th>
              <th style={{ padding: "12px 8px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign, index) => (
              <tr
                key={campaign.id}
                style={{ borderBottom: "1px solid #dfe3e8" }}
              >
                <td style={{ padding: "12px 8px" }}>{startItem + index}</td>
                <td style={{ padding: "12px 8px" }}>
                  <s-stack direction="inline" gap="base">
                    {campaign.imageUrl && (
                      <img
                        src={campaign.imageUrl}
                        alt={campaign.name}
                        style={{
                          width: "40px",
                          height: "40px",
                          objectFit: "cover",
                          borderRadius: "4px",
                        }}
                      />
                    )}
                    <span>{campaign.name}</span>
                  </s-stack>
                </td>
                <td style={{ padding: "12px 8px", maxWidth: "300px" }}>
                  {campaign.description}
                </td>
                <td style={{ padding: "12px 8px" }}>
                  <s-badge tone={campaign.enabled ? "success" : "caution"}>
                    {campaign.enabled ? "Active" : "Disabled"}
                  </s-badge>
                </td>
                <td style={{ padding: "12px 8px" }}>
                  <s-stack direction="inline" gap="base">
                    <s-button
                      onClick={() =>
                        navigate(`/app/preset-donation/edit/${campaign.id}`)
                      }
                    >
                      Edit
                    </s-button>
                    <s-button
                      onClick={() => {
                        if (
                          confirm(
                            "Are you sure you want to delete this campaign?",
                          )
                        ) {
                          fetcher.submit(null, {
                            method: "post",
                            action: `/app/preset-donation/delete/${campaign.id}`,
                          });
                        }
                      }}
                    >
                      Delete
                    </s-button>
                  </s-stack>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: "20px",
          padding: "16px",
          backgroundColor: "#f6f6f7",
          borderRadius: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <s-paragraph>
          Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of{" "}
          <strong>{totalCount}</strong> campaigns
        </s-paragraph>

        <s-stack direction="inline" gap="base">
          <s-button
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            Previous
          </s-button>

          {totalPages <= 5 ? (
            Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (pageNum) => (
                <s-button
                  key={pageNum}
                  variant={pageNum === currentPage ? "primary" : "tertiary"}
                  onClick={() => onPageChange(pageNum)}
                >
                  {pageNum}
                </s-button>
              ),
            )
          ) : (
            <>
              {currentPage > 2 && (
                <s-button variant="tertiary" onClick={() => onPageChange(1)}>
                  1
                </s-button>
              )}
              {currentPage > 3 && <s-paragraph>...</s-paragraph>}
              {currentPage > 1 && (
                <s-button
                  variant="tertiary"
                  onClick={() => onPageChange(currentPage - 1)}
                >
                  {currentPage - 1}
                </s-button>
              )}
              <s-button variant="primary">{currentPage}</s-button>
              {currentPage < totalPages && (
                <s-button
                  variant="tertiary"
                  onClick={() => onPageChange(currentPage + 1)}
                >
                  {currentPage + 1}
                </s-button>
              )}
              {currentPage < totalPages - 1 && <s-paragraph>...</s-paragraph>}
              {currentPage < totalPages - 2 && (
                <s-button
                  variant="tertiary"
                  onClick={() => onPageChange(totalPages)}
                >
                  {totalPages}
                </s-button>
              )}
            </>
          )}

          <s-button
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Next
          </s-button>
        </s-stack>
      </div>
    </div>
  );
}
