import{j as e}from"./jsx-runtime-lA1hjGOj.js";import{r as u}from"./chunk-UVKPFVEO-CEw7IaX3.js";function y({formData:i}){const s=()=>{const a=i.donationAmounts;switch(i.displayStyle){case"tabs":return e.jsxs("div",{className:"preview-tabs",children:[a.map((t,p)=>e.jsxs("button",{className:`preview-tab ${p===0?"active":""}`,children:["$",t]},t)),i.allowOtherAmount&&e.jsx("button",{className:"preview-tab",children:i.otherAmountTitle})]});case"dropdown":return e.jsxs("select",{className:"preview-dropdown",children:[e.jsx("option",{value:"",children:"Select amount"}),a.map(t=>e.jsxs("option",{value:t,children:["$",t]},t)),i.allowOtherAmount&&e.jsx("option",{value:"other",children:i.otherAmountTitle})]});case"radio_button":return e.jsxs("div",{className:"preview-radio-group",children:[a.map(t=>e.jsxs("label",{className:"preview-radio-label",children:[e.jsx("input",{type:"radio",name:"donation",value:t}),e.jsxs("span",{children:["$",t]})]},t)),i.allowOtherAmount&&e.jsxs("label",{className:"preview-radio-label",children:[e.jsx("input",{type:"radio",name:"donation",value:"other"}),e.jsx("span",{children:i.otherAmountTitle})]})]});case"price_bar":return e.jsxs("div",{className:"preview-price-bar",children:[a.map(t=>e.jsxs("button",{className:"preview-price-btn",children:["$",t]},t)),i.allowOtherAmount&&e.jsx("button",{className:"preview-price-btn",children:i.otherAmountTitle})]});case"text_box":return e.jsx("div",{className:"preview-text-box",children:e.jsx("input",{type:"number",placeholder:"Enter amount",className:"preview-input"})});default:return null}};return e.jsxs("div",{className:"campaign-preview",children:[e.jsxs("s-box",{padding:"base",borderWidth:"base",borderRadius:"base",background:"subdued",children:[e.jsx("s-paragraph",{children:e.jsx("strong",{children:"Live Preview"})}),e.jsx("s-divider",{}),e.jsxs("s-stack",{direction:"block",gap:"base",children:[e.jsx("div",{style:{overflowWrap:"break-word",wordBreak:"break-word"},children:e.jsx("s-heading",{children:i.name||"Campaign Title"})}),i.imageUrl?e.jsx("img",{src:i.imageUrl,alt:"Campaign",className:"preview-image"}):e.jsx("div",{className:"preview-image-placeholder",children:"No Image"}),e.jsx("div",{style:{overflowWrap:"break-word",wordBreak:"break-word"},children:e.jsx("s-paragraph",{children:i.description||"Campaign description will appear here..."})}),e.jsx("s-divider",{}),e.jsx("s-paragraph",{children:e.jsx("strong",{children:"Select Donation Amount:"})}),s(),e.jsx("s-button",{variant:"primary",disabled:!0,children:"Donate"}),e.jsx("s-paragraph",{children:e.jsx("s-text",{tone:"neutral",children:"Thank you for your support!"})})]})]}),e.jsx("style",{children:`
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
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }
        .preview-price-btn {
          width: 100%;
          padding: 12px 4px;
          border: 2px solid #008060;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          color: #008060;
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        @media screen and (max-width: 400px) {
          .preview-price-bar {
            grid-template-columns: repeat(3, 1fr);
          }
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
      `})]})}function f({formData:i,onFormChange:s}){const[a,t]=u.useState(""),p=u.useRef(null),h=u.useRef(null);u.useEffect(()=>{const r=h.current;if(!r)return;const n=l=>{var x,d,c,b,g,v;const o=((d=(x=l.detail)==null?void 0:x.selected)==null?void 0:d[0])||((c=l.detail)==null?void 0:c.value)||((b=l.target)==null?void 0:b.value)||((v=(g=l.target)==null?void 0:g.values)==null?void 0:v[0]);o&&s({displayStyle:String(o)})};return r.addEventListener("change",n),r.addEventListener("input",n),()=>{r.removeEventListener("change",n),r.removeEventListener("input",n)}},[s]);const m=r=>{var l;const n=(l=r.target.files)==null?void 0:l[0];if(console.log("[AddCampaign] File selected:",n==null?void 0:n.name,n==null?void 0:n.size),n){const o=new FileReader;o.onload=x=>{var c;const d=(c=x.target)==null?void 0:c.result;console.log("[AddCampaign] File read to base64, length:",d.length),console.log("[AddCampaign] Base64 preview:",d.substring(0,100)),s({imageUrl:d})},o.onerror=()=>{console.error("[AddCampaign] File read error")},o.readAsDataURL(n)}},j=()=>{a&&!i.donationAmounts.includes(a)&&(s({donationAmounts:[...i.donationAmounts,a]}),t(""))},w=r=>{s({donationAmounts:i.donationAmounts.filter(n=>n!==r)})};return e.jsxs("s-grid",{gridTemplateColumns:"repeat(12, 1fr)",gap:"base",children:[e.jsx("s-grid-item",{gridColumn:"span 8",children:e.jsxs("s-stack",{gap:"base",children:[e.jsxs("s-section",{children:[e.jsx("s-heading",{children:"Campaign Status"}),e.jsx("s-badge",{tone:i.enabled?"success":"caution",children:i.enabled?"Enabled":"Disabled"}),e.jsx("s-paragraph",{children:"Enable or disable the Campaign"}),e.jsx("s-button",{onClick:()=>s({enabled:!i.enabled}),children:i.enabled?"Disable":"Enable"})]}),e.jsxs("s-section",{children:[e.jsx("s-text-field",{label:"Donation campaign title",value:i.name,onChange:r=>s({name:r.currentTarget.value}),autocomplete:"off",placeholder:"Donation for better society"}),e.jsx("s-text-area",{label:"Donation Description",value:i.description,onChange:r=>s({description:r.currentTarget.value}),autocomplete:"off",placeholder:"Your donation contributes to a better society and makes a significant impact in the world.",rows:3}),e.jsx("input",{ref:p,type:"file",accept:"image/*",style:{display:"none"},onChange:m}),e.jsx("div",{style:{marginBottom:"12px"},children:e.jsxs("s-stack",{direction:"inline",gap:"base",children:[e.jsx("s-button",{variant:"primary",onClick:()=>{var r;return(r=p.current)==null?void 0:r.click()},children:i.imageUrl?"Change Image":"Upload Image"}),i.imageUrl&&e.jsx("s-button",{variant:"secondary",onClick:()=>s({imageUrl:""}),children:"Remove"})]})}),i.imageUrl&&e.jsx("div",{style:{position:"relative",display:"inline-block",width:"100%"},children:e.jsx("img",{src:i.imageUrl,alt:"Campaign",style:{width:"100%",maxHeight:"200px",objectFit:"cover",borderRadius:"8px",marginTop:"8px"}})})]}),e.jsxs("s-section",{children:[e.jsx("s-heading",{children:"Donation Amount Settings"}),e.jsxs("s-choice-list",{ref:h,label:"Select the display style for the donation amount",values:[i.displayStyle],children:[e.jsx("s-choice",{value:"tabs",selected:i.displayStyle==="tabs",children:"Tabs"}),e.jsx("s-choice",{value:"dropdown",selected:i.displayStyle==="dropdown",children:"Dropdown"}),e.jsx("s-choice",{value:"radio_button",selected:i.displayStyle==="radio_button",children:"Radio Button"}),e.jsx("s-choice",{value:"price_bar",selected:i.displayStyle==="price_bar",children:"Price Bar"}),e.jsx("s-choice",{value:"text_box",selected:i.displayStyle==="text_box",children:"Text Box"})]}),e.jsxs("s-stack",{direction:"block",gap:"base",children:[e.jsx("s-paragraph",{children:"Donation amounts:"}),e.jsx("s-stack",{direction:"inline",gap:"base",children:i.donationAmounts.map(r=>e.jsxs("div",{style:{display:"flex",alignItems:"center",background:"#E7F0FF",color:"#2C6ECB",padding:"6px 12px",borderRadius:"20px",gap:"8px",border:"1px solid #D1E1FF",fontSize:"14px",fontWeight:600},children:[e.jsxs("span",{children:["$",r]}),e.jsx("button",{onClick:()=>w(r),style:{background:"rgba(44, 110, 203, 0.1)",border:"none",borderRadius:"50%",width:"18px",height:"18px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#2C6ECB",padding:0,transition:"background 0.2s"},onMouseOver:n=>n.currentTarget.style.background="rgba(44, 110, 203, 0.2)",onMouseOut:n=>n.currentTarget.style.background="rgba(44, 110, 203, 0.1)",children:e.jsx("svg",{viewBox:"0 0 20 20",style:{width:"12px",fill:"currentColor"},children:e.jsx("path",{d:"M13.97 15.03a.75.75 0 1 0 1.06-1.06l-3.97-3.97 3.97-3.97a.75.75 0 0 0-1.06-1.06l-3.97 3.97-3.97-3.97a.75.75 0 0 0-1.06 1.06l3.97 3.97-3.97 3.97a.75.75 0 1 0 1.06 1.06l3.97-3.97 3.97 3.97Z"})})})]},r))}),e.jsxs("s-stack",{direction:"inline",gap:"base",children:[e.jsx("s-text-field",{label:"Add amount",value:a,onChange:r=>t(r.currentTarget.value||""),autocomplete:"off",placeholder:"e.g. 50"}),e.jsx("s-button",{variant:"primary",onClick:j,children:"+ Add Amount"})]})]}),e.jsx("s-checkbox",{checked:i.allowOtherAmount,onChange:r=>s({allowOtherAmount:r.target.checked}),label:"Allow donors to enter a custom donation amount"}),i.allowOtherAmount&&e.jsx("s-text-field",{label:"Title for the 'Other Amount' field",value:i.otherAmountTitle,onChange:r=>s({otherAmountTitle:r.currentTarget.value}),autocomplete:"off",placeholder:"Other"}),e.jsx("s-checkbox",{checked:i.isRecurringEnabled,onChange:r=>s({isRecurringEnabled:r.target.checked}),label:"Enable Recurring Donation"})]})]})}),e.jsx("s-grid-item",{gridColumn:"span 4",children:e.jsx(y,{formData:i})})]})}export{f as A};
