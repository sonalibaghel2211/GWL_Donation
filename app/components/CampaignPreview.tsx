import type { CampaignFormData } from "./AddCampaign";

type CampaignPreviewProps = {
  formData: CampaignFormData;
};

export default function CampaignPreview({ formData }: CampaignPreviewProps) {
  const renderDonationOptions = () => {
    const amounts = formData.donationAmounts;

    switch (formData.displayStyle) {
      case "tabs":
        return (
          <div className="preview-tabs">
            {amounts.map((amount, index) => (
              <button
                key={amount}
                className={`preview-tab ${index === 0 ? "active" : ""}`}
              >
                ${amount}
              </button>
            ))}
            {formData.allowOtherAmount && (
              <button className="preview-tab">
                {formData.otherAmountTitle}
              </button>
            )}
          </div>
        );

      case "dropdown":
        return (
          <select className="preview-dropdown">
            <option value="">Select amount</option>
            {amounts.map((amount) => (
              <option key={amount} value={amount}>
                ${amount}
              </option>
            ))}
            {formData.allowOtherAmount && (
              <option value="other">{formData.otherAmountTitle}</option>
            )}
          </select>
        );

      case "radio_button":
        return (
          <div className="preview-radio-group">
            {amounts.map((amount) => (
              <label key={amount} className="preview-radio-label">
                <input type="radio" name="donation" value={amount} />
                <span>${amount}</span>
              </label>
            ))}
            {formData.allowOtherAmount && (
              <label className="preview-radio-label">
                <input type="radio" name="donation" value="other" />
                <span>{formData.otherAmountTitle}</span>
              </label>
            )}
          </div>
        );

      case "price_bar":
        return (
          <div className="preview-price-bar">
            {amounts.map((amount) => (
              <button key={amount} className="preview-price-btn">
                ${amount}
              </button>
            ))}
            {formData.allowOtherAmount && (
              <button className="preview-price-btn">
                {formData.otherAmountTitle}
              </button>
            )}
          </div>
        );

      case "text_box":
        return (
          <div className="preview-text-box">
            <input
              type="number"
              placeholder="Enter amount"
              className="preview-input"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="campaign-preview">
      <s-box
        padding="base"
        borderWidth="base"
        borderRadius="base"
        background="subdued"
      >
        <s-paragraph>
          <strong>Live Preview</strong>
        </s-paragraph>

        <s-divider />

        <s-stack direction="block" gap="base">
          <s-heading>{formData.name || "Campaign Title"}</s-heading>

          {formData.imageUrl ? (
            <img
              src={formData.imageUrl}
              alt="Campaign"
              className="preview-image"
            />
          ) : (
            <div className="preview-image-placeholder">No Image</div>
          )}

          <s-paragraph>
            {formData.description || "Campaign description will appear here..."}
          </s-paragraph>

          <s-divider />

          <s-paragraph>
            <strong>Select Donation Amount:</strong>
          </s-paragraph>

          {renderDonationOptions()}

          <s-button variant="primary" disabled>
            Donate
          </s-button>

          <s-paragraph>
            <s-text tone="subdued" as="span">
              Thank you for your support!
            </s-text>
          </s-paragraph>
        </s-stack>
      </s-box>

      <style>{`
        .campaign-preview {
          position: sticky;
          top: 20px;
        }
        .preview-image {
          width: 100%;
          max-height: 200px;
          object-fit: cover;
          border-radius: 8px;
        }
        .preview-image-placeholder {
          width: 100%;
          height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e0e0e0;
          border-radius: 8px;
          color: #666;
          font-size: 14px;
        }
        .preview-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .preview-tab {
          padding: 8px 16px;
          border: 1px solid #008060;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          color: #008060;
        }
        .preview-tab.active {
          background: #008060;
          color: white;
        }
        .preview-dropdown {
          width: 100%;
          padding: 10px;
          border: 1px solid #dfe3e8;
          border-radius: 6px;
          font-size: 14px;
          margin-bottom: 12px;
        }
        .preview-radio-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }
        .preview-radio-label {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: 1px solid #dfe3e8;
          border-radius: 6px;
          cursor: pointer;
        }
        .preview-radio-label input {
          accent-color: #008060;
        }
        .preview-price-bar {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .preview-price-btn {
          flex: 1;
          min-width: 60px;
          padding: 12px 8px;
          border: 2px solid #008060;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          color: #008060;
        }
        .preview-text-box {
          margin-bottom: 12px;
        }
        .preview-input {
          width: 100%;
          padding: 10px;
          border: 1px solid #dfe3e8;
          border-radius: 6px;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
