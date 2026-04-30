import { useState, useRef, useEffect } from "react";
import { useSubmit, Link } from "react-router";

export default function SettingsTab({ initialSettings, shop }: { initialSettings: any, shop: string }) {
  const submit = useSubmit();

  const [generalSettings, setGeneralSettings] = useState({
    widgetTitle: initialSettings?.widgetTitle ?? "Donation",
    buttonText: initialSettings?.buttonText ?? "Donate",
    additionalCss: initialSettings?.additionalCss ?? "",
    displayThankYou: initialSettings?.displayThankYou ?? true,
    thankYouMessage: initialSettings?.thankYouMessage ?? "Thanks for Donating!!!!!!!",
  });


  const handleSaveSubmit = (e: any) => {
    e.preventDefault();
    const payload = {
      ...generalSettings,
    };
    submit(
      { intent: "saveSettings", shop, settings: JSON.stringify(payload) },
      { method: "POST" }
    );
  };

  return (
    <form id="settings-form" onSubmit={handleSaveSubmit} className="settings-page">
      <div className="settings-section">
        <div className="settings-section__sidebar">
          <h2 className="settings-section__title">General Settings</h2>
          <p className="settings-section__description">
            Please provide the key details for your donation widget.
          </p>
        </div>
        <div className="settings-section__content">
          <div className="polaris-card" style={{ background: '#fff', border: '1px solid #c9cccf', borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="settings-field">
                <s-text-field
                  label="Title for Donation Widget "
                  value={generalSettings.widgetTitle}
                  onInput={(e: any) => setGeneralSettings({ ...generalSettings, widgetTitle: e.target.value })}
                ></s-text-field>
              </div>

              <div className="settings-field">
                <s-text-field
                  label="Donation Button Text "
                  value={generalSettings.buttonText}
                  onInput={(e: any) => setGeneralSettings({ ...generalSettings, buttonText: e.target.value })}
                ></s-text-field>
              </div>

              <div className="settings-field">
                <label className="polaris-label" style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
                  Additional CSS
                </label>
                <textarea
                  className="polaris-textarea"
                  rows={4}
                  value={generalSettings.additionalCss}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, additionalCss: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', resize: 'vertical', fontFamily: 'inherit', fontSize: '14px' }}
                />
              </div>

              <div className="settings-field">
                <s-checkbox
                  label="Display a 'Thank You' note or message for customers who make a donation ⓘ"
                  checked={generalSettings.displayThankYou}
                  onChange={(e: any) => setGeneralSettings({ ...generalSettings, displayThankYou: e.target.checked })}
                ></s-checkbox>

                {generalSettings.displayThankYou && (
                  <div style={{ marginTop: '8px' }}>
                    <s-text-field
                      value={generalSettings.thankYouMessage}
                      onInput={(e: any) => setGeneralSettings({ ...generalSettings, thankYouMessage: e.target.value })}
                    ></s-text-field>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>


      <style>{`
        .settings-page {
          padding-top: 12px;
          padding-bottom: 32px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .settings-section {
          display: flex;
          align-items: flex-start;
          gap: 32px;
          padding-top: 24px;
          padding-bottom: 24px;
          margin-bottom: 24px;
        }

        .settings-section__sidebar {
          flex: 0 0 calc(33.333% - 16px);
          max-width: calc(33.333% - 16px);
        }

        .settings-section__title {
          font-size: 16px;
          font-weight: 600;
          color: #202223;
          margin: 0 0 8px;
        }

        .settings-section__description {
          font-size: 14px;
          color: #6d7175;
          margin: 0;
          line-height: 1.5;
        }

        .settings-section__content {
          flex: 1;
        }

        .settings-field {
          margin-bottom: 16px;
        }

        /* Rich Text Editor Styles */
        .rich-editor {
          border: 1px solid #c9cccf;
          border-radius: 4px;
          background: #fff;
          overflow: hidden;
        }

        .rich-editor__toolbar {
          display: flex;
          align-items: center;
          padding: 6px 12px;
          background: #f6f6f7;
          border-bottom: 1px solid #c9cccf;
          gap: 4px;
        }

        .rich-editor__select {
          padding: 4px 8px;
          border: 1px solid #c9cccf;
          border-radius: 3px;
          font-size: 13px;
          background: #fff;
        }

        .rich-editor__divider {
          width: 1px;
          height: 20px;
          background-color: #c9cccf;
          margin: 0 4px;
        }

        .rich-editor__btn {
          background: none;
          border: 1px solid transparent;
          border-radius: 3px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
        }

        .rich-editor__btn:hover {
          background: #e4e5e7;
        }

        .rich-editor__subtitle {
          padding: 8px 16px;
          border-bottom: 1px solid #c9cccf;
          background: #fff;
        }

        .rich-editor__content {
          min-height: 300px;
          padding: 16px;
          font-family: -apple-system, BlinkMacSystemFont, "San Francisco", "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
          font-size: 14px;
          line-height: 1.5;
          outline: none;
        }

        .rich-editor__content h3 {
          margin: 0 0 16px;
          font-size: 18px;
        }

        .rich-editor__footer {
          padding: 12px 16px;
          background: #fafbfb;
          border-top: 1px solid #c9cccf;
          font-size: 13px;
          color: #6d7175;
          font-style: italic;
        }

        @media screen and (max-width: 768px) {
          .settings-section {
            flex-direction: column;
            gap: 16px;
          }
          .settings-section__sidebar {
            flex: 0 0 100%;
            max-width: 100%;
          }
        }
      `}</style>
    </form>
  );
}
