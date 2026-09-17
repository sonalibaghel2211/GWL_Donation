import{j as e}from"./jsx-runtime-B5AtTLU8.js";import{s as j}from"./chunk-4N6VE7H7-BqC2kd6o.js";function _({formData:r,currency:s}){const u=new Intl.NumberFormat(void 0,{style:"currency",currency:s||"USD"}),g=()=>{const h=r.donationAmounts;switch(r.displayStyle){case"tabs":return e.jsxs("div",{className:"preview-tabs",children:[h.map((t,m)=>e.jsx("button",{className:`preview-tab ${m===0?"active":""}`,children:u.format(Number(t))},t)),r.allowOtherAmount&&e.jsx("button",{className:"preview-tab",children:r.otherAmountTitle})]});case"dropdown":return e.jsxs("select",{className:"preview-dropdown",children:[e.jsx("option",{value:"",children:"Select amount"}),h.map(t=>e.jsx("option",{value:t,children:u.format(Number(t))},t)),r.allowOtherAmount&&e.jsx("option",{value:"other",children:r.otherAmountTitle})]});case"radio_button":return e.jsxs("div",{className:"preview-radio-group",children:[h.map(t=>e.jsxs("label",{className:"preview-radio-label",children:[e.jsx("input",{type:"radio",name:"donation",value:t}),e.jsx("span",{children:u.format(Number(t))})]},t)),r.allowOtherAmount&&e.jsxs("label",{className:"preview-radio-label",children:[e.jsx("input",{type:"radio",name:"donation",value:"other"}),e.jsx("span",{children:r.otherAmountTitle})]})]});case"price_bar":return e.jsxs("div",{className:"preview-price-bar",children:[h.map(t=>e.jsx("button",{className:"preview-price-btn",children:u.format(Number(t))},t)),r.allowOtherAmount&&e.jsx("button",{className:"preview-price-btn",children:r.otherAmountTitle})]});case"text_box":return e.jsx("div",{className:"preview-text-box",children:e.jsx("input",{type:"number",placeholder:"Enter amount",className:"preview-input"})});default:return null}};return e.jsxs("div",{className:"campaign-preview",children:[e.jsxs("s-box",{padding:"base",borderWidth:"base",borderRadius:"base",background:"subdued",children:[e.jsx("s-paragraph",{children:e.jsx("strong",{children:"Live Preview"})}),e.jsx("s-divider",{}),e.jsxs("s-stack",{direction:"block",gap:"base",children:[e.jsx("div",{style:{overflowWrap:"break-word",wordBreak:"break-word"},children:e.jsx("s-heading",{children:r.name||"Campaign Title"})}),r.imageUrl?e.jsx("img",{src:r.imageUrl,alt:"Campaign",className:"preview-image"}):e.jsx("div",{className:"preview-image-placeholder",children:"No Image"}),e.jsx("div",{style:{overflowWrap:"break-word",wordBreak:"break-word"},children:e.jsx("s-paragraph",{children:r.description||"Campaign description will appear here..."})}),e.jsx("s-divider",{}),e.jsx("s-paragraph",{children:e.jsx("strong",{children:"Select Donation Amount:"})}),g(),e.jsx("s-button",{variant:"primary",disabled:!0,children:"Donate"}),e.jsx("s-paragraph",{children:e.jsx("s-text",{tone:"neutral",children:"Thank you for your support!"})})]})]}),e.jsx("style",{children:`
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
      `})]})}function B({formData:r,onFormChange:s,currency:u,canUseRecurringDonations:g=!0}){const h=new Intl.NumberFormat(void 0,{style:"currency",currency:u||"USD"}),[t,m]=j.useState(""),p=j.useRef(null),y=j.useRef(null);j.useEffect(()=>{const i=y.current;if(!i)return;const n=l=>{var c,d,o,x,b,w;const a=((d=(c=l.detail)==null?void 0:c.selected)==null?void 0:d[0])||((o=l.detail)==null?void 0:o.value)||((x=l.target)==null?void 0:x.value)||((w=(b=l.target)==null?void 0:b.values)==null?void 0:w[0]);a&&s({displayStyle:String(a)})};return i.addEventListener("change",n),i.addEventListener("input",n),()=>{i.removeEventListener("change",n),i.removeEventListener("input",n)}},[s]);const f=5,k=f*1024*1024,E=500*1024,v=800,C=.7,N=i=>new Promise((n,l)=>{const a=new Image;a.onload=()=>{let{width:d,height:o}=a;if(d>v||o>v){const A=Math.min(v/d,v/o);d=Math.round(d*A),o=Math.round(o*A)}const x=document.createElement("canvas");x.width=d,x.height=o;const b=x.getContext("2d");if(!b){l(new Error("Could not get canvas context"));return}b.drawImage(a,0,0,d,o);const w=x.toDataURL("image/jpeg",C);n(w)},a.onerror=()=>l(new Error("Failed to load image"));const c=new FileReader;c.onload=d=>{var o;a.src=(o=d.target)==null?void 0:o.result},c.onerror=()=>l(new Error("Failed to read file")),c.readAsDataURL(i)}),S=async i=>{var l;const n=(l=i.target.files)==null?void 0:l[0];if(n){if(n.size>k){alert(`Image is too large (${(n.size/1024/1024).toFixed(1)}MB). Please upload an image smaller than ${f}MB.`),p.current&&(p.current.value="");return}try{const a=await N(n),c=Math.round(a.length*.75);if(c>E){alert(`Image is still too large after compression (${(c/1024).toFixed(0)}KB). Please use a smaller image.`),p.current&&(p.current.value="");return}s({imageUrl:a})}catch(a){console.error("[AddCampaign] Image compression error:",a),alert("Failed to process the image. Please try a different file."),p.current&&(p.current.value="")}}},I=()=>{t&&!r.donationAmounts.includes(t)&&(s({donationAmounts:[...r.donationAmounts,t]}),m(""))},T=i=>{s({donationAmounts:r.donationAmounts.filter(n=>n!==i)})};return e.jsxs("s-grid",{gridTemplateColumns:"repeat(12, 1fr)",gap:"base",children:[e.jsx("s-grid-item",{gridColumn:"span 8",children:e.jsxs("s-stack",{gap:"base",children:[e.jsxs("s-section",{children:[e.jsx("s-heading",{children:"Campaign Status"}),e.jsx("s-badge",{tone:r.enabled?"success":"caution",children:r.enabled?"Enabled":"Disabled"}),e.jsx("s-paragraph",{children:"Enable or disable the Campaign"}),e.jsx("s-button",{onClick:()=>s({enabled:!r.enabled}),children:r.enabled?"Disable":"Enable"})]}),e.jsxs("s-section",{children:[e.jsx("s-text-field",{label:"Donation campaign title",value:r.name,onChange:i=>s({name:i.currentTarget.value}),autocomplete:"off",placeholder:"Donation for better society"}),e.jsx("s-text-area",{label:"Donation Description",value:r.description,onChange:i=>s({description:i.currentTarget.value}),autocomplete:"off",placeholder:"Your donation contributes to a better society and makes a significant impact in the world.",rows:3}),e.jsx("input",{ref:p,type:"file",accept:"image/*",style:{display:"none"},onChange:S}),e.jsx("div",{style:{marginBottom:"12px"},children:e.jsxs("s-stack",{direction:"inline",gap:"base",children:[e.jsx("s-button",{variant:"primary",onClick:()=>{var i;return(i=p.current)==null?void 0:i.click()},children:r.imageUrl?"Change Image":"Upload Image"}),r.imageUrl&&e.jsx("s-button",{variant:"secondary",onClick:()=>s({imageUrl:""}),children:"Remove"})]})}),r.imageUrl&&e.jsx("div",{style:{position:"relative",display:"inline-block",width:"100%"},children:e.jsx("img",{src:r.imageUrl,alt:"Campaign",style:{width:"100%",maxHeight:"200px",objectFit:"cover",borderRadius:"8px",marginTop:"8px"}})})]}),e.jsxs("s-section",{children:[e.jsx("s-heading",{children:"Donation Amount Settings"}),e.jsxs("s-choice-list",{ref:y,label:"Select the display style for the donation amount",values:[r.displayStyle],children:[e.jsx("s-choice",{value:"tabs",selected:r.displayStyle==="tabs",children:"Tabs"}),e.jsx("s-choice",{value:"dropdown",selected:r.displayStyle==="dropdown",children:"Dropdown"}),e.jsx("s-choice",{value:"radio_button",selected:r.displayStyle==="radio_button",children:"Radio Button"}),e.jsx("s-choice",{value:"price_bar",selected:r.displayStyle==="price_bar",children:"Price Bar"}),e.jsx("s-choice",{value:"text_box",selected:r.displayStyle==="text_box",children:"Text Box"})]}),e.jsxs("s-stack",{direction:"block",gap:"base",children:[e.jsx("s-paragraph",{children:"Donation amounts:"}),e.jsx("s-stack",{direction:"inline",gap:"base",children:r.donationAmounts.map(i=>e.jsxs("div",{style:{display:"flex",alignItems:"center",background:"#E7F0FF",color:"#2C6ECB",padding:"6px 12px",borderRadius:"20px",gap:"8px",border:"1px solid #D1E1FF",fontSize:"14px",fontWeight:600},children:[e.jsx("span",{children:h.format(Number(i))}),e.jsx("button",{onClick:()=>T(i),style:{background:"rgba(44, 110, 203, 0.1)",border:"none",borderRadius:"50%",width:"18px",height:"18px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#2C6ECB",padding:0,transition:"background 0.2s"},onMouseOver:n=>n.currentTarget.style.background="rgba(44, 110, 203, 0.2)",onMouseOut:n=>n.currentTarget.style.background="rgba(44, 110, 203, 0.1)",children:e.jsx("svg",{viewBox:"0 0 20 20",style:{width:"12px",fill:"currentColor"},children:e.jsx("path",{d:"M13.97 15.03a.75.75 0 1 0 1.06-1.06l-3.97-3.97 3.97-3.97a.75.75 0 0 0-1.06-1.06l-3.97 3.97-3.97-3.97a.75.75 0 0 0-1.06 1.06l3.97 3.97-3.97 3.97a.75.75 0 1 0 1.06 1.06l3.97-3.97 3.97 3.97Z"})})})]},i))}),e.jsxs("s-stack",{direction:"inline",gap:"base",children:[e.jsx("s-text-field",{label:"Add amount",value:t,onChange:i=>m(i.currentTarget.value||""),autocomplete:"off",placeholder:"e.g. 50"}),e.jsx("s-button",{variant:"primary",onClick:I,children:"+ Add Amount"})]})]}),e.jsx("s-checkbox",{checked:r.allowOtherAmount,onChange:i=>s({allowOtherAmount:i.target.checked}),label:"Allow donors to enter a custom donation amount"}),r.allowOtherAmount&&e.jsx("s-text-field",{label:"Title for the 'Other Amount' field",value:r.otherAmountTitle,onChange:i=>s({otherAmountTitle:i.currentTarget.value}),autocomplete:"off",placeholder:"Other"}),e.jsx("s-checkbox",{checked:g?r.isRecurringEnabled:!1,disabled:!g,onChange:i=>s({isRecurringEnabled:i.target.checked}),label:"Enable Recurring Donation"}),!g&&e.jsxs("div",{style:{marginTop:"4px",fontSize:"12px",color:"#6C4A79",display:"flex",alignItems:"center",gap:"6px"},children:[e.jsx("span",{children:"🔒"}),e.jsxs("span",{children:["Recurring donations require the ",e.jsx("strong",{children:"Advanced"})," plan or above."]})]})]})]})}),e.jsx("s-grid-item",{gridColumn:"span 4",children:e.jsx(_,{formData:r,currency:u})})]})}export{B as A};
