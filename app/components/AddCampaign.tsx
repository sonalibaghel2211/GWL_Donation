import { useState, useRef, useEffect } from "react";
import CampaignPreview from "./CampaignPreview";

export type CampaignFormData = {
  name: string;
  description: string;
  imageUrl: string;
  enabled: boolean;
  displayStyle: string;
  donationAmounts: string[];
  allowOtherAmount: boolean;
  otherAmountTitle: string;
  isRecurringEnabled: boolean;
};

type AddCampaignProps = {
  formData: CampaignFormData;
  onFormChange: (data: Partial<CampaignFormData>) => void;
  currency?: string;
};

export default function AddCampaign({
  formData,
  onFormChange,
  currency,
}: AddCampaignProps) {
  const moneyFormatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || "USD",
  });
  const [newAmount, setNewAmount] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const choiceListRef = useRef<any>(null);

  useEffect(() => {
    const el = choiceListRef.current;
    if (!el) return;
    const handleChange = (e: any) => {
      const val = e.detail?.selected?.[0] || e.detail?.value || e.target?.value || e.target?.values?.[0];
      if (val) onFormChange({ displayStyle: String(val) });
    };
    el.addEventListener("change", handleChange);
    el.addEventListener("input", handleChange);
    return () => {
      el.removeEventListener("change", handleChange);
      el.removeEventListener("input", handleChange);
    };
  }, [onFormChange]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log("[AddCampaign] File selected:", file?.name, file?.size);
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        console.log(
          "[AddCampaign] File read to base64, length:",
          base64.length,
        );
        console.log("[AddCampaign] Base64 preview:", base64.substring(0, 100));
        onFormChange({ imageUrl: base64 });
      };
      reader.onerror = () => {
        console.error("[AddCampaign] File read error");
      };
      reader.readAsDataURL(file);
    }
  };

  const addDonationAmount = () => {
    if (newAmount && !formData.donationAmounts.includes(newAmount)) {
      onFormChange({
        donationAmounts: [...formData.donationAmounts, newAmount],
      });
      setNewAmount("");
    }
  };

  const removeDonationAmount = (amount: string) => {
    onFormChange({
      donationAmounts: formData.donationAmounts.filter((a) => a !== amount),
    });
  };

  return (
    <s-grid gridTemplateColumns="repeat(12, 1fr)" gap="base">
      <s-grid-item gridColumn="span 8">
        <s-stack gap="base">
          <s-section>
            <s-heading>Campaign Status</s-heading>
            <s-badge tone={formData.enabled ? "success" : "caution"}>
              {formData.enabled ? "Enabled" : "Disabled"}
            </s-badge>
            <s-paragraph>Enable or disable the Campaign</s-paragraph>
            <s-button
              onClick={() => onFormChange({ enabled: !formData.enabled })}
            >
              {formData.enabled ? "Disable" : "Enable"}
            </s-button>
          </s-section>

          <s-section>
            <s-text-field
              label="Donation campaign title"
              value={formData.name}
              onChange={(e) => onFormChange({ name: e.currentTarget.value })}
              autocomplete="off"
              placeholder="Donation for better society"
            />

            <s-text-area
              label="Donation Description"
              value={formData.description}
              onChange={(e) =>
                onFormChange({ description: e.currentTarget.value })
              }
              autocomplete="off"
              placeholder="Your donation contributes to a better society and makes a significant impact in the world."
              rows={3}
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            <div style={{ marginBottom: "12px" }}>
              <s-stack direction="inline" gap="base">
                <s-button
                  variant="primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {formData.imageUrl ? "Change Image" : "Upload Image"}
                </s-button>
                {formData.imageUrl && (
                  <s-button
                    variant="secondary"
                    onClick={() => onFormChange({ imageUrl: "" })}
                  >
                    Remove
                  </s-button>
                )}
              </s-stack>
            </div>

            {formData.imageUrl && (
              <div
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: "100%",
                }}
              >
                <img
                  src={formData.imageUrl}
                  alt="Campaign"
                  style={{
                    width: "100%",
                    maxHeight: "200px",
                    objectFit: "cover",
                    borderRadius: "8px",
                    marginTop: "8px",
                  }}
                />
              </div>
            )}
          </s-section>

          <s-section>
            <s-heading>Donation Amount Settings</s-heading>

            <s-choice-list
              ref={choiceListRef}
              label="Select the display style for the donation amount"
              values={[formData.displayStyle]}
            >
              <s-choice value="tabs" selected={formData.displayStyle === "tabs"}>Tabs</s-choice>
              <s-choice value="dropdown" selected={formData.displayStyle === "dropdown"}>Dropdown</s-choice>
              <s-choice value="radio_button" selected={formData.displayStyle === "radio_button"}>Radio Button</s-choice>
              <s-choice value="price_bar" selected={formData.displayStyle === "price_bar"}>Price Bar</s-choice>
              <s-choice value="text_box" selected={formData.displayStyle === "text_box"}>Text Box</s-choice>
            </s-choice-list>

            <s-stack direction="block" gap="base">
              <s-paragraph>Donation amounts:</s-paragraph>
              <s-stack direction="inline" gap="base">
                {formData.donationAmounts.map((amount) => (
                  <div
                    key={amount}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: "#E7F0FF",
                      color: "#2C6ECB",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      gap: "8px",
                      border: "1px solid #D1E1FF",
                      fontSize: "14px",
                      fontWeight: 600,
                    }}
                  >
                    <span>{moneyFormatter.format(Number(amount))}</span>
                    <button
                      onClick={() => removeDonationAmount(amount)}
                      style={{
                        background: "rgba(44, 110, 203, 0.1)",
                        border: "none",
                        borderRadius: "50%",
                        width: "18px",
                        height: "18px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#2C6ECB",
                        padding: 0,
                        transition: "background 0.2s",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = "rgba(44, 110, 203, 0.2)")}
                      onMouseOut={(e) => (e.currentTarget.style.background = "rgba(44, 110, 203, 0.1)")}
                    >
                      <svg viewBox="0 0 20 20" style={{ width: "12px", fill: "currentColor" }}>
                        <path d="M13.97 15.03a.75.75 0 1 0 1.06-1.06l-3.97-3.97 3.97-3.97a.75.75 0 0 0-1.06-1.06l-3.97 3.97-3.97-3.97a.75.75 0 0 0-1.06 1.06l3.97 3.97-3.97 3.97a.75.75 0 1 0 1.06 1.06l3.97-3.97 3.97 3.97Z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </s-stack>
              <s-stack direction="inline" gap="base">
                <s-text-field
                  label="Add amount"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.currentTarget.value || "")}
                  autocomplete="off"
                  placeholder="e.g. 50"
                />
                <s-button variant="primary" onClick={addDonationAmount}>
                  + Add Amount
                </s-button>
              </s-stack>
            </s-stack>

            <s-checkbox
              checked={formData.allowOtherAmount}
              onChange={(e) =>
                onFormChange({
                  allowOtherAmount: (e.target as HTMLInputElement).checked,
                })
              }
              label="Allow donors to enter a custom donation amount"
            />

            {formData.allowOtherAmount && (
              <s-text-field
                label="Title for the 'Other Amount' field"
                value={formData.otherAmountTitle}
                onChange={(e) =>
                  onFormChange({ otherAmountTitle: e.currentTarget.value })
                }
                autocomplete="off"
                placeholder="Other"
              />
            )}

            <s-checkbox
              checked={formData.isRecurringEnabled}
              onChange={(e) =>
                onFormChange({
                  isRecurringEnabled: (e.target as HTMLInputElement).checked,
                })
              }
              label="Enable Recurring Donation"
            />
          </s-section>
        </s-stack>
      </s-grid-item>

      <s-grid-item gridColumn="span 4">
        <CampaignPreview formData={formData} currency={currency} />
      </s-grid-item>
    </s-grid>
  );
}
