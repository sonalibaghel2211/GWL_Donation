import{j as e}from"./jsx-runtime-lA1hjGOj.js";import{r as p}from"./chunk-UVKPFVEO-CEw7IaX3.js";function _({title:r,description:o,themeEditorUrl:n,buttonLabel:a,previewSvg:t,instructions:l,enabled:s,onToggle:g,isSaving:h}){const[d,f]=p.useState(s),x=async i=>{f(i),await g(i)};return e.jsxs("div",{className:"config-card",children:[e.jsxs("div",{className:"config-card__header",children:[e.jsxs("div",{className:"config-card__header-text",children:[e.jsx("h3",{className:"config-card__title",children:r}),e.jsx("p",{className:"config-card__description",children:o})]}),e.jsx("div",{className:"config-card__toggle-wrap",children:e.jsxs("label",{className:"config-toggle",title:d?"Disable block":"Enable block",children:[e.jsx("input",{type:"checkbox",checked:d,disabled:h,onChange:i=>x(i.target.checked)}),e.jsx("span",{className:"config-toggle__slider"}),e.jsx("span",{className:"config-toggle__label",children:d?"Enabled":"Disabled"})]})})]}),e.jsxs("div",{className:"config-card__body",children:[e.jsx("div",{className:"config-card__action-col",children:e.jsxs("a",{href:n,target:"_top",rel:"noopener noreferrer",className:"config-card__btn",children:[a,e.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",style:{marginLeft:6,verticalAlign:"middle"},children:[e.jsx("path",{d:"M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"}),e.jsx("polyline",{points:"15 3 21 3 21 9"}),e.jsx("line",{x1:"10",y1:"14",x2:"21",y2:"3"})]})]})}),e.jsx("div",{className:"config-card__preview",dangerouslySetInnerHTML:{__html:t}})]}),e.jsx("p",{className:"config-card__instructions",children:l.map((i,c)=>c%2===1?e.jsx("strong",{children:i},c):e.jsx("span",{children:i},c))})]})}function u({heading:r="Add App Block via Theme Customizer",subheading:o="Set up the donation widget on your store pages using the theme customizer.",blocks:n,isSaving:a=!1}){return e.jsxs("div",{className:"config-tab",children:[e.jsxs("div",{className:"config-tab__heading-group",children:[e.jsx("h2",{className:"config-tab__heading",children:r}),e.jsx("p",{className:"config-tab__subheading",children:o})]}),n.map(t=>e.jsx(_,{...t,isSaving:a},t.id)),e.jsx("style",{children:`
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
      `})]})}const y=`
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
</svg>`,j=`
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
</svg>`;export{u as C,y as P,j as a};
