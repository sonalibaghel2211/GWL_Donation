import{H as re,y as ae,w as se,s as p,L as le}from"./chunk-4N6VE7H7-BqC2kd6o.js";import{j as e}from"./jsx-runtime-B5AtTLU8.js";import{h as b}from"./features-5Bqc8eBJ.js";import{R as H}from"./RichTextEditor-BfI8OrN1.js";import{u as de}from"./useAppBridge-Bj34gXAL.js";function q(f){var r;if(!f||!f.trim()||f==="null"||f==="undefined")return"";if(f.startsWith("data:image/"))return f;if(typeof window>"u"&&typeof process<"u"&&((r=process.versions)!=null&&r.node))try{const a=require("fs"),j=require("path"),c=f.startsWith("http")?new URL(f):null,m=c?c.pathname:f;if(m.includes("/uploads/")){const s=j.basename(m),n=j.join(process.cwd(),"public","uploads",s);if(a.existsSync(n)){const g=a.readFileSync(n),v=j.extname(s).replace(".","")||"png";return`data:${v==="svg"?"image/svg+xml":`image/${v}`};base64,${g.toString("base64")}`}}}catch(a){console.warn("[getEffectiveLogoUrl] Error converting logoUrl:",a)}return f}const N=`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: A4 portrait;
    margin: 0;
  }
  html, body {
    margin: 0;
    padding: 0;
    background-color: #ffffff;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #1A1A2E;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .receipt-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px 24px;
    box-sizing: border-box;
    page-break-after: avoid;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .header {
    background-color: #6C4A79;
    color: #ffffff;
    padding: 16px 24px;
    border-radius: 6px 6px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header-title h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
  }
  .header-title p {
    margin: 4px 0 0 0;
    font-size: 11px;
    opacity: 0.85;
  }
  .header-date {
    font-size: 11px;
    text-align: right;
  }
  .info-bar {
    background-color: #F7F5F9;
    padding: 10px 16px;
    font-size: 11.5px;
    font-weight: bold;
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid #E0E0E0;
    margin-bottom: 14px;
  }
  .section-title {
    font-size: 11.5px;
    font-weight: bold;
    color: #6C4A79;
    letter-spacing: 0.5px;
    margin-top: 14px;
    margin-bottom: 4px;
    text-transform: uppercase;
  }
  .divider {
    border-top: 1px solid #E0E0E0;
    margin-bottom: 10px;
  }
  .grid {
    display: flex;
    flex-wrap: wrap;
    margin-bottom: 12px;
    gap: 15px;
  }
  .col {
    flex: 1;
    min-width: 200px;
  }
  .info-row {
    display: flex;
    margin-bottom: 5px;
    font-size: 11.5px;
  }
  .info-label {
    width: 120px;
    font-weight: bold;
    color: #666666;
  }
  .info-value {
    flex: 1;
    color: #1A1A2E;
  }
  .amount-box {
    background-color: #F8F0FC;
    border-left: 4px solid #6C4A79;
    padding: 12px 16px;
    margin: 14px 0;
  }
  .amount-label {
    font-size: 10px;
    font-weight: bold;
    color: #666666;
    letter-spacing: 0.5px;
  }
  .amount-value {
    font-size: 22px;
    font-weight: 700;
    color: #6C4A79;
    margin-top: 3px;
  }
  .letter-body {
    font-size: 12px;
    color: #1A1A2E;
    line-height: 1.5;
    margin: 14px 0;
  }
  .signature-block {
    margin-top: 16px;
    font-size: 11.5px;
  }
  .signature-title {
    font-weight: bold;
    margin-top: 4px;
  }
  .footer {
    border-top: 1px solid #E0E0E0;
    margin-top: 20px;
    padding-top: 10px;
    text-align: center;
    font-size: 9.5px;
    color: #888888;
  }
</style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div class="header-title">
        {{#if logo_url}}
          <img src="{{logo_url}}" style="max-height: 42px; max-width: 180px; object-fit: contain; margin-bottom: 8px; display: block;" />
        {{/if}}
        <h1>DONATION RECEIPT</h1>
        <p>Smart Donate &middot; Recurring & Receipts</p>
      </div>
      <div class="header-date">
        Date: {{date}}
      </div>
    </div>
    
    <div class="info-bar">
      <span>Receipt: {{receipt_number}}</span>
      <span>Order: {{order_number}}</span>
      <span>Date: {{date}}</span>
    </div>
    
    <div class="section-title">Donor Information</div>
    <div class="divider"></div>
    
    <div class="grid">
      <div class="col">
        <div class="info-row">
          <span class="info-label">Name:</span>
          <span class="info-value">{{customer_name}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value">{{customer_email}}</span>
        </div>
      </div>
      <div class="col">
        <div class="info-row">
          <span class="info-label">Billing Address:</span>
          <span class="info-value" style="white-space: pre-line;">{{billing_address}}</span>
        </div>
      </div>
    </div>
    
    <div class="section-title">Donation Summary</div>
    <div class="divider"></div>
    
    <div class="info-row">
      <span class="info-label">Campaign:</span>
      <span class="info-value">{{donation_name}}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Donation Type:</span>
      <span class="info-value">{{donation_type}}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Gift Date:</span>
      <span class="info-value">{{date}}</span>
    </div>
    
    <div class="amount-box">
      <div class="amount-label">DONATION AMOUNT</div>
      <div class="amount-value">{{amount}}</div>
    </div>
    
    <div class="section-title">Acknowledgement</div>
    <div class="divider"></div>
    
    <div class="letter-body">
      {{acknowledgement_text}}
    </div>
    
    <div class="signature-block">
      <p style="font-style: italic; color: #666666; margin-bottom: 10px;">Authorized by,</p>
      <div class="signature-title">Smart Donate Team</div>
      <div style="color: #666666;">{{shop_name}}</div>
    </div>
    
    <div class="footer">
      <p style="margin: 2px 0;">This receipt was generated by Smart Donate &middot; Recurring & Receipts. Please retain this document for your records.</p>
      <p style="margin: 2px 0;">{{footer_note}}</p>
    </div>
  </div>
</body>
</html>`,L=`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: A4 portrait;
    margin: 0;
  }
  html, body {
    margin: 0;
    padding: 0;
    background-color: #ffffff;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #1A1A2E;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .receipt-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px 24px;
    box-sizing: border-box;
    page-break-after: avoid;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .header {
    background-color: #B91C1C;
    color: #ffffff;
    padding: 16px 24px;
    border-radius: 6px 6px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header-title h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
  }
  .header-title p {
    margin: 4px 0 0 0;
    font-size: 11px;
    opacity: 0.85;
  }
  .header-date {
    font-size: 11px;
    text-align: right;
  }
  .void-banner {
    background-color: #FEF2F2;
    border-left: 3px solid #B91C1C;
    padding: 8px 14px;
    font-size: 11px;
    font-weight: bold;
    color: #B91C1C;
    margin-top: 8px;
  }
  .info-bar {
    background-color: #F7F5F9;
    padding: 10px 16px;
    font-size: 11.5px;
    font-weight: bold;
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid #E0E0E0;
    margin-bottom: 14px;
  }
  .section-title {
    font-size: 11.5px;
    font-weight: bold;
    color: #B91C1C;
    letter-spacing: 0.5px;
    margin-top: 14px;
    margin-bottom: 4px;
    text-transform: uppercase;
  }
  .divider {
    border-top: 1px solid #E0E0E0;
    margin-bottom: 10px;
  }
  .grid {
    display: flex;
    flex-wrap: wrap;
    margin-bottom: 12px;
    gap: 15px;
  }
  .col {
    flex: 1;
    min-width: 200px;
  }
  .info-row {
    display: flex;
    margin-bottom: 5px;
    font-size: 11.5px;
  }
  .info-label {
    width: 120px;
    font-weight: bold;
    color: #666666;
  }
  .info-value {
    flex: 1;
    color: #1A1A2E;
  }
  .amount-box {
    background-color: #FEF2F2;
    border-left: 4px solid #B91C1C;
    padding: 12px 16px;
    margin: 14px 0;
    display: flex;
    gap: 40px;
  }
  .amount-col {
    flex: 1;
  }
  .amount-label {
    font-size: 10px;
    font-weight: bold;
    color: #666666;
    letter-spacing: 0.5px;
  }
  .amount-value {
    font-size: 22px;
    font-weight: 700;
    margin-top: 3px;
  }
  .letter-body {
    font-size: 12px;
    color: #1A1A2E;
    line-height: 1.5;
    margin: 14px 0;
  }
  .signature-block {
    margin-top: 16px;
    font-size: 11.5px;
  }
  .signature-title {
    font-weight: bold;
    margin-top: 4px;
  }
  .footer {
    border-top: 1px solid #E0E0E0;
    margin-top: 20px;
    padding-top: 10px;
    text-align: center;
    font-size: 9.5px;
    color: #888888;
  }
</style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div class="header-title">
        {{#if logo_url}}
          <img src="{{logo_url}}" style="max-height: 42px; max-width: 180px; object-fit: contain; margin-bottom: 8px; display: block;" />
        {{/if}}
        <h1>CANCELLATION RECEIPT</h1>
        <p>Smart Donate &middot; Recurring & Receipts</p>
      </div>
      <div class="header-date">
        Cancellation Date: {{cancel_date}}
      </div>
    </div>
    
    <div class="void-banner">
      VOIDED &mdash; This donation has been cancelled. This receipt is not valid for tax deduction purposes.
    </div>
    
    <div class="info-bar" style="margin-top: 8px;">
      <span>Receipt: {{receipt_number}}</span>
      <span>Order: {{order_number}}</span>
      <span>Date: {{date}}</span>
    </div>
    
    <div class="section-title">Donor Information</div>
    <div class="divider"></div>
    
    <div class="grid">
      <div class="col">
        <div class="info-row">
          <span class="info-label">Name:</span>
          <span class="info-value">{{customer_name}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value">{{customer_email}}</span>
        </div>
      </div>
      <div class="col">
        <div class="info-row">
          <span class="info-label">Billing Address:</span>
          <span class="info-value" style="white-space: pre-line;">{{billing_address}}</span>
        </div>
      </div>
    </div>
    
    <div class="section-title">Donation Summary</div>
    <div class="divider"></div>
    
    <div class="info-row">
      <span class="info-label">Campaign:</span>
      <span class="info-value">{{donation_name}}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Donation Type:</span>
      <span class="info-value">{{donation_type}}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Gift Date:</span>
      <span class="info-value">{{date}}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Cancellation Date:</span>
      <span class="info-value">{{cancel_date}}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Original Receipt:</span>
      <span class="info-value">{{original_receipt_number}}</span>
    </div>
    
    <div class="amount-box">
      <div class="amount-col">
        <div class="amount-label">ORIGINAL AMOUNT</div>
        <div class="amount-value" style="color: #666666; text-decoration: line-through;">{{amount}}</div>
      </div>
      <div class="amount-col">
        <div class="amount-label">ELIGIBLE AMOUNT</div>
        <div class="amount-value" style="color: #B91C1C;">{{zero_amount}}</div>
      </div>
    </div>
    
    <div class="section-title">Cancellation Notice</div>
    <div class="divider"></div>
    
    <div class="letter-body">
      {{acknowledgement_text}}
    </div>
    
    <div class="signature-block">
      <p style="font-style: italic; color: #666666; margin-bottom: 10px;">Authorized by,</p>
      <div class="signature-title">Smart Donate Team</div>
      <div style="color: #666666;">{{shop_name}}</div>
    </div>
    
    <div class="footer">
      <p style="margin: 2px 0;">This receipt was generated by Smart Donate &middot; Recurring & Receipts. Please retain this document for your records.</p>
      <p style="margin: 2px 0;">VOID &mdash; This receipt has been cancelled and is not valid for tax deductions.</p>
    </div>
  </div>
</body>
</html>`,$=`<p>Dear {{first_name}},</p>
<p>Thank you for your generous donation of {{amount}} to "{{donation_name}}". Your contribution is greatly appreciated and makes a meaningful difference.</p>
<p>This receipt serves as official confirmation of your donation and should be retained for your personal records.</p>
<p>On behalf of {{shop_name}}, we are truly grateful for your kindness and support.</p>`,Y=`<p>Dear {{first_name}},</p>
<p>This confirms that your donation receipt ({{original_receipt_number}}), dated {{date}}, for {{amount}} has been cancelled and voided. The eligible amount has been adjusted to {{zero_amount}}.</p>
<p>This receipt is no longer valid for tax deduction purposes. If you have questions, please contact the store where you made your donation.</p>
<p>We appreciate your generosity and hope to support your giving in the future.</p>`;function ce(f,r){const a=new Date(r.createdDate).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}),j=r.cancellationDate?new Date(r.cancellationDate).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}):new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}),c=r.customerName.split(" ")[0]||"Donor",m=r.customerName.split(" ").slice(1).join(" ")||"",s=r.shopName.charAt(0).toUpperCase()+r.shopName.slice(1),n=(r.currencyCode||"USD").toUpperCase().trim();let g,v;try{const k=new Intl.NumberFormat(void 0,{style:"currency",currency:n});g=k.format(parseFloat(r.donationAmount||"0")),v=k.format(0)}catch{g=`${n} ${parseFloat(r.donationAmount||"0").toFixed(2)}`,v=`${n} 0.00`}const E=q(r.logoUrl),T={first_name:c,last_name:m,customer_name:r.customerName,customer_email:r.customerEmail,email:r.customerEmail,amount:g,donation_type:r.donationType,frequency:r.frequency,campaign_name:r.campaignName||"General Donation",donation_name:r.campaignName||"General Donation",date:a,cancel_date:j,order_number:r.orderNumber,receipt_number:r.receiptNumber||"N/A",original_receipt_number:r.originalReceiptNumber||"N/A",shop_name:s,billing_address:r.billingAddress||"",shipping_address:r.shippingAddress||"",logo_url:E,footer_note:r.footerNote||`Generated on ${new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}`,zero_amount:v};let h=f;return E?h=h.replace(/\{\{#if logo_url\}\}([\s\S]*?)\{\{\/if\}\}/gi,"$1"):h=h.replace(/\{\{#if logo_url\}\}([\s\S]*?)\{\{\/if\}\}/gi,""),Object.entries(T).forEach(([k,S])=>{const F=new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`,"gi");h=h.replace(F,S)}),h}function pe(f){const r=f.toUpperCase().trim();try{const c=new Intl.NumberFormat(void 0,{style:"currency",currency:r,minimumFractionDigits:0,maximumFractionDigits:0}).formatToParts(0).find(m=>m.type==="currency");return c?c.value:r}catch{return r}}const u={receiptSubject:"Thank you for your donation",receiptBody:`<h2 style="color:#008060;">Thank You for Your Donation ❤️</h2>

<p>Hello <strong>{{first_name}}</strong>,</p>

<p>We truly appreciate your generous contribution. Here are your donation details:</p>

<hr />

<p><strong>Donation Name:</strong> {{donation_name}}</p>
<p><strong>Order Number:</strong> {{orderNumber}}</p>
<p><strong>Date:</strong> {{date}}</p>
<p><strong>Amount:</strong> {{currency}}{{amount}}</p>

<hr />

<p>Your support helps us make a meaningful impact.</p>

<p>Thank you for your kindness ❤️</p>`,refundSubject:"Donation Refund Confirmation",refundBody:`<h2 style="color:#d82c0d;">Donation Refund Processed</h2>

<p>Hello <strong>{{first_name}}</strong>,</p>

<p>Your donation has been successfully refunded.</p>

<hr />

<p><strong>Donation Name:</strong> {{donation_name}}</p>
<p><strong>Order Number:</strong> {{orderNumber}}</p>
<p><strong>Refund Amount:</strong> {{currency}}{{amount}}</p>
<p><strong>Date:</strong> {{date}}</p>

<hr />

<p>The amount will reflect in your account within a few business days.</p>

<p>If you have any questions, feel free to contact us.</p>`,cancelSubject:"Donation Cancellation",cancelBody:`<h2 style="color:#6d7175;">Donation Cancelled</h2>

<p>Hello <strong>{{first_name}}</strong>,</p>

<p>Your donation has been cancelled successfully.</p>

<hr />

<p><strong>Donation Name:</strong> {{donation_name}}</p>
<p><strong>Order Number:</strong> {{orderNumber}}</p>
<p><strong>Amount:</strong> {{currency}}{{amount}}</p>
<p><strong>Date:</strong> {{date}}</p>

<hr />

<p>If this was not intended, please reach out to us.</p>

<p>We appreciate your support 🙏</p>`,pauseSubject:"Subscription Paused",pauseBody:`<h2 style="color:#92400e;">Subscription Paused</h2>

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

<p>Thank you for your continued support ❤️</p>`,reminderBody:`<h2 style="color:#6c4a79;">Donation Reminder ❤️</h2>
<p>Hello <strong>{{first_name}}</strong>,</p>
<p>This is a friendly reminder that your next donation of <strong>{{currency}}{{amount}}</strong> for <strong>{{donation_name}}</strong> is scheduled for {{nextBillingDate}}.</p>
<hr />
<p><strong>Frequency:</strong> {{frequency}}</p>
<p><strong>Amount:</strong> {{currency}}{{amount}}</p>
<hr />
<p>Thank you for your continued support! You can manage your subscription at any time using the link below.</p>`,recoverySubject:"Action Required: Your donation payment failed",recoveryBody:`<h2 style="color:#d82c0d;">Payment Failed ⚠️</h2>

<p>Hello <strong>{{first_name}}</strong>,</p>

<p>We're writing to let you know that we were unable to process your recurring donation of <strong>{{currency}}{{amount}}</strong> for <strong>{{donation_name}}</strong>.</p>

<p>Don't worry! We will automatically retry the payment in a few days. However, to ensure your donation continues without interruption, please verify your payment details in your account.</p>

<hr />

<p><strong>Reason:</strong> Payment method declined</p>
<p><strong>Amount:</strong> {{currency}}{{amount}}</p>
<p><strong>Next Retry:</strong> {{nextBillingDate}}</p>

<hr />

<p>You can update your payment information by clicking the button below:</p>

<p><a href="{{account_url}}" style="display:inline-block;padding:12px 24px;background:#51395c;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Update Payment Info</a></p>

<p>Thank you for your ongoing support!</p>`,reminderSubject:"Upcoming Donation Reminder: {{amount}}"},ye=re(function(){const r=ae(),{settings:a,plan:j,subscription:c}=r,m=se(),s=de(),[n,g]=p.useState({contactEmail:a.contactEmail,ccEmail:a.ccEmail||"",logoUrl:a.logoUrl||"",receiptSubject:a.receiptSubject,receiptBody:a.receiptBody||"",refundSubject:a.refundSubject,refundBody:a.refundBody||"",cancelSubject:a.cancelSubject,cancelBody:a.cancelBody||"",pauseSubject:a.pauseSubject||u.pauseSubject,pauseBody:a.pauseBody||u.pauseBody,resumeSubject:a.resumeSubject||u.resumeSubject,resumeBody:a.resumeBody||u.resumeBody,reminderSubject:a.reminderSubject||u.reminderSubject,reminderBody:a.reminderBody||u.reminderBody,recoverySubject:a.recoverySubject||u.recoverySubject,recoveryBody:a.recoveryBody||u.recoveryBody,notifyMerchantOnSubscriptionChange:a.notifyMerchantOnSubscriptionChange??!1,receiptAcknowledgementText:a.receiptAcknowledgementText||N,receiptFooterNote:a.receiptFooterNote||"",receiptCancelAcknowledgementText:a.receiptCancelAcknowledgementText||L}),[v,E]=p.useState(()=>({...n})),T=m.state==="submitting"&&m.formMethod==="POST",h=p.useRef(null);p.useEffect(()=>{var t;m.state==="idle"&&((t=m.data)==null?void 0:t.status)==="success"?(m.data.status+new Date().getTime(),h.current!=="handled"&&(h.current="handled",s.toast.show("Email settings saved successfully"),E({...n}))):m.state==="submitting"&&(h.current="submitting")},[m.state,m.data,s,n]);const k=Object.keys(n).some(t=>n[t]!==v[t]),[S,F]=p.useState({}),[o,z]=p.useState("receipt"),[R,G]=p.useState(!1),[_,V]=p.useState(!1),[C,P]=p.useState(null),[D,O]=p.useState(null),[w,I]=p.useState("emails"),[ue,me]=p.useState(""),J=p.useCallback(()=>{var M;const t=o==="pdf-cancel";let i=t?n.receiptCancelAcknowledgementText||L:n.receiptAcknowledgementText||N;(!i||!i.trim())&&(i=t?L:N);const d=/<[a-z][\s\S]*>/i.test(i);let l="";if(d)l=i;else{const B=t?L:N,ne=i.replace(/\n/g,"<br>"),ie=t?Y:$;B.includes("{{acknowledgement_text}}")?l=B.replace("{{acknowledgement_text}}",ne):l=B.replace("{{acknowledgement_text}}",ie)}if(l.includes("{{acknowledgement_text}}")){const B=t?Y:$;l=l.replace("{{acknowledgement_text}}",B)}const A={shopName:((M=r==null?void 0:r.shop)==null?void 0:M.replace(".myshopify.com",""))||"Smart Donate Store",customerName:"Jane Doe",customerEmail:"jane.doe@example.com",orderNumber:"#1042",donationAmount:"25.00",donationType:t?"Recurring (Monthly)":"Preset Donation",frequency:t?"Monthly":"One-time",campaignName:"Children's Education Fund",createdDate:new Date,shippingAddress:`Jane Doe
123 Main Street
New York, NY 10001
United States`,billingAddress:`Jane Doe
123 Main Street
New York, NY 10001
United States`,currencyCode:r.currencyCode||"USD",status:t?"cancelled":"active",receiptNumber:"RCP-PREVIEW",cancellationDate:new Date,originalReceiptNumber:"RCP-ORIGINAL",logoUrl:n.logoUrl||"",footerNote:n.receiptFooterNote||`Generated on ${new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}`};return ce(l,A)},[n,o,r]),K=p.useCallback(async t=>{P(t),s.toast.show(`Generating ${t==="cancel"?"cancellation":"donation"} receipt preview...`);try{const i=await fetch(`/api/preview-receipt?type=${t}`);if(!i.ok){const A=await i.text();s.toast.show(A||"Failed to generate receipt preview",{isError:!0});return}const d=await i.blob(),l=new Blob([d],{type:"application/pdf"}),x=URL.createObjectURL(l);window.open(x,"_blank")}catch(i){console.error("[PreviewReceipt] Error:",i),s.toast.show("Failed to open receipt preview",{isError:!0})}finally{P(null)}},[s]),Q=p.useCallback(async t=>{O(t),s.toast.show(`Generating ${t==="cancel"?"cancellation":"donation"} receipt for download...`);try{const i=await fetch(`/api/preview-receipt?type=${t}`);if(!i.ok){const A=await i.text();s.toast.show(A||"Failed to generate receipt for download",{isError:!0});return}const d=await i.blob(),l=URL.createObjectURL(d),x=document.createElement("a");x.href=l,x.download=`receipt-${t}-preview.pdf`,document.body.appendChild(x),x.click(),document.body.removeChild(x),URL.revokeObjectURL(l),s.toast.show("Receipt downloaded successfully!")}catch(i){console.error("[DownloadReceipt] Error:",i),s.toast.show("Failed to download receipt",{isError:!0})}finally{O(null)}},[s]),X={first_name:"Jane",last_name:"Doe",email:"jane.doe@example.com",currency:pe(r.currencyCode||"USD"),amount:"25.00",orderNumber:"#1042",date:new Date().toLocaleDateString(),donation_name:"Children's Education Fund",frequency:"Monthly",nextBillingDate:new Date(Date.now()+30*864e5).toLocaleDateString(),account_url:"#"},U=t=>{let i=t;return Object.entries(X).forEach(([d,l])=>{const x=new RegExp(`\\{\\{(\\s*<[^>]*>\\s*)*${d}(\\s*<[^>]*>\\s*)*\\}\\}`,"gi");d==="account_url"?i=i.replace(x,l):i=i.replace(x,`<strong style="color:#6C4A79">${l}</strong>`)}),i},Z=()=>{const t=U(o==="receipt"?n.receiptBody:o==="refund"?n.refundBody:o==="cancel"?n.cancelBody:o==="reminder"?n.reminderBody:n.recoveryBody),i=q(n.logoUrl);return`
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;line-height:1.6;">
                ${i&&i.trim()&&i!=="null"?`<div style="margin-bottom:24px;"><img src="${i}" alt="Logo" style="max-height:50px;display:block;" /></div>`:""}
                <div>${t}</div>
            </div>
        `},ee=()=>{const t={},i=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;return n.contactEmail?i.test(n.contactEmail)||(t.contactEmail="Invalid email format"):t.contactEmail="Contact email is required",n.ccEmail&&!i.test(n.ccEmail)&&(t.ccEmail="Invalid CC email format"),F(t),Object.keys(t).length===0},y=p.useCallback((t,i)=>{g(d=>({...d,[t]:i})),S[t]&&F(d=>{const l={...d};return delete l[t],l})},[S]),te=p.useCallback(()=>{if(!ee()){s.toast.show("Please fix the errors before saving",{isError:!0});return}const t=new FormData;Object.entries(n).forEach(([i,d])=>{t.append(i,d)}),m.submit(t,{method:"POST"})},[n,m,s]),W=p.useCallback(()=>{o==="receipt"?(g(t=>({...t,receiptSubject:u.receiptSubject,receiptBody:u.receiptBody})),s.toast.show("Restored default format for Donation Receipt Email")):o==="refund"?(g(t=>({...t,refundSubject:u.refundSubject,refundBody:u.refundBody})),s.toast.show("Restored default format for Donation Refund Email")):o==="cancel"?(g(t=>({...t,cancelSubject:u.cancelSubject,cancelBody:u.cancelBody})),s.toast.show("Restored default format for Donation Cancellation Email")):o==="reminder"?(g(t=>({...t,reminderSubject:u.reminderSubject,reminderBody:u.reminderBody})),s.toast.show("Restored default format for Donation Reminder Email")):o==="recovery"?(g(t=>({...t,recoverySubject:u.recoverySubject,recoveryBody:u.recoveryBody})),s.toast.show("Restored default format for Payment Recovery Email")):o==="pdf-donation"?(g(t=>({...t,receiptAcknowledgementText:N})),s.toast.show("Restored default format for PDF Donation Receipt")):o==="pdf-cancel"&&(g(t=>({...t,receiptCancelAcknowledgementText:L})),s.toast.show("Restored default format for PDF Cancellation Receipt"))},[o,s]),oe=Object.keys(S).length>0;return e.jsxs("s-page",{heading:"Email Configuration Settings",children:[e.jsx("s-button",{slot:"primary-action",variant:"primary",onClick:te,disabled:T||!k||oe,...T?{loading:!0}:{},children:T?"Saving...":k?"Save":"No Changes"}),e.jsxs("div",{style:{display:"flex",gap:"24px",marginTop:"16px"},children:[e.jsxs("div",{style:{flex:"0 0 250px",display:"flex",flexDirection:"column",gap:"20px"},children:[e.jsxs("div",{style:{background:"#fff",padding:"16px",borderRadius:"8px",border:"1px solid #e1e3e5",display:"flex",flexDirection:"column",gap:"8px"},children:[e.jsxs("button",{type:"button",onClick:()=>{I("emails"),z("receipt")},style:{display:"flex",alignItems:"center",gap:"10px",width:"100%",padding:"10px 12px",border:"none",borderRadius:"6px",background:w==="emails"?"#f1ecf4":"transparent",color:w==="emails"?"#6C4A79":"#202223",fontWeight:w==="emails"?"600":"500",fontSize:"13px",textAlign:"left",cursor:"pointer",transition:"all 0.2s ease"},children:[e.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"15",height:"15",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"}),e.jsx("polyline",{points:"22,6 12,13 2,6"})]}),"Emails"]}),e.jsxs("button",{type:"button",onClick:()=>{I("receipts"),z("pdf-donation")},style:{display:"flex",alignItems:"center",gap:"10px",width:"100%",padding:"10px 12px",border:"none",borderRadius:"6px",background:w==="receipts"?"#f1ecf4":"transparent",color:w==="receipts"?"#6C4A79":"#202223",fontWeight:w==="receipts"?"600":"500",fontSize:"13px",textAlign:"left",cursor:"pointer",transition:"all 0.2s ease"},children:[e.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"15",height:"15",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}),e.jsx("polyline",{points:"14 2 14 8 20 8"})]}),"Receipts"]})]}),e.jsx("s-text",{color:"subdued",children:"Configure either automated transactional emails or print-ready PDF receipt templates for your store's donation operations."})]}),e.jsx("div",{style:{flex:1},children:e.jsx("s-box",{padding:"large-200",borderWidth:"base",borderRadius:"large-100",background:"subdued",children:e.jsxs("s-stack",{direction:"block",gap:"large-200",children:[w==="emails"&&e.jsxs("s-box",{children:[e.jsxs("div",{style:{marginBottom:"16px"},children:[e.jsx("s-text-field",{label:"Your Contact Email",value:n.contactEmail,error:S.contactEmail,onChange:t=>y("contactEmail",t.target.value)}),e.jsx("div",{style:{marginTop:"4px"},children:e.jsx("s-text",{color:"subdued",children:"Customers who reply to the email will reach you at this address."})})]}),e.jsx("div",{style:{marginBottom:"16px"},children:e.jsx("s-text-field",{label:"Additional/CC Email ID (Optional)",value:n.ccEmail,error:S.ccEmail,onChange:t=>y("ccEmail",t.target.value)})}),e.jsxs("div",{style:{marginBottom:"16px",padding:"12px",background:"#f8f9fa",borderRadius:"8px",border:"1px solid #e1e3e5"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"10px"},children:[e.jsx("input",{type:"checkbox",id:"notifyMerchantOnSubscriptionChange",checked:n.notifyMerchantOnSubscriptionChange,onChange:t=>y("notifyMerchantOnSubscriptionChange",t.target.checked),style:{width:"18px",height:"18px",cursor:"pointer"}}),e.jsx("label",{htmlFor:"notifyMerchantOnSubscriptionChange",style:{fontSize:"14px",fontWeight:"600",cursor:"pointer"},children:"Receive subscription status change notifications"})]}),e.jsx("div",{style:{marginTop:"4px",marginLeft:"28px"},children:e.jsx("s-text",{color:"subdued",size:"small",children:"Get an email whenever a customer pauses, resumes, or cancels their recurring donation."})})]}),e.jsxs("div",{style:{marginBottom:"16px"},children:[e.jsx("div",{style:{marginBottom:"8px"},children:e.jsx("strong",{children:"Email Logo (Optional)"})}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"16px"},children:[n.logoUrl&&e.jsx("div",{style:{padding:"8px",border:"1px solid #e1e3e5",borderRadius:"6px",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",minWidth:"80px"},children:e.jsx("img",{src:n.logoUrl,alt:"Logo Preview",style:{maxHeight:"45px",maxWidth:"150px",objectFit:"contain",display:"block"}})}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"12px"},children:[e.jsx("s-button",{onClick:()=>{var t;return(t=document.getElementById("logo-upload"))==null?void 0:t.click()},children:n.logoUrl?"Change Logo":"Upload Logo"}),e.jsx("input",{id:"logo-upload",type:"file",accept:"image/*",style:{display:"none"},onChange:t=>{var d;const i=(d=t.target.files)==null?void 0:d[0];if(i){if(i.size>1024*1024){s.toast.show("File too large. Please use an image under 1MB.");return}const l=new FileReader;l.onload=x=>{y("logoUrl",x.target.result)},l.readAsDataURL(i)}}}),n.logoUrl&&e.jsx("s-button",{variant:"tertiary",tone:"critical",onClick:()=>y("logoUrl",""),children:"Remove"})]})]})]})]}),e.jsx("s-box",{children:w==="emails"?e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"polaris-tabs",children:e.jsx("div",{className:"polaris-tabs-list",role:"tablist",children:[{id:"receipt",label:"Receipt Template"},{id:"refund",label:"Refund Template"},{id:"cancel",label:"Cancellation Template"},{id:"reminder",label:"Reminder Template"},{id:"recovery",label:"Recovery Template"}].map(t=>e.jsx("button",{type:"button",role:"tab","aria-selected":o===t.id,className:`polaris-tab ${o===t.id?"active":""}`,onClick:()=>z(t.id),children:t.label},t.id))})}),e.jsx("s-stack",{direction:"block",gap:"base",children:o==="refund"&&!b(c,"canSendRefundEmail")||o==="cancel"&&!b(c,"canSendCancelEmail")||o==="reminder"&&!b(c,"canSendReminders")?e.jsx("s-box",{padding:"large-200",background:"subdued",borderRadius:"base",borderWidth:"base",children:e.jsx("s-stack",{direction:"block",gap:"base",children:e.jsxs("div",{style:{textAlign:"center",width:"100%"},children:[e.jsx("s-text",{type:"strong",children:"Plan Upgrade Required"}),e.jsx("s-box",{"padding-block-start":"base",children:e.jsxs("s-text",{color:"subdued",children:["The ",o," email feature is available on the",e.jsxs("strong",{children:[" ",o==="refund"||o==="reminder"?"Advanced":"Pro"]})," plan and above."]})}),e.jsx("s-box",{"padding-block-start":"base",children:e.jsx(le,{to:"/app/pricing",style:{textDecoration:"none"},children:e.jsx("s-button",{variant:"primary",children:"View Pricing Plans"})})})]})})}):e.jsxs(e.Fragment,{children:[e.jsx("s-text-field",{label:"Email Subject Line",disabled:!b(c,"canEditTemplates"),value:o==="receipt"?n.receiptSubject:o==="refund"?n.refundSubject:o==="cancel"?n.cancelSubject:o==="reminder"?n.reminderSubject:n.recoverySubject,onInput:t=>y(o==="receipt"?"receiptSubject":o==="refund"?"refundSubject":o==="cancel"?"cancelSubject":o==="reminder"?"reminderSubject":"recoverySubject",t.target.value)}),e.jsxs("div",{children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"},children:[e.jsx("span",{style:{fontWeight:500},children:"Email Template"}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"10px"},children:[!b(c,"canEditTemplates")&&e.jsx("s-badge",{tone:"caution",children:"View Only"}),b(c,"canEditTemplates")&&!R&&e.jsxs("button",{type:"button",onClick:W,style:{display:"inline-flex",alignItems:"center",gap:"6px",padding:"5px 12px",border:"1px solid #d32f2f",borderRadius:"6px",background:"#fff",color:"#d32f2f",fontSize:"12px",fontWeight:600,cursor:"pointer",transition:"all 0.15s ease"},children:[e.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:e.jsx("path",{d:"M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"})}),"Restore Default"]}),e.jsxs("button",{type:"button",onClick:()=>G(t=>!t),style:{display:"inline-flex",alignItems:"center",gap:"6px",padding:"5px 12px",border:"1px solid #6C4A79",borderRadius:"6px",background:R?"#6C4A79":"#fff",color:R?"#fff":"#6C4A79",fontSize:"12px",fontWeight:600,cursor:"pointer",transition:"all 0.15s ease"},children:[e.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"}),e.jsx("circle",{cx:"12",cy:"12",r:"3"})]}),R?"Back to Edit":"Preview Email"]})]})]}),e.jsxs("div",{style:{padding:"12px",background:"#f4f6f8",borderRadius:"4px",fontSize:"13px",marginBottom:"12px",color:"#5c5f62"},children:[e.jsx("strong",{children:"Available Variables:"})," ",e.jsx("code",{children:"{{first_name}}"}),", ",e.jsx("code",{children:"{{last_name}}"}),", ",e.jsx("code",{children:"{{email}}"}),", ",e.jsx("code",{children:"{{currency}}"}),", ",e.jsx("code",{children:"{{amount}}"}),", ",e.jsx("code",{children:"{{orderNumber}}"}),", ",e.jsx("code",{children:"{{date}}"}),", ",e.jsx("code",{children:"{{donation_name}}"}),", ",e.jsx("code",{children:"{{frequency}}"}),", ",e.jsx("code",{children:"{{nextBillingDate}}"})]}),R?e.jsxs("div",{style:{border:"1px solid #e1e3e5",borderRadius:"8px",overflow:"hidden"},children:[e.jsx("div",{style:{background:"#f8f9fa",borderBottom:"1px solid #e1e3e5",padding:"10px 16px",fontSize:"12px",color:"#6D7175"},children:e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"50px 1fr",gap:"4px",lineHeight:1.8},children:[e.jsx("span",{style:{fontWeight:600},children:"From:"}),e.jsx("span",{children:"Smart Donate <donations@yourstore.com>"}),e.jsx("span",{style:{fontWeight:600},children:"To:"}),e.jsx("span",{children:"jane.doe@example.com"}),e.jsx("span",{style:{fontWeight:600},children:"Subj:"}),e.jsx("span",{style:{color:"#202223",fontWeight:600},children:U(o==="receipt"?n.receiptSubject:o==="refund"?n.refundSubject:o==="cancel"?n.cancelSubject:o==="reminder"?n.reminderSubject:n.recoverySubject).replace(/<[^>]+>/g,"")})]})}),e.jsx("div",{style:{background:"#f3f4f6",padding:"16px"},children:e.jsx("div",{style:{background:"#fff",borderRadius:"8px",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"},children:e.jsx("iframe",{title:"Email body preview",sandbox:"allow-same-origin",srcDoc:`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#333;line-height:1.6}img{max-width:100%;height:auto}</style></head><body>${Z()}</body></html>`,style:{width:"100%",minHeight:"320px",border:"none",display:"block",borderRadius:"8px"},onLoad:t=>{var i,d;try{const l=(d=(i=t.currentTarget.contentDocument)==null?void 0:i.body)==null?void 0:d.scrollHeight;l&&(t.currentTarget.style.height=l+40+"px")}catch{}}})})}),e.jsxs("div",{style:{background:"#f8f9fa",borderTop:"1px solid #e1e3e5",padding:"8px 16px",fontSize:"11px",color:"#6D7175",textAlign:"center"},children:["Preview uses sample data: ",e.jsx("strong",{children:"Jane Doe"}),", ",e.jsx("strong",{children:"$25.00"}),", Order ",e.jsx("strong",{children:"#1042"})]})]}):e.jsxs(e.Fragment,{children:[!b(c,"canEditTemplates")&&e.jsx("div",{style:{marginBottom:"12px"},children:e.jsxs("s-banner",{tone:"info",children:[e.jsx("div",{slot:"title",children:"Custom Templates Locked"}),e.jsxs("p",{children:["Upgrade to the ",e.jsx("strong",{children:"Pro"})," plan to customize your email templates with dynamic variables."]})]})}),e.jsx(H,{disabled:!b(c,"canEditTemplates"),value:o==="receipt"?n.receiptBody:o==="refund"?n.refundBody:o==="cancel"?n.cancelBody:o==="reminder"?n.reminderBody:n.recoveryBody,onChange:t=>y(o==="receipt"?"receiptBody":o==="refund"?"refundBody":o==="cancel"?"cancelBody":o==="reminder"?"reminderBody":"recoveryBody",t)})]})]})]})})]}):e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"polaris-tabs",children:e.jsx("div",{className:"polaris-tabs-list",role:"tablist",children:[{id:"pdf-donation",label:"Donation Receipt"},{id:"pdf-cancel",label:"Cancellation Receipt"}].map(t=>e.jsx("button",{type:"button",role:"tab","aria-selected":o===t.id,className:`polaris-tab ${o===t.id?"active":""}`,onClick:()=>z(t.id),children:t.label},t.id))})}),e.jsx("s-stack",{direction:"block",gap:"base",children:e.jsxs("div",{style:{padding:"4px 0"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"},children:[e.jsx("span",{style:{fontWeight:500},children:o==="pdf-donation"?"Donation Receipt Template":"Cancellation Receipt Template"}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"10px"},children:[!b(c,"canEditTemplates")&&e.jsx("s-badge",{tone:"caution",children:"View Only"}),b(c,"canEditTemplates")&&!_&&e.jsxs("button",{type:"button",onClick:W,style:{display:"inline-flex",alignItems:"center",gap:"6px",padding:"5px 12px",border:"1px solid #d32f2f",borderRadius:"6px",background:"#fff",color:"#d32f2f",fontSize:"12px",fontWeight:600,cursor:"pointer",transition:"all 0.15s ease"},children:[e.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:e.jsx("path",{d:"M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"})}),"Restore Default"]}),e.jsxs("button",{type:"button",onClick:()=>V(t=>!t),style:{display:"inline-flex",alignItems:"center",gap:"6px",padding:"5px 12px",border:"1px solid #6C4A79",borderRadius:"6px",background:_?"#6C4A79":"#fff",color:_?"#fff":"#6C4A79",fontSize:"12px",fontWeight:600,cursor:"pointer",transition:"all 0.15s ease"},children:[e.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"}),e.jsx("circle",{cx:"12",cy:"12",r:"3"})]}),_?"Back to Edit":"Preview HTML"]})]})]}),e.jsxs("div",{style:{marginBottom:"16px",padding:"12px",background:o==="pdf-donation"?"#f8f0fc":"#fee2e2",borderRadius:"8px",border:o==="pdf-donation"?"1px solid #e1d5eb":"1px solid #fecaca",fontSize:"13px",color:o==="pdf-donation"?"#5c5f62":"#991b1b"},children:[e.jsx("strong",{children:"Customize Receipt Template"}),e.jsxs("div",{style:{marginTop:"6px"},children:["Use variables: ",e.jsx("code",{children:"{{first_name}}"}),", ",e.jsx("code",{children:"{{customer_name}}"}),", ",e.jsx("code",{children:"{{customer_email}}"}),", ",e.jsx("code",{children:"{{amount}}"}),", ",e.jsx("code",{children:"{{donation_type}}"}),", ",e.jsx("code",{children:"{{shop_name}}"}),", ",e.jsx("code",{children:"{{date}}"}),", ",e.jsx("code",{children:"{{order_number}}"}),", ",e.jsx("code",{children:"{{receipt_number}}"}),o==="pdf-cancel"&&e.jsxs(e.Fragment,{children:[", ",e.jsx("code",{children:"{{cancel_date}}"}),", ",e.jsx("code",{children:"{{original_receipt_number}}"})]})]})]}),_?e.jsxs("div",{style:{border:"1px solid #e1e3e5",borderRadius:"8px",overflow:"hidden",background:"#f3f4f6",padding:"16px"},children:[e.jsx("div",{style:{background:"#fff",borderRadius:"8px",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"},children:e.jsx("iframe",{title:"Receipt HTML preview",sandbox:"allow-same-origin",srcDoc:J(),style:{width:"100%",minHeight:"450px",border:"none",display:"block",borderRadius:"8px"},onLoad:t=>{var i,d;try{const l=(d=(i=t.currentTarget.contentDocument)==null?void 0:i.body)==null?void 0:d.scrollHeight;l&&(t.currentTarget.style.height=l+40+"px")}catch{}}})}),e.jsxs("div",{style:{background:"#f8f9fa",borderTop:"1px solid #e1e3e5",padding:"8px 16px",marginTop:"12px",borderRadius:"4px",fontSize:"11px",color:"#6D7175",textAlign:"center"},children:["Preview uses sample data: ",e.jsx("strong",{children:"Jane Doe"}),", ",e.jsx("strong",{children:"$25.00"}),", Order ",e.jsx("strong",{children:"#1042"})]})]}):e.jsx(H,{disabled:!b(c,"canEditTemplates"),value:o==="pdf-donation"?n.receiptAcknowledgementText:n.receiptCancelAcknowledgementText,onChange:t=>y(o==="pdf-donation"?"receiptAcknowledgementText":"receiptCancelAcknowledgementText",t)}),e.jsxs("div",{style:{marginTop:"20px",marginBottom:"20px"},children:[e.jsx("label",{style:{display:"block",fontWeight:600,fontSize:"13px",marginBottom:"6px"},children:"Custom Footer Note"}),e.jsx("div",{style:{fontSize:"12px",color:"#6D7175",marginBottom:"8px"},children:"Replaces the generated date/info line at the bottom of the PDF. Shared across all receipt types."}),e.jsx("input",{type:"text",value:n.receiptFooterNote,onChange:t=>y("receiptFooterNote",t.target.value),placeholder:"Generated by {{shop_name}} on {{date}}",style:{width:"100%",padding:"8px 12px",border:"1px solid #c9cccf",borderRadius:"6px",fontSize:"13px",boxSizing:"border-box",fontFamily:"inherit"}})]}),e.jsxs("div",{style:{marginTop:"24px",paddingTop:"16px",borderTop:"1px solid #e1e3e5",display:"flex",gap:"12px",alignItems:"center"},children:[e.jsxs("button",{type:"button",disabled:C!==null||D!==null,onClick:()=>K(o==="pdf-donation"?"donation":"cancel"),style:{display:"inline-flex",alignItems:"center",gap:"8px",padding:"10px 20px",background:o==="pdf-donation"?"#6C4A79":"#b91c1c",color:"#fff",border:"none",borderRadius:"8px",fontWeight:600,fontSize:"13px",cursor:C!==null||D!==null?"wait":"pointer",opacity:C!==null||D!==null?.7:1},children:[e.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"15",height:"15",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"}),e.jsx("circle",{cx:"12",cy:"12",r:"3"})]}),C===(o==="pdf-donation"?"donation":"cancel")?"Opening Preview...":"Preview PDF Receipt"]}),e.jsxs("button",{type:"button",disabled:C!==null||D!==null,onClick:()=>Q(o==="pdf-donation"?"donation":"cancel"),style:{display:"inline-flex",alignItems:"center",gap:"8px",padding:"9px 20px",background:"#fff",color:o==="pdf-donation"?"#6C4A79":"#b91c1c",border:o==="pdf-donation"?"1px solid #6C4A79":"1px solid #b91c1c",borderRadius:"8px",fontWeight:600,fontSize:"13px",cursor:C!==null||D!==null?"wait":"pointer",opacity:C!==null||D!==null?.7:1},children:[e.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"15",height:"15",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),e.jsx("polyline",{points:"7 10 12 15 17 10"}),e.jsx("line",{x1:"12",y1:"15",x2:"12",y2:"3"})]}),D===(o==="pdf-donation"?"donation":"cancel")?"Downloading...":"Download PDF"]})]})]})})]})})]})})})]}),e.jsx("style",{children:`
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
            `})]})});export{ye as default};
