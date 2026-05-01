import{w as v,u as B,d as E,r as d,e as k}from"./chunk-UVKPFVEO-CEw7IaX3.js";import{j as e}from"./jsx-runtime-lA1hjGOj.js";import{c as p}from"./features-DWWjLmSf.js";import{R as C}from"./RichTextEditor-euPN7XAi.js";import{u as T}from"./useAppBridge-Bj34gXAL.js";const u={pauseSubject:"Subscription Paused",pauseBody:`<h2 style="color:#92400e;">Subscription Paused</h2>

<p>Hello <strong>{{first_name}}</strong>,</p>

<p>Your subscription for <strong>{{donation_name}}</strong> has been paused.</p>

<hr />

<p><strong>Order Number:</strong> {{orderNumber}}</p>
<p><strong>Amount:</strong> {{currency}}{{amount}}</p>
<p><strong>Frequency:</strong> {{frequency}}</p>

<hr />

<p>You can resume your subscription at any time from your account management page.</p>

<p>Thank you for your support ❤️</p>`,resumeSubject:"Subscription Resumed",resumeBody:`<h2 style="color:#008060;">Subscription Resumed</h2>

<p>Hello <strong>{{first_name}}</strong>,</p>

<p>Your subscription for <strong>{{donation_name}}</strong> has been successfully resumed.</p>

<hr />

<p><strong>Order Number:</strong> {{orderNumber}}</p>
<p><strong>Amount:</strong> {{currency}}{{amount}}</p>
<p><strong>Frequency:</strong> {{frequency}}</p>
<p><strong>Next Billing Date:</strong> {{nextBillingDate}}</p>

<hr />

<p>We are glad to have you back!</p>

<p>Thank you for your continued support ❤️</p>`},D=v(function(){const{settings:o,plan:a}=B(),i=E(),g=T(),[s,h]=d.useState({contactEmail:o.contactEmail,ccEmail:o.ccEmail||"",logoUrl:o.logoUrl||"",receiptSubject:o.receiptSubject,receiptBody:o.receiptBody,refundSubject:o.refundSubject,refundBody:o.refundBody,cancelSubject:o.cancelSubject,cancelBody:o.cancelBody,pauseSubject:o.pauseSubject||u.pauseSubject,pauseBody:o.pauseBody||u.pauseBody,resumeSubject:o.resumeSubject||u.resumeSubject,resumeBody:o.resumeBody||u.resumeBody}),[j]=d.useState(()=>({...s})),x=Object.keys(s).some(t=>s[t]!==j[t]),[r,f]=d.useState("receipt"),m=i.state==="submitting"&&i.formMethod==="POST";d.useEffect(()=>{var t;((t=i.data)==null?void 0:t.status)==="success"&&g.toast.show("Email settings saved successfully")},[i.data,g]);const l=d.useCallback((t,n)=>{h(c=>({...c,[t]:n}))},[]),y=d.useCallback(()=>{const t=new FormData;Object.entries(s).forEach(([n,c])=>{t.append(n,c)}),i.submit(t,{method:"POST"})},[s,i]);return e.jsxs("s-page",{heading:"Email Configuration Settings",children:[e.jsx("s-button",{slot:"primary-action",variant:"primary",onClick:y,disabled:m||!x,...m?{loading:!0}:{},children:m?"Saving...":x?"Save":"No Changes"}),e.jsxs("div",{style:{display:"flex",gap:"24px",marginTop:"16px"},children:[e.jsx("div",{style:{flex:"0 0 250px"},children:e.jsx("s-text",{color:"subdued",children:"Configure the email settings for the donation section. Ensure all fields are filled out correctly for proper functioning."})}),e.jsx("div",{style:{flex:1},children:e.jsx("s-box",{padding:"large-200",borderWidth:"base",borderRadius:"large-100",background:"subdued",children:e.jsxs("s-stack",{direction:"block",gap:"large-200",children:[e.jsxs("s-box",{children:[e.jsxs("div",{style:{marginBottom:"16px"},children:[e.jsx("s-text-field",{label:"Your Contact Email",value:s.contactEmail,onChange:t=>l("contactEmail",t.target.value)}),e.jsx("div",{style:{marginTop:"4px"},children:e.jsx("s-text",{color:"subdued",children:"Customers who reply to the email will reach you at this address."})})]}),e.jsx("div",{style:{marginBottom:"16px"},children:e.jsx("s-text-field",{label:"Additional/CC Email ID (Optional)",value:s.ccEmail,onChange:t=>l("ccEmail",t.target.value)})}),e.jsxs("div",{style:{marginBottom:"16px"},children:[e.jsx("div",{style:{marginBottom:"8px"},children:e.jsx("strong",{children:"Email Logo (Optional)"})}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"12px"},children:[e.jsx("s-button",{onClick:()=>{var t;return(t=document.getElementById("logo-upload"))==null?void 0:t.click()},children:"Upload Logo"}),e.jsx("input",{id:"logo-upload",type:"file",accept:"image/*",style:{display:"none"},onChange:t=>{var c;const n=(c=t.target.files)==null?void 0:c[0];if(n){if(n.size>1024*1024){g.toast.show("File too large. Please use an image under 1MB.");return}const b=new FileReader;b.onload=S=>{l("logoUrl",S.target.result)},b.readAsDataURL(n)}}}),s.logoUrl&&e.jsx("s-button",{variant:"tertiary",tone:"critical",onClick:()=>l("logoUrl",""),children:"Remove"})]}),s.logoUrl&&e.jsx("div",{style:{marginTop:"12px",padding:"12px",background:"#fff",borderRadius:"4px",border:"1px solid #eee",display:"inline-block"},children:e.jsx("img",{src:s.logoUrl,alt:"Logo Preview",style:{maxHeight:"60px",display:"block"}})})]})]}),e.jsxs("s-box",{children:[e.jsx("div",{className:"polaris-tabs",children:e.jsx("div",{className:"polaris-tabs-list",role:"tablist",children:[{id:"receipt",label:"Receipt Template"},{id:"refund",label:"Refund Template"},{id:"cancel",label:"Cancellation Template"}].map(t=>e.jsx("button",{role:"tab","aria-selected":r===t.id,className:`polaris-tab ${r===t.id?"active":""}`,onClick:()=>f(t.id),children:t.label},t.id))})}),e.jsx("s-stack",{direction:"block",gap:"base",children:r==="refund"&&!p(a,"canSendRefundEmail")||r==="cancel"&&!p(a,"canSendCancelEmail")?e.jsx("s-box",{padding:"large-200",background:"subdued",borderRadius:"base",borderWidth:"base",children:e.jsx("s-stack",{direction:"block",gap:"base",children:e.jsxs("div",{style:{textAlign:"center",width:"100%"},children:[e.jsx("s-text",{type:"strong",children:"Plan Upgrade Required"}),e.jsx("s-box",{"padding-block-start":"base",children:e.jsxs("s-text",{color:"subdued",children:["The ",r," email feature is available on the",e.jsxs("strong",{children:[" ",r==="refund"?"Advanced":"Pro"]})," plan and above."]})}),e.jsx("s-box",{"padding-block-start":"base",children:e.jsx(k,{to:"/app/pricing",style:{textDecoration:"none"},children:e.jsx("s-button",{variant:"primary",children:"View Pricing Plans"})})})]})})}):e.jsxs(e.Fragment,{children:[e.jsx("s-text-field",{label:"Email Subject Line",disabled:!p(a,"canEditTemplates"),value:r==="receipt"?s.receiptSubject:r==="refund"?s.refundSubject:s.cancelSubject,onInput:t=>l(r==="receipt"?"receiptSubject":r==="refund"?"refundSubject":"cancelSubject",t.target.value)}),e.jsxs("div",{children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"8px"},children:[e.jsx("span",{style:{fontWeight:500},children:"Email Template"}),!p(a,"canEditTemplates")&&e.jsx("s-badge",{tone:"caution",children:"View Only"})]}),e.jsxs("div",{style:{padding:"12px",background:"#f4f6f8",borderRadius:"4px",fontSize:"13px",marginBottom:"12px",color:"#5c5f62"},children:[e.jsx("strong",{children:"Available Variables:"})," ",e.jsx("code",{children:"{{first_name}}"}),", ",e.jsx("code",{children:"{{last_name}}"}),", ",e.jsx("code",{children:"{{email}}"}),", ",e.jsx("code",{children:"{{currency}}"}),", ",e.jsx("code",{children:"{{amount}}"}),", ",e.jsx("code",{children:"{{orderNumber}}"}),", ",e.jsx("code",{children:"{{date}}"}),", ",e.jsx("code",{children:"{{donation_name}}"}),", ",e.jsx("code",{children:"{{frequency}}"}),", ",e.jsx("code",{children:"{{nextBillingDate}}"})]}),!p(a,"canEditTemplates")&&e.jsx("div",{style:{marginBottom:"12px"},children:e.jsxs("s-banner",{tone:"info",children:[e.jsx("div",{slot:"title",children:"Custom Templates Locked"}),e.jsxs("p",{children:["Upgrade to the ",e.jsx("strong",{children:"Pro"})," plan to customize your email templates with dynamic variables."]})]})}),e.jsx(C,{disabled:!p(a,"canEditTemplates"),value:r==="receipt"?s.receiptBody:r==="refund"?s.refundBody:s.cancelBody,onChange:t=>l(r==="receipt"?"receiptBody":r==="refund"?"refundBody":"cancelBody",t)})]})]})})]})]})})})]}),e.jsx("style",{children:`
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
            `})]})});export{D as default};
