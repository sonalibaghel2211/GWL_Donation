import{R as r,s as c,H as W,y as X,w as J,L as z}from"./chunk-4N6VE7H7-BqC2kd6o.js";import{j as e}from"./jsx-runtime-B5AtTLU8.js";import{u as Q}from"./useAppBridge-Bj34gXAL.js";import{c as Y,v as G,T as ee}from"./Text-OCQ3DZT_.js";import{v as te,I as H,e as ae,L as se,B as ne,s as ie}from"./Labelled-D079ugmz.js";import"./use-is-after-initial-mount-D2ouxzBY.js";var U=function(a){return r.createElement("svg",Object.assign({viewBox:"0 0 20 20"},a),r.createElement("path",{fillRule:"evenodd",d:"M15.655 4.344a2.695 2.695 0 0 0-3.81 0l-.599.599-.009-.009-1.06 1.06.008.01-5.88 5.88a2.75 2.75 0 0 0-.805 1.944v1.922a.75.75 0 0 0 .75.75h1.922a2.75 2.75 0 0 0 1.944-.806l7.54-7.539a2.695 2.695 0 0 0 0-3.81Zm-4.409 2.72-5.88 5.88a1.25 1.25 0 0 0-.366.884v1.172h1.172c.331 0 .65-.132.883-.366l5.88-5.88-1.689-1.69Zm2.75.629.599-.599a1.195 1.195 0 1 0-1.69-1.689l-.598.599 1.69 1.689Z"}))};U.displayName="EditIcon";var m={Select:"Polaris-Select",disabled:"Polaris-Select--disabled",error:"Polaris-Select--error",Backdrop:"Polaris-Select__Backdrop",Input:"Polaris-Select__Input",Content:"Polaris-Select__Content",InlineLabel:"Polaris-Select__InlineLabel",Icon:"Polaris-Select__Icon",SelectedOption:"Polaris-Select__SelectedOption",Prefix:"Polaris-Select__Prefix",hover:"Polaris-Select--hover",toneMagic:"Polaris-Select--toneMagic"};const M="";function T({options:t,label:a,labelAction:l,labelHidden:i,labelInline:n,disabled:p,helpText:d,placeholder:w,id:E,name:I,value:j=M,error:b,onChange:u,onFocus:f,onBlur:g,requiredIndicator:P,tone:v}){const{value:R,toggle:y}=te(!1),A=c.useId(),x=E??A,O=n?!0:i,N=Y(m.Select,b&&m.error,v&&m[G("tone",v)],p&&m.disabled),k=c.useCallback(S=>{y(),f==null||f(S)},[f,y]),_=c.useCallback(S=>{y(),g==null||g(S)},[g,y]),o=u?S=>u(S.currentTarget.value,x):void 0,s=[];d&&s.push(ie(x)),b&&s.push(`${x}Error`);let C=(t||[]).map(le);w&&(C=[{label:w,value:M,disabled:!0},...C]);const Z=n&&r.createElement(ne,{paddingInlineEnd:"100"},r.createElement(ee,{as:"span",variant:"bodyMd",tone:v&&v==="magic"&&!R?"magic-subdued":"subdued",truncate:!0},a)),$=re(C,j),q=$.prefix&&r.createElement("div",{className:m.Prefix},$.prefix),K=r.createElement("div",{className:m.Content,"aria-hidden":!0,"aria-disabled":p},Z,q,r.createElement("span",{className:m.SelectedOption},$.label),r.createElement("span",{className:m.Icon},r.createElement(H,{source:ae}))),V=C.map(ce);return r.createElement(se,{id:x,label:a,error:b,action:l,labelHidden:O,helpText:d,requiredIndicator:P,disabled:p},r.createElement("div",{className:N},r.createElement("select",{id:x,name:I,value:j,className:m.Input,disabled:p,onFocus:k,onBlur:_,onChange:o,"aria-invalid":!!b,"aria-describedby":s.length?s.join(" "):void 0,"aria-required":P},V),K,r.createElement("div",{className:m.Backdrop})))}function F(t){return typeof t=="string"}function L(t){return typeof t=="object"&&"options"in t&&t.options!=null}function B(t){return{label:t,value:t}}function le(t){if(F(t))return B(t);if(L(t)){const{title:a,options:l}=t;return{title:a,options:l.map(i=>F(i)?B(i):i)}}return t}function re(t,a){const l=oe(t);let i=l.find(n=>a===n.value);return i===void 0&&(i=l.find(n=>!n.hidden)),i||{value:"",label:""}}function oe(t){let a=[];return t.forEach(l=>{L(l)?a=a.concat(l.options):a.push(l)}),a}function D(t){const{value:a,label:l,prefix:i,key:n,...p}=t;return r.createElement("option",Object.assign({key:n??a,value:a},p),l)}function ce(t){if(L(t)){const{title:a,options:l}=t;return r.createElement("optgroup",{label:a,key:a},l.map(D))}return D(t)}const he=W(function(){const{settings:a,plan:l}=X(),i=l==="pro",n=J(),p=Q(),[d,w]=c.useState(a.enabled),[E,I]=c.useState(a.retryAttempts.toString()),[j,b]=c.useState(a.retryInterval.toString()),[u,f]=c.useState(a.fallbackAction),[g,P]=c.useState(a.sendNotifications),v=c.useCallback(s=>I(s),[]),R=c.useCallback(s=>b(s),[]),y=c.useCallback(s=>f(s),[]),A=Array.from({length:10},(s,h)=>({label:`${h+1} attempts`,value:`${h+1}`})),x=Array.from({length:10},(s,h)=>({label:`${h+1} Day${h===0?"":"s"}`,value:`${h+1}`})),O=[{label:"Pause Subscription",value:"pause"},{label:"Cancel Subscription",value:"cancel"},{label:"Skip Failed Order",value:"skip"}],N=n.state==="submitting",k=c.useRef(null);c.useEffect(()=>{n.state==="idle"&&n.data?k.current!=="handled"&&(k.current="handled",n.data.status==="success"?p.toast.show(n.data.message||"Recovery settings saved successfully"):n.data.status==="error"&&p.toast.show(n.data.message||"Failed to save settings",{isError:!0})):n.state==="submitting"&&(k.current="submitting")},[n.state,n.data,p]);const _=()=>{const s=new FormData;s.append("enabled",d.toString()),s.append("retryAttempts",E),s.append("retryInterval",j),s.append("fallbackAction",u),s.append("sendNotifications",g.toString()),n.submit(s,{method:"POST"})},o="#51395c";return e.jsxs("s-page",{heading:"Failed Payment Recovery Settings",children:[e.jsx("s-button",{slot:"primary-action",variant:"primary",onClick:i?_:()=>window.location.href="/app/pricing",className:"main-save-btn",...N?{loading:!0}:{},disabled:N,children:i?N?"Saving...":"Save Settings":"Upgrade to Unlock ↗"}),e.jsxs("div",{className:"recovery-settings-layout",children:[!i&&e.jsxs("div",{className:"plan-gate-banner",children:[e.jsx("div",{className:"plan-gate-icon",children:"🔒"}),e.jsxs("div",{className:"plan-gate-body",children:[e.jsx("h3",{children:"Pro Plan Feature"}),e.jsxs("p",{children:["Failed Payment Recovery and Smart Retry Automation are available exclusively on the ",e.jsx("strong",{children:"Pro Plan"}),"."]}),e.jsx(z,{to:"/app/pricing",className:"upgrade-link-btn",children:"Upgrade Plan to Unlock ↗"})]})]}),e.jsxs("div",{className:"settings-row",children:[e.jsxs("div",{className:"settings-info",children:[e.jsx("h2",{className:"section-title",children:"Enable Recovery"}),e.jsx("p",{className:"section-desc",children:"When enabled, our intelligent system will monitor and automatically retry failed recurring transactions to maximize your revenue."}),e.jsx("div",{style:{marginTop:"12px"},children:e.jsx("s-badge",{tone:d&&i?"success":"caution",children:d&&i?"Currently Active":"Currently Disabled"})})]}),e.jsx("div",{className:"settings-card",children:e.jsx("div",{className:"card-content",children:e.jsxs("div",{className:"toggle-box",children:[e.jsxs("div",{className:"toggle-text",children:[e.jsx("strong",{children:"Smart Recovery System"}),e.jsx("span",{children:"Automate the retry flow for failed billing attempts."})]}),e.jsxs("label",{className:"custom-switch",children:[e.jsx("input",{type:"checkbox",checked:d&&i,onChange:s=>w(s.target.checked),disabled:!i}),e.jsx("span",{className:"custom-slider"})]})]})})})]}),e.jsxs("div",{className:`recovery-logic-container ${d&&i?"active":"disabled"}`,children:[e.jsxs("div",{className:"settings-row",children:[e.jsxs("div",{className:"settings-info",children:[e.jsx("h2",{className:"section-title",children:"Retry Strategy"}),e.jsxs("p",{className:"section-desc",children:["Configure the intensity and timing of recovery attempts.",e.jsx("br",{}),e.jsx("br",{}),e.jsx("strong",{style:{color:o},children:"Tip:"})," Most successful stores use 3 attempts with 3-day intervals."]})]}),e.jsx("div",{className:"settings-card",children:e.jsxs("div",{className:"card-content",children:[e.jsx("div",{className:"input-group",children:e.jsx(T,{label:"Number of Recovery Attempts",options:A,value:E,onChange:v,disabled:!d})}),e.jsx("div",{className:"input-group",style:{marginTop:"20px"},children:e.jsx(T,{label:"Interval Between Retries",options:x,value:j,onChange:R,disabled:!d})})]})})]}),e.jsxs("div",{className:"settings-row",children:[e.jsxs("div",{className:"settings-info",children:[e.jsx("h2",{className:"section-title",children:"Fallback Action"}),e.jsx("p",{className:"section-desc",children:"Define what should happen automatically if all recovery attempts are exhausted and the payment is still not successful."})]}),e.jsx("div",{className:"settings-card",children:e.jsxs("div",{className:"card-content",children:[e.jsx(T,{label:"Final Resolution Action",options:O,value:u,onChange:y,disabled:!d}),e.jsxs("div",{className:"action-hint",children:[u==="skip"&&"The failed order will be skipped, but the subscription will remain active for the next billing cycle.",u==="pause"&&"The entire subscription will be placed on hold until the customer updates their payment info.",u==="cancel"&&"The subscription will be permanently cancelled. Use with caution."]})]})})]}),e.jsxs("div",{className:"settings-row",children:[e.jsxs("div",{className:"settings-info",children:[e.jsx("h2",{className:"section-title",children:"Communication"}),e.jsx("p",{className:"section-desc",children:"Keep your customers informed. Send automated emails when a payment fails to prompt them to update their billing details."})]}),e.jsx("div",{className:"settings-card",children:e.jsxs("div",{className:"card-content",children:[e.jsx("div",{className:"notification-toggle",children:e.jsx("s-checkbox",{checked:g,onChange:s=>P(s.target.checked),label:"Send automated payment failure emails",disabled:!d})}),g&&e.jsxs(z,{to:"/app/email-settings",className:"email-config-btn",children:[e.jsxs("div",{className:"btn-inner",children:[e.jsx("div",{className:"icon-wrap",children:e.jsx(H,{source:U,tone:"base"})}),e.jsx("span",{children:"Customize Email Template"})]}),e.jsx("svg",{width:"16",height:"16",viewBox:"0 0 20 20",children:e.jsx("path",{fill:"currentColor",d:"M12.72 10l-4.22 4.22a.75.75 0 101.06 1.06l4.75-4.75a.75.75 0 000-1.06l-4.75-4.75a.75.75 0 00-1.06 1.06L12.72 10z"})})]})]})})]})]}),e.jsx("div",{className:"footer-area",children:e.jsxs("p",{children:["Feature part of your ",e.jsx("strong",{children:"Pro Plan"})," subscription. ",e.jsx(z,{to:"/app/help",children:"Learn more about payment recovery"})]})})]}),e.jsx("style",{children:`
                .plan-gate-banner {
                    display: flex;
                    gap: 16px;
                    background: #fdf3f2;
                    border: 1px solid #f8b4b0;
                    border-radius: 12px;
                    padding: 16px 20px;
                    margin-bottom: 28px;
                    align-items: center;
                }
                .plan-gate-icon {
                    font-size: 28px;
                }
                .plan-gate-body h3 {
                    margin: 0 0 4px 0;
                    font-size: 16px;
                    font-weight: 700;
                    color: #c53030;
                }
                .plan-gate-body p {
                    margin: 0 0 8px 0;
                    font-size: 14px;
                    color: #6d7175;
                }
                .upgrade-link-btn {
                    display: inline-block;
                    background: #c53030;
                    color: white;
                    padding: 8px 16px;
                    border-radius: 8px;
                    text-decoration: none;
                    font-size: 13px;
                    font-weight: 600;
                    transition: opacity 0.2s;
                }
                .upgrade-link-btn:hover {
                    opacity: 0.9;
                }

                .recovery-settings-layout {
                    max-width: 1000px;
                    margin: 32px auto 60px;
                    padding: 0 20px;
                }

                .settings-row {
                    display: grid;
                    grid-template-columns: 1fr 1.5fr;
                    gap: 40px;
                    margin-bottom: 40px;
                    align-items: flex-start;
                }

                .settings-info {
                    padding-top: 8px;
                }

                .section-title {
                    font-size: 18px;
                    font-weight: 700;
                    color: #1a1c1d;
                    margin-bottom: 8px;
                }

                .section-desc {
                    font-size: 14px;
                    color: #6d7175;
                    line-height: 1.6;
                }

                .settings-card {
                    background: white;
                    border: 1px solid #e1e3e5;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    overflow: hidden;
                }

                .card-content {
                    padding: 24px;
                }

                .toggle-box {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 20px;
                }

                .toggle-text {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .toggle-text strong {
                    font-size: 15px;
                    color: #1a1c1d;
                }

                .toggle-text span {
                    font-size: 13px;
                    color: #6d7175;
                }

                .recovery-logic-container.disabled {
                    opacity: 0.5;
                    pointer-events: none;
                }

                .action-hint {
                    margin-top: 12px;
                    font-size: 13px;
                    color: ${o};
                    font-style: italic;
                    padding: 10px 14px;
                    background: ${o}08;
                    border-radius: 6px;
                    border-left: 3px solid ${o};
                }

                .email-config-btn {
                    margin-top: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px;
                    background: #fcfaff;
                    border: 1px solid ${o}15;
                    border-radius: 10px;
                    text-decoration: none;
                    color: ${o};
                    font-weight: 600;
                    transition: all 0.2s;
                }

                .email-config-btn:hover {
                    background: ${o}08;
                    border-color: ${o}30;
                }

                .btn-inner {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .icon-wrap {
                    width: 32px;
                    height: 32px;
                    background: white;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }

                .footer-area {
                    text-align: center;
                    padding-top: 40px;
                    border-top: 1px solid #e1e3e5;
                    color: #6d7175;
                    font-size: 14px;
                }

                .footer-area a {
                    color: ${o};
                    text-decoration: none;
                    font-weight: 600;
                }

                /* Custom Theme Styling */
                .main-save-btn {
                    background: ${o} !important;
                    border-color: ${o} !important;
                }

                /* Custom Switch */
                .custom-switch {
                    position: relative;
                    display: inline-block;
                    width: 44px;
                    height: 24px;
                    flex-shrink: 0;
                }

                .custom-switch input { opacity: 0; width: 0; height: 0; }

                .custom-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background-color: #cbd5e0;
                    transition: .4s;
                    border-radius: 34px;
                }

                .custom-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px; width: 18px;
                    left: 3px; bottom: 3px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }

                input:checked + .custom-slider { background-color: ${o}; }
                input:checked + .custom-slider:before { transform: translateX(20px); }

                @media (max-width: 768px) {
                    .settings-row {
                        grid-template-columns: 1fr;
                        gap: 16px;
                    }
                }
            `})]})});export{he as default};
