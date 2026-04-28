/**
 * ConfigurationTab.tsx
 *
 * A unified, premium configuration tab component reusable across different donation features.
 * Displays instructional cards with deep-links, previews, and step-by-step setup guides.
 */

import { useState } from "react";

/* ─── Types ──────────────────────────────────────────────────────────────── */

export type BlockItem = {
  id: string;
  title: string;
  description: string;
  themeEditorUrl: string;
  buttonLabel: string;
  previewSvg: string;
  instructions: string[];
  enabled: boolean;
  onToggle: (enabled: boolean) => void | Promise<void>;
};

type ConfigurationTabProps = {
  heading?: string;
  subheading?: string;
  blocks: BlockItem[];
  isSaving?: boolean;
};

/* ─── Block Card ─────────────────────────────────────────────────────────── */

type BlockCardProps = BlockItem & { isSaving: boolean };

function BlockCard({
  title,
  description,
  themeEditorUrl,
  buttonLabel,
  previewSvg,
  instructions,
  enabled,
  onToggle,
  isSaving,
}: BlockCardProps) {
  const [internalEnabled, setInternalEnabled] = useState(enabled);

  const handleToggle = async (val: boolean) => {
    setInternalEnabled(val);
    await onToggle(val);
  };

  return (
    <div className="config-card">
      <div className="config-card__header">
        <div className="config-card__header-text">
          <h3 className="config-card__title">{title}</h3>
          <p className="config-card__description">{description}</p>
        </div>
        <div className="config-card__toggle-wrap">
          <label className="config-toggle" title={internalEnabled ? "Disable block" : "Enable block"}>
            <input
              type="checkbox"
              checked={internalEnabled}
              disabled={isSaving}
              onChange={(e) => handleToggle(e.target.checked)}
            />
            <span className="config-toggle__slider" />
            <span className="config-toggle__label">
              {internalEnabled ? "Enabled" : "Disabled"}
            </span>
          </label>
        </div>
      </div>

      <div className="config-card__body">
        <div className="config-card__action-col">
          <a
            href={themeEditorUrl}
            target="_top"
            rel="noopener noreferrer"
            className="config-card__btn"
          >
            {buttonLabel}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginLeft: 6, verticalAlign: "middle" }}
            >
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>

        <div
          className="config-card__preview"
          dangerouslySetInnerHTML={{ __html: previewSvg }}
        />
      </div>

      <p className="config-card__instructions">
        {instructions.map((part, idx) => {
          const isHighlighted = idx % 2 === 1;
          return isHighlighted ? (
            <strong key={idx}>{part}</strong>
          ) : (
            <span key={idx}>{part}</span>
          );
        })}
      </p>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

export default function ConfigurationTab({
  heading = "Add App Block via Theme Customizer",
  subheading = "Set up the donation widget on your store pages using the theme customizer.",
  blocks,
  isSaving = false,
}: ConfigurationTabProps) {
  return (
    <div className="config-tab">
      <div className="config-tab__heading-group">
        <h2 className="config-tab__heading">{heading}</h2>
        <p className="config-tab__subheading">{subheading}</p>
      </div>

      {blocks.map((block) => (
        <BlockCard key={block.id} {...block} isSaving={isSaving} />
      ))}

      <style>{`
        .config-tab {
          padding: 4px 0 24px;
          font-family: inherit;
          max-width: 900px;
        }

        .config-tab__heading-group {
          margin-bottom: 20px;
        }

        .config-tab__heading {
          font-size: 1.15em;
          font-weight: 700;
          margin: 0 0 4px;
          color: #1a1a1a;
        }

        .config-tab__subheading {
          font-size: 0.9em;
          color: #555;
          margin: 0;
        }

        /* Card */
        .config-card {
          background: #fff;
          border: 1px solid #e1e3e5;
          border-radius: 10px;
          padding: 20px 22px;
          margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }

        .config-card__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 16px;
        }

        .config-card__header-text {
          flex: 1;
        }

        .config-card__title {
          font-size: 1em;
          font-weight: 700;
          margin: 0 0 3px;
          color: #1a1a1a;
        }

        .config-card__description {
          font-size: 0.88em;
          color: #555;
          margin: 0;
        }

        .config-card__toggle-wrap {
          flex-shrink: 0;
          padding-top: 2px;
        }

        /* Toggle switch */
        .config-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          user-select: none;
          font-size: 0.85em;
          color: #555;
        }

        .config-toggle input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .config-toggle__slider {
          position: relative;
          display: inline-block;
          width: 38px;
          height: 22px;
          background: #d0d0d0;
          border-radius: 11px;
          transition: background 0.2s;
          flex-shrink: 0;
        }

        .config-toggle__slider::after {
          content: "";
          position: absolute;
          top: 3px;
          left: 3px;
          width: 16px;
          height: 16px;
          background: #fff;
          border-radius: 50%;
          transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.25);
        }

        .config-toggle input:checked + .config-toggle__slider {
          background: #008060;
        }

        .config-toggle input:checked + .config-toggle__slider::after {
          transform: translateX(16px);
        }

        .config-toggle input:disabled + .config-toggle__slider {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Body row: button + preview */
        .config-card__body {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }

        .config-card__action-col {
          flex-shrink: 0;
        }

        .config-card__btn {
          display: inline-flex;
          align-items: center;
          padding: 9px 18px;
          border: 1.5px solid #1a1a1a;
          border-radius: 6px;
          color: #1a1a1a;
          font-size: 0.9em;
          font-weight: 500;
          background: #fff;
          text-decoration: none;
          transition: background 0.15s, border-color 0.15s;
          cursor: pointer;
        }

        .config-card__btn:hover {
          background: #f5f5f5;
          border-color: #555;
        }

        .config-card__preview {
          width: 200px;
          flex-shrink: 0;
        }

        /* Instructions */
        .config-card__instructions {
          font-size: 0.875em;
          color: #333;
          margin: 0;
          padding-top: 12px;
          border-top: 1px solid #f0f0f0;
          line-height: 1.6;
        }

        /* Responsive */
        @media (max-width: 600px) {
          .config-card__body {
            flex-direction: column;
            align-items: flex-start;
          }
          .config-card__preview {
            width: 100%;
          }
          .config-card__header {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

/* ─── Preview image SVGs ──────────────────────────────────────────────────── */

export const PRODUCT_PREVIEW_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" style="width:100%;height:auto;border-radius:6px;border:1px solid #e3e3e3">
  <rect width="200" height="120" fill="#f4f6fd"/>
  <rect x="10" y="10" width="120" height="10" rx="3" fill="#c9d0e8"/>
  <rect x="10" y="26" width="80" height="7" rx="2" fill="#dde2f4"/>
  <rect x="10" y="40" width="30" height="20" rx="4" fill="#000000"/>
  <rect x="46" y="40" width="30" height="20" rx="4" fill="#dde2f4"/>
  <rect x="82" y="40" width="30" height="20" rx="4" fill="#dde2f4"/>
  <rect x="10" y="68" width="115" height="28" rx="5" fill="#008060"/>
  <rect x="40" y="78" width="55" height="8" rx="3" fill="#fff"/>
  <rect x="140" y="10" width="50" height="100" rx="6" fill="#e6eeff"/>
  <rect x="143" y="20" width="44" height="30" rx="4" fill="#c9d0e8"/>
  <rect x="143" y="56" width="30" height="6" rx="2" fill="#dde2f4"/>
  <rect x="143" y="66" width="44" height="6" rx="2" fill="#dde2f4"/>
</svg>`;

export const CART_PREVIEW_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" style="width:100%;height:auto;border-radius:6px;border:1px solid #e3e3e3">
  <rect width="200" height="120" fill="#f4f6fd"/>
  <rect x="10" y="10" width="180" height="12" rx="3" fill="#c9d0e8"/>
  <rect x="10" y="28" width="180" height="8" rx="2" fill="#e0e4f5"/>
  <rect x="10" y="42" width="25" height="16" rx="4" fill="#000000"/>
  <rect x="40" y="42" width="25" height="16" rx="4" fill="#dde2f4"/>
  <rect x="70" y="42" width="25" height="16" rx="4" fill="#dde2f4"/>
  <rect x="100" y="42" width="25" height="16" rx="4" fill="#dde2f4"/>
  <rect x="10" y="64" width="130" height="5" rx="2" fill="#e0e4f5"/>
  <rect x="10" y="75" width="180" height="26" rx="5" fill="#008060"/>
  <rect x="60" y="84" width="80" height="8" rx="3" fill="#fff"/>
  <rect x="10" y="106" width="80" height="8" rx="2" fill="#e0e4f5"/>
  <rect x="100" y="106" width="80" height="8" rx="2" fill="#e0e4f5"/>
</svg>`;
