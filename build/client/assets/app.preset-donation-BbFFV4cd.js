import{c as k,d as y,h as w,r as h,w as P,f as D,u as E}from"./chunk-UVKPFVEO-CEw7IaX3.js";import{j as e}from"./jsx-runtime-lA1hjGOj.js";import{C as N,P as A,a as B}from"./ConfigurationTab-uPFD0stB.js";import{u as Y}from"./useAppBridge-Bj34gXAL.js";function z({campaigns:t,pagination:c,onPageChange:n}){const u=k(),r=y();if(!t||t.length===0)return e.jsxs("s-stack",{gap:"base",children:[e.jsx("s-heading",{children:"No Campaigns Added Yet"}),e.jsx("s-paragraph",{children:"Add a campaign from the 'Add Campaign' button above."})]});const s=(c==null?void 0:c.page)||1,i=(c==null?void 0:c.totalPages)||1,l=(c==null?void 0:c.totalCount)||t.length,p=(c==null?void 0:c.itemsPerPage)||10,a=(s-1)*p+1,b=Math.min(s*p,l);return e.jsxs("div",{children:[e.jsx("div",{style:{overflowX:"auto"},children:e.jsxs("table",{style:{width:"100%",borderCollapse:"collapse",textAlign:"left"},children:[e.jsx("thead",{children:e.jsxs("tr",{style:{borderBottom:"1px solid #dfe3e8"},children:[e.jsx("th",{style:{padding:"12px 8px"},children:"Sr. No."}),e.jsx("th",{style:{padding:"12px 8px"},children:"Campaign Title"}),e.jsx("th",{style:{padding:"12px 8px"},children:"Description"}),e.jsx("th",{style:{padding:"12px 8px"},children:"Status"}),e.jsx("th",{style:{padding:"12px 8px"},children:"Action"})]})}),e.jsx("tbody",{children:t.map((d,m)=>e.jsxs("tr",{style:{borderBottom:"1px solid #dfe3e8"},children:[e.jsx("td",{style:{padding:"12px 8px"},children:a+m}),e.jsx("td",{style:{padding:"12px 8px"},children:e.jsxs("s-stack",{direction:"inline",gap:"base",children:[d.imageUrl&&e.jsx("img",{src:d.imageUrl,alt:d.name,style:{width:"40px",height:"40px",objectFit:"cover",borderRadius:"4px"}}),e.jsx("span",{children:d.name})]})}),e.jsx("td",{style:{padding:"12px 8px",maxWidth:"300px"},children:d.description}),e.jsx("td",{style:{padding:"12px 8px"},children:e.jsx("s-badge",{tone:d.enabled?"success":"caution",children:d.enabled?"Active":"Disabled"})}),e.jsx("td",{style:{padding:"12px 8px"},children:e.jsxs("s-stack",{direction:"inline",gap:"base",children:[e.jsx("s-button",{onClick:()=>u(`/app/preset-donation/edit/${d.id}`),children:"Edit"}),e.jsx("s-button",{onClick:()=>{confirm("Are you sure you want to delete this campaign?")&&r.submit(null,{method:"post",action:`/app/preset-donation/delete/${d.id}`})},children:"Delete"})]})})]},d.id))})]})}),e.jsxs("div",{style:{marginTop:"20px",padding:"16px",backgroundColor:"#f6f6f7",borderRadius:"8px",display:"flex",justifyContent:"space-between",alignItems:"center"},children:[e.jsxs("s-paragraph",{children:["Showing ",e.jsx("strong",{children:a})," to ",e.jsx("strong",{children:b})," of"," ",e.jsx("strong",{children:l})," campaigns"]}),e.jsxs("s-stack",{direction:"inline",gap:"base",children:[e.jsx("s-button",{disabled:s===1,onClick:()=>n(s-1),children:"Previous"}),i<=5?Array.from({length:i},(d,m)=>m+1).map(d=>e.jsx("s-button",{variant:d===s?"primary":"tertiary",onClick:()=>n(d),children:d},d)):e.jsxs(e.Fragment,{children:[s>2&&e.jsx("s-button",{variant:"tertiary",onClick:()=>n(1),children:"1"}),s>3&&e.jsx("s-paragraph",{children:"..."}),s>1&&e.jsx("s-button",{variant:"tertiary",onClick:()=>n(s-1),children:s-1}),e.jsx("s-button",{variant:"primary",children:s}),s<i&&e.jsx("s-button",{variant:"tertiary",onClick:()=>n(s+1),children:s+1}),s<i-1&&e.jsx("s-paragraph",{children:"..."}),s<i-2&&e.jsx("s-button",{variant:"tertiary",onClick:()=>n(i),children:i})]}),e.jsx("s-button",{disabled:s===i,onClick:()=>n(s+1),children:"Next"})]})]})]})}function S({initialSettings:t,shop:c,onDirtyChange:n}){const u=w(),[r,s]=h.useState({widgetTitle:(t==null?void 0:t.widgetTitle)??"Donation",buttonText:(t==null?void 0:t.buttonText)??"Donate",additionalCss:(t==null?void 0:t.additionalCss)??"",displayThankYou:(t==null?void 0:t.displayThankYou)??!0,thankYouMessage:(t==null?void 0:t.thankYouMessage)??"Thanks for Donating!!!!!!!"}),[i]=h.useState(()=>({widgetTitle:(t==null?void 0:t.widgetTitle)??"Donation",buttonText:(t==null?void 0:t.buttonText)??"Donate",additionalCss:(t==null?void 0:t.additionalCss)??"",displayThankYou:(t==null?void 0:t.displayThankYou)??!0,thankYouMessage:(t==null?void 0:t.thankYouMessage)??"Thanks for Donating!!!!!!!"})),l=Object.keys(r).some(a=>r[a]!==i[a]);h.useEffect(()=>{n==null||n(l)},[l,n]);const p=a=>{a.preventDefault();const b={...r};u({intent:"saveSettings",shop:c,settings:JSON.stringify(b)},{method:"POST"})};return e.jsxs("form",{id:"settings-form",onSubmit:p,className:"settings-page",children:[e.jsxs("div",{className:"settings-section",children:[e.jsxs("div",{className:"settings-section__sidebar",children:[e.jsx("h2",{className:"settings-section__title",children:"General Settings"}),e.jsx("p",{className:"settings-section__description",children:"Please provide the key details for your donation widget."})]}),e.jsx("div",{className:"settings-section__content",children:e.jsx("div",{className:"polaris-card",style:{background:"#fff",border:"1px solid #c9cccf",borderRadius:"8px",padding:"16px"},children:e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"16px"},children:[e.jsx("div",{className:"settings-field",children:e.jsx("s-text-field",{label:"Title for Donation Widget ",value:r.widgetTitle,onInput:a=>s({...r,widgetTitle:a.target.value})})}),e.jsx("div",{className:"settings-field",children:e.jsx("s-text-field",{label:"Donation Button Text ",value:r.buttonText,onInput:a=>s({...r,buttonText:a.target.value})})}),e.jsxs("div",{className:"settings-field",children:[e.jsx("label",{className:"polaris-label",style:{display:"block",marginBottom:"4px",fontSize:"13px",fontWeight:500},children:"Additional CSS"}),e.jsx("textarea",{className:"polaris-textarea",rows:4,value:r.additionalCss,onChange:a=>s({...r,additionalCss:a.target.value}),style:{width:"100%",padding:"8px",border:"1px solid #ccc",borderRadius:"4px",resize:"vertical",fontFamily:"inherit",fontSize:"14px"}})]}),e.jsxs("div",{className:"settings-field",children:[e.jsx("s-checkbox",{label:"Display a 'Thank You' note or message for customers who make a donation ⓘ",checked:r.displayThankYou,onChange:a=>s({...r,displayThankYou:a.target.checked})}),r.displayThankYou&&e.jsx("div",{style:{marginTop:"8px"},children:e.jsx("s-text-field",{value:r.thankYouMessage,onInput:a=>s({...r,thankYouMessage:a.target.value})})})]})]})})})]}),e.jsx("style",{children:`
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
      `})]})}const R=[{id:"campaign",label:"Donation Campaigns"},{id:"settings",label:"Settings"},{id:"config",label:"Configuration"}],G=P(function(){const c=k(),n=y(),u=Y(),[r,s]=D(),i=r.get("tab"),[l,p]=h.useState(i==="configuration"?"config":i==="settings"?"settings":"campaign"),a=n.state==="submitting"&&n.formMethod==="POST",[b,d]=h.useState(!1);h.useEffect(()=>{var o;((o=n.data)==null?void 0:o.status)==="success"&&(u.toast.show("Settings saved successfully"),d(!1))},[n.data,u]),h.useEffect(()=>{const o=r.get("tab");o==="configuration"?p("config"):o==="settings"?p("settings"):o==="campaign"&&p("campaign")},[r]);const m=o=>{p(o),s({tab:o==="config"?"configuration":o})},{campaigns:v,error:j,pagination:C,blockConfig:f,shop:g,appSettings:T}=E(),_=o=>{s({page:String(o)})};return e.jsxs("s-page",{heading:"Donation Preferences",children:[l==="campaign"&&e.jsx("s-button",{slot:"primary-action",variant:"primary",onClick:()=>c("/app/preset-donation/add"),children:"Add Campaign"}),l==="settings"&&e.jsx("s-button",{slot:"primary-action",variant:"primary",disabled:!b||a,onClick:()=>{const o=document.getElementById("settings-form");o&&o.dispatchEvent(new Event("submit",{cancelable:!0,bubbles:!0}))},...a?{loading:!0}:{},children:a?"Saving...":b?"Save Settings":"No Changes"}),e.jsx("div",{className:"polaris-tabs",children:e.jsx("div",{className:"polaris-tabs-list",role:"tablist",children:R.map(o=>e.jsx("button",{role:"tab","aria-selected":l===o.id,className:`polaris-tab ${l===o.id?"active":""}`,onClick:()=>m(o.id),children:o.label},o.id))})}),e.jsxs("div",{className:"polaris-tab-panel",children:[l==="settings"&&e.jsx("s-section",{children:e.jsx(S,{initialSettings:T,shop:g,onDirtyChange:d})}),l==="campaign"&&e.jsx("s-section",{children:j?e.jsx("s-banner",{tone:"critical",children:e.jsx("s-paragraph",{children:j})}):e.jsx(z,{campaigns:v,pagination:C,onPageChange:_})}),l==="config"&&e.jsx("s-section",{children:e.jsx(N,{blocks:[{id:"product",title:"Product Page Setup",description:"To add the donation section to your product page, click the button below to insert the app block.",themeEditorUrl:`https://${g}/admin/themes/current/editor?template=product&context=apps`,buttonLabel:"Donation App Block on Product Page",previewSvg:A,enabled:f.productBlockEnabled,instructions:["Go to ","Online Store → Themes"," → Click on ","Customize"," → Select Product Page Template ","Click Add Block"," → Select ","Donation Product Page"," → Click ","Save"],onToggle:o=>{const x=new FormData;x.append("productBlockEnabled",String(o)),x.append("cartBlockEnabled",String(f.cartBlockEnabled)),n.submit(x,{method:"POST",action:"/api/block-config"})}},{id:"cart",title:"Cart Page Setup",description:"To add the donation section to your cart page, click the button below to insert the app block.",themeEditorUrl:`https://${g}/admin/themes/current/editor?template=cart&context=apps`,buttonLabel:"Donation App Block on Cart Page",previewSvg:B,enabled:f.cartBlockEnabled,instructions:["Go to ","Online Store → Themes"," → Click on ","Customize"," → Select Cart Page Template ","Click Add Block"," → Select ","Donation Cart Widget"," → Click ","Save"],onToggle:o=>{const x=new FormData;x.append("productBlockEnabled",String(f.productBlockEnabled)),x.append("cartBlockEnabled",String(o)),n.submit(x,{method:"POST",action:"/api/block-config"})}}]})})]}),e.jsx("style",{children:`
        .polaris-tabs {
          border-bottom: 1px solid #dfe3e8;
          margin-bottom: 20px;
        }
        .polaris-tabs-list {
          display: flex;
          gap: 0;
          overflow-x: auto;
        }
        .polaris-tab {
          padding: 12px 16px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          color: #000000;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .polaris-tab:hover {
          color: #6C4A79;
        }
        .polaris-tab.active {
          color: #6C4A79;
          border-bottom-color: #6C4A79;
        }
        .polaris-tab-panel {
          padding-top: 8px;
        }
      `})]})});export{G as default};
