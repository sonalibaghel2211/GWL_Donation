var _a;
import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter, UNSAFE_withComponentProps, Meta, Links, Outlet, ScrollRestoration, Scripts, data, useLoaderData, useActionData, Form, redirect, Link, UNSAFE_withErrorBoundaryProps, useRouteError, useNavigate, useFetcher, useSubmit, useSearchParams, useNavigation, useLocation } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import "dotenv/config";
import { shopifyApp, BillingInterval, DeliveryMethod, AppDistribution, LoginErrorType, boundary } from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { PrismaClient } from "@prisma/client";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as AppProvider$1, useIndexResourceState, IndexTable, Text, InlineStack, Button, Page, Layout, Card, EmptyState, Badge, BlockStack } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Chart, registerables } from "chart.js";
if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
}
const prisma = global.prismaGlobal ?? new PrismaClient();
const MONTHLY_PLAN_BASIC = "Galaxy Easy Donations - Basic Plan";
const MONTHLY_PLAN_ADVANCED = "Galaxy Easy Donations - Advanced Plan";
const MONTHLY_PLAN_PRO = "Galaxy Easy Donations - Pro Plan";
console.log("Initializing Shopify App with API Key:", process.env.SHOPIFY_API_KEY);
console.log("App URL:", process.env.SHOPIFY_APP_URL);
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: "2026-04",
  scopes: (_a = process.env.SCOPES) == null ? void 0 : _a.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  hostScheme: "https",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  isEmbeddedApp: true,
  isOnlineTokens: false,
  // Use offline tokens for better stability in billing redirects
  webhooks: {
    ORDERS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders/create"
    },
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app/uninstalled"
    },
    REFUNDS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/refunds/create"
    },
    ORDERS_CANCELLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders/cancelled"
    },
    APP_SUBSCRIPTIONS_UPDATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app_subscriptions/update"
    }
  },
  billing: {
    [MONTHLY_PLAN_BASIC]: {
      lineItems: [
        {
          amount: 5,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days
        }
      ]
    },
    [MONTHLY_PLAN_ADVANCED]: {
      lineItems: [
        {
          amount: 10,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days
        }
      ]
    },
    [MONTHLY_PLAN_PRO]: {
      lineItems: [
        {
          amount: 15,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days
        }
      ]
    }
  },
  future: {
    expiringOfflineAccessTokens: true
  },
  hooks: {
    afterAuth: async ({ session }) => {
      console.log(`[Shopify Auth] AfterAuth hook triggered for ${session.shop}`);
      try {
        await shopify.registerWebhooks({ session });
        console.log(`[Shopify Auth] Webhooks registered successfully for ${session.shop}`);
      } catch (e) {
        console.error(`[Shopify Auth] Failed to register webhooks for ${session.shop}:`, e);
      }
    }
  },
  ...process.env.SHOP_CUSTOM_DOMAIN ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] } : {}
});
const apiVersion = "2026-04";
const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
const authenticate = shopify.authenticate;
const unauthenticated = shopify.unauthenticated;
const login = shopify.login;
const registerWebhooks = shopify.registerWebhooks;
const sessionStorage = shopify.sessionStorage;
const shopify_server = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  MONTHLY_PLAN_ADVANCED,
  MONTHLY_PLAN_BASIC,
  MONTHLY_PLAN_PRO,
  addDocumentResponseHeaders,
  apiVersion,
  authenticate,
  default: shopify,
  login,
  registerWebhooks,
  sessionStorage,
  unauthenticated
}, Symbol.toStringTag, { value: "Module" }));
const streamTimeout = 5e3;
async function handleRequest(request, responseStatusCode, responseHeaders, reactRouterContext) {
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";
  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(
        ServerRouter,
        {
          context: reactRouterContext,
          url: request.url
        }
      ),
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
        }
      }
    );
    setTimeout(abort, streamTimeout + 1e3);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest,
  streamTimeout
}, Symbol.toStringTag, { value: "Module" }));
const root = UNSAFE_withComponentProps(function App() {
  useEffect(() => {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://embed.tawk.to/69e6113d6ef56e1c36f54727/default";
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    document.body.appendChild(script);
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);
  return /* @__PURE__ */ jsxs("html", {
    lang: "en",
    children: [/* @__PURE__ */ jsxs("head", {
      children: [/* @__PURE__ */ jsx("meta", {
        charSet: "utf-8"
      }), /* @__PURE__ */ jsx("meta", {
        name: "viewport",
        content: "width=device-width,initial-scale=1"
      }), /* @__PURE__ */ jsx("link", {
        rel: "preconnect",
        href: "https://cdn.shopify.com/"
      }), /* @__PURE__ */ jsx("link", {
        rel: "stylesheet",
        href: "https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
      }), /* @__PURE__ */ jsx("script", {
        src: "https://cdn.shopify.com/shopifycloud/polaris.js"
      }), /* @__PURE__ */ jsx(Meta, {}), /* @__PURE__ */ jsx(Links, {})]
    }), /* @__PURE__ */ jsxs("body", {
      children: [/* @__PURE__ */ jsx(Outlet, {}), /* @__PURE__ */ jsx(ScrollRestoration, {}), /* @__PURE__ */ jsx(Scripts, {})]
    })]
  });
});
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: root
}, Symbol.toStringTag, { value: "Module" }));
const action$n = async ({
  request
}) => {
  var _a2;
  const {
    shop,
    topic,
    payload
  } = await authenticate.webhook(request);
  if (topic !== "SUBSCRIPTION_CONTRACTS_CREATE") {
    return new Response(null, {
      status: 400
    });
  }
  try {
    const contract = payload;
    const contractId = contract.admin_graphql_api_id || `gid://shopify/SubscriptionContract/${contract.id}`;
    const originOrderId = ((_a2 = contract.origin_order) == null ? void 0 : _a2.admin_graphql_api_id) || (contract.origin_order_id ? `gid://shopify/Order/${contract.origin_order_id}` : null);
    if (originOrderId) {
      await prisma.recurringDonationLog.updateMany({
        where: {
          shop,
          orderId: originOrderId
        },
        data: {
          subscriptionContractId: contractId
        }
      });
      console.log(`[SubscriptionContract] Linked contract ${contractId} to order ${originOrderId}`);
    } else {
      console.log(`[SubscriptionContract] Created contract ${contractId} — no origin order to link`);
    }
  } catch (err) {
    console.error("[SubscriptionContract] Create webhook error:", err);
  }
  return new Response("OK", {
    status: 200
  });
};
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$n
}, Symbol.toStringTag, { value: "Module" }));
function mapStatus(shopifyStatus) {
  switch (shopifyStatus == null ? void 0 : shopifyStatus.toUpperCase()) {
    case "ACTIVE":
      return "active";
    case "PAUSED":
      return "paused";
    case "CANCELLED":
    case "FAILED":
    case "EXPIRED":
      return "cancelled";
    default:
      return "active";
  }
}
const action$m = async ({
  request
}) => {
  var _a2, _b;
  const {
    shop,
    topic,
    payload
  } = await authenticate.webhook(request);
  if (topic !== "SUBSCRIPTION_CONTRACTS_UPDATE") {
    return new Response(null, {
      status: 400
    });
  }
  try {
    const contract = payload;
    const contractId = contract.admin_graphql_api_id || `gid://shopify/SubscriptionContract/${contract.id}`;
    const newStatus = mapStatus(contract.status);
    const originOrderId = (_a2 = contract.originOrder) == null ? void 0 : _a2.id;
    const originOrderNumber = (_b = contract.originOrder) == null ? void 0 : _b.name;
    await prisma.posDonationLog.updateMany({
      where: {
        shop,
        OR: [{
          orderId: originOrderId || void 0
        }, {
          orderNumber: originOrderNumber || void 0
        }]
      },
      data: {
        status: newStatus
      }
    });
    await prisma.recurringDonationLog.updateMany({
      where: {
        shop,
        OR: [{
          subscriptionContractId: contractId
        }, {
          orderId: originOrderId || void 0
        }, {
          orderNumber: originOrderNumber || void 0
        }]
      },
      data: {
        status: newStatus
      }
    });
    await prisma.subscription.updateMany({
      where: {
        shop,
        orderId: originOrderNumber
      },
      data: {
        status: newStatus
      }
    });
    console.log(`[SubscriptionContract] Updated logs for contract ${contractId} → status: ${newStatus}`);
  } catch (err) {
    console.error("[SubscriptionContract] Update webhook error:", err);
  }
  return new Response("OK", {
    status: 200
  });
};
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$m
}, Symbol.toStringTag, { value: "Module" }));
const action$l = async ({
  request
}) => {
  const {
    shop,
    payload,
    topic
  } = await authenticate.webhook(request);
  if (topic !== "APP_SUBSCRIPTIONS_UPDATE") {
    return new Response(null, {
      status: 400
    });
  }
  const subscription = payload.app_subscription;
  const status = subscription.status;
  const gid = subscription.admin_graphql_api_id;
  console.log(`[Webhook] APP_SUBSCRIPTIONS_UPDATE for ${shop}: Status=${status}, GID=${gid}`);
  try {
    const existingRec = await prisma.planSubscription.findFirst({
      where: {
        shop,
        subscriptionId: gid
      }
    });
    const planName = subscription.name.toLowerCase().includes("pro") ? "pro" : subscription.name.toLowerCase().includes("advanced") ? "advanced" : "basic";
    if (existingRec) {
      if (status === "ACTIVE") {
        const wasPending = existingRec.status === "pending" || existingRec.plan !== planName;
        await prisma.planSubscription.update({
          where: {
            id: existingRec.id
          },
          data: {
            status: "active",
            plan: planName,
            // Finalize the plan
            pendingPlan: null
          }
        });
        if (wasPending) {
          const settings = await prisma.emailSettings.findUnique({
            where: {
              shop
            }
          });
          const appSettings = await prisma.appSettings.findUnique({
            where: {
              shop
            }
          });
          const targetEmail = (settings == null ? void 0 : settings.contactEmail) || (appSettings == null ? void 0 : appSettings.contactEmail);
          if (targetEmail) {
            const {
              sendPlanChangeConfirmation: sendPlanChangeConfirmation2
            } = await Promise.resolve().then(() => sendgrid_server);
            await sendPlanChangeConfirmation2({
              shop,
              planName,
              email: targetEmail
            });
          }
        }
      } else {
        await prisma.planSubscription.update({
          where: {
            id: existingRec.id
          },
          data: {
            status: "inactive",
            plan: status === "CANCELLED" || status === "EXPIRED" ? "basic" : existingRec.plan
          }
        });
      }
    } else if (status === "ACTIVE") {
      await prisma.planSubscription.upsert({
        where: {
          shop
        },
        update: {
          plan: planName,
          subscriptionId: gid,
          status: "active",
          pendingPlan: null
        },
        create: {
          shop,
          plan: planName,
          subscriptionId: gid,
          status: "active"
        }
      });
      const settings = await prisma.emailSettings.findUnique({
        where: {
          shop
        }
      });
      const appSettings = await prisma.appSettings.findUnique({
        where: {
          shop
        }
      });
      const targetEmail = (settings == null ? void 0 : settings.contactEmail) || (appSettings == null ? void 0 : appSettings.contactEmail);
      if (targetEmail) {
        const {
          sendPlanChangeConfirmation: sendPlanChangeConfirmation2
        } = await Promise.resolve().then(() => sendgrid_server);
        await sendPlanChangeConfirmation2({
          shop,
          planName,
          email: targetEmail
        });
      }
    }
  } catch (err) {
    console.error("Error updating subscription via webhook:", err);
  }
  return new Response("OK", {
    status: 200
  });
};
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$l
}, Symbol.toStringTag, { value: "Module" }));
async function sendDonationReceipt({
  email,
  name,
  amount,
  orderNumber,
  type = "receipt",
  shop,
  frequency,
  nextBillingDate,
  donationName,
  shippingAddress,
  billingAddress,
  manageUrl,
  productImage,
  productTitle,
  paymentMethod
}) {
  var _a2;
  const rawApiKey = process.env.SENDGRID_API_KEY || "";
  const apiKey = rawApiKey.split("SHOPIFY")[0].trim();
  const rawFromEmail = process.env.SENDGRID_FROM_EMAIL || "";
  let verifiedFromEmail = rawFromEmail.split("SHOPIFY")[0].trim();
  if (!verifiedFromEmail) verifiedFromEmail = "donations@yourstore.com";
  if (!apiKey) {
    console.error("[sendDonationReceipt] SENDGRID_API_KEY is missing from environment variables");
    return { success: false, error: "Missing API Key" };
  }
  sgMail.setApiKey(apiKey);
  const settings = await prisma.emailSettings.findUnique({ where: { shop } });
  let replyToEmail = verifiedFromEmail;
  let ccEmail = "";
  let subjectTemplate = `Thank you for your donation (Order ${orderNumber})`;
  let bodyTemplate = `We've received your generous donation of <strong>${amount}</strong> along with your order ${orderNumber}.`;
  if (settings) {
    replyToEmail = settings.contactEmail || replyToEmail;
    ccEmail = settings.ccEmail || "";
    if (type === "refund") {
      subjectTemplate = settings.refundSubject;
      bodyTemplate = settings.refundBody;
    } else if (type === "cancellation") {
      subjectTemplate = settings.cancelSubject;
      bodyTemplate = settings.cancelBody;
    } else if (type === "pause") {
      subjectTemplate = settings.pauseSubject || "Subscription Paused";
      bodyTemplate = settings.pauseBody || "Your subscription has been paused.";
    } else if (type === "resume") {
      subjectTemplate = settings.resumeSubject || "Subscription Resumed";
      bodyTemplate = settings.resumeBody || "Your subscription has been resumed.";
    } else {
      subjectTemplate = settings.receiptSubject;
      bodyTemplate = settings.receiptBody;
    }
  }
  const replaceVariables = (str) => {
    const smartReplace = (html, variable, value) => {
      const regex = new RegExp("\\{\\{(\\s*<[^>]*>\\s*)*" + variable + "(\\s*<[^>]*>\\s*)*\\}\\}", "gi");
      return html.replace(regex, value);
    };
    let res = str;
    res = smartReplace(res, "first_name", name.split(" ")[0] || "");
    res = smartReplace(res, "last_name", name.split(" ").slice(1).join(" ") || "");
    res = smartReplace(res, "email", email);
    res = smartReplace(res, "currency", "$");
    res = smartReplace(res, "amount", amount);
    res = smartReplace(res, "price", amount);
    res = smartReplace(res, "donation_name", donationName || productTitle || "Charity Donation");
    res = smartReplace(res, "orderNumber", orderNumber);
    res = smartReplace(res, "date", (/* @__PURE__ */ new Date()).toLocaleDateString());
    res = smartReplace(res, "frequency", frequency || "One-time");
    res = smartReplace(res, "nextBillingDate", nextBillingDate || "N/A");
    res = smartReplace(res, "paymentMethod", paymentMethod || "Ending in card");
    return res;
  };
  const finalSubject = replaceVariables(subjectTemplate);
  const finalBody = replaceVariables(bodyTemplate);
  let title = "Donation Receipt";
  if (type === "refund") title = "Donation Refunded";
  else if (type === "cancellation") title = "Donation Cancelled";
  else if (type === "pause") title = "Subscription Paused";
  else if (type === "resume") title = "Subscription Resumed";
  const isRecurring = frequency === "Monthly" || frequency === "Weekly";
  let htmlContent = "";
  if (isRecurring && (type === "receipt" || type === "pause" || type === "resume" || type === "cancellation")) {
    const statusHeader = type === "pause" ? "Subscription Paused" : type === "resume" ? "Subscription Resumed" : type === "cancellation" ? "Subscription Cancelled" : "Welcome Aboard";
    const statusSubtext = type === "pause" ? "Your subscription has been paused. You can resume it at any time from your account." : type === "resume" ? "Your subscription has been resumed. Thank you for your continued support!" : type === "cancellation" ? "Your subscription has been cancelled. We're sorry to see you go." : "Thank you for your subscription purchase!";
    htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; background-color: #fff; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
      <div style="margin-bottom: 24px;">
        ${(settings == null ? void 0 : settings.logoUrl) && settings.logoUrl.trim() !== "" && settings.logoUrl !== "null" ? `<img src="${settings.logoUrl}" alt="Logo" style="max-height: 50px; display: block;" />` : ""}
      </div>

      <div style="text-align: left; margin-bottom: 24px;">
        <h1 style="color: #202223; font-size: 24px; font-weight: 700; margin: 0;">${statusHeader}</h1>
        <p style="color: #6D7175; font-size: 16px; margin-top: 8px;">Hello ${name.split(" ")[0] || "there"},</p>
        <p style="font-size: 16px; margin-top: 4px;">${statusSubtext}</p>
        <p style="font-size: 16px; margin-top: 4px;">Please view the details of your subscription below.</p>
        <p style="font-size: 16px; margin-top: 20px; margin-bottom: 0;">Thanks!<br /><strong>Your Store Team</strong></p>
      </div>

      <div style="background-color: #f9f9f9; border-radius: 12px; padding: 20px; margin-bottom: 32px; display: flex; align-items: center; gap: 16px;">
        ${productImage ? `<img src="${productImage}" alt="${productTitle || "Donation"}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid #eee;" />` : `<div style="width: 80px; height: 80px; background: #eee; border-radius: 8px;"></div>`}
        <div style="flex: 1; padding-left: 16px;">
          <div style="font-weight: 700; font-size: 16px; color: #202223;">${productTitle || donationName || "Charity Donation"}</div>
          <div style="font-size: 14px; color: #6D7175; margin-top: 4px;">Selling Plan: ${frequency} Donation</div>
          <div style="font-size: 14px; color: #6D7175;">Quantity: 1</div>
        </div>
        <div style="font-weight: 700; font-size: 16px; color: #202223;">${amount}</div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; border-top: 1px solid #eee; padding-top: 24px; margin-bottom: 24px;">
        <div style="padding-right: 12px;">
          <h3 style="font-size: 14px; text-transform: uppercase; color: #6D7175; margin-bottom: 12px; letter-spacing: 1px;">Shipping Address</h3>
          <div style="font-size: 14px; color: #202223; white-space: pre-line;">${shippingAddress || "N/A"}</div>
        </div>
        <div style="padding-right: 12px;">
          <h3 style="font-size: 14px; text-transform: uppercase; color: #6D7175; margin-bottom: 12px; letter-spacing: 1px;">Billing Address</h3>
          <div style="font-size: 14px; color: #202223; white-space: pre-line;">${billingAddress || "N/A"}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; border-top: 1px solid #eee; padding-top: 24px;">
        <div>
          <h3 style="font-size: 14px; text-transform: uppercase; color: #6D7175; margin-bottom: 12px; letter-spacing: 1px;">Next Order Date</h3>
          <div style="font-size: 15px; font-weight: 600; color: #202223;">${nextBillingDate || "Calculated soon"}</div>
        </div>
        <div>
          <h3 style="font-size: 14px; text-transform: uppercase; color: #6D7175; margin-bottom: 12px; letter-spacing: 1px;">Payment Method</h3>
          <div style="font-size: 15px; font-weight: 600; color: #202223;">${paymentMethod || "Ending in card"}</div>
        </div>
      </div>
    </div>
    `;
  } else {
    const recurringBadge = frequency && frequency !== "One-time" ? `<div style="margin-bottom: 12px; padding: 8px 14px; background: #e8f5e9; border-radius: 6px; display: inline-block; font-size: 13px; color: #2e7d32;">
          <strong>${frequency} Recurring Donation</strong>
          ${nextBillingDate ? ` &mdash; next charge on <strong>${nextBillingDate}</strong>` : ""}
         </div>` : "";
    htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
      ${(settings == null ? void 0 : settings.logoUrl) ? `<div style="margin-bottom: 24px;"><img src="${settings.logoUrl}" alt="Logo" style="max-height: 50px; display: block;" /></div>` : ""}
      <h2 style="color: #008060;">${title}</h2>
      ${recurringBadge}
      <div>${finalBody}</div>
      <br />
      <p style="border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666;">
         If you have any questions or concerns, please reply to this email and we will get back to you as soon as we can.
      </p>
    </div>
    `;
  }
  const msg = {
    to: email,
    from: verifiedFromEmail,
    replyTo: replyToEmail,
    subject: finalSubject,
    html: htmlContent
  };
  if (ccEmail) msg.cc = ccEmail;
  console.log(`[sendDonationReceipt] Final payload From: ${verifiedFromEmail}, To: ${email}, Subject: ${finalSubject}`);
  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error("SendGrid rejected payload or failed:", error);
    if ((_a2 = error.response) == null ? void 0 : _a2.body) {
      console.log("SendGrid Error Body:", JSON.stringify(error.response.body, null, 2));
    }
    return { success: false, error: String(error) };
  }
}
async function sendPlanChangeConfirmation({
  shop,
  planName,
  email
}) {
  const rawApiKey = process.env.SENDGRID_API_KEY || "";
  const apiKey = rawApiKey.split("SHOPIFY")[0].trim();
  const rawFromEmail = process.env.SENDGRID_FROM_EMAIL || "";
  let verifiedFromEmail = rawFromEmail.split("SHOPIFY")[0].trim() || "donations@yourstore.com";
  if (!apiKey) {
    console.error("SENDGRID_API_KEY is missing");
    return { success: false };
  }
  sgMail.setApiKey(apiKey);
  const htmlContent = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; background-color: #fff; padding: 24px; border: 1px solid #eee; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="font-size: 32px; margin-bottom: 8px;">🚀</div>
      <h1 style="color: #202223; font-size: 24px; font-weight: 700; margin: 0;">Plan Successfully Updated!</h1>
    </div>

    <div style="margin-bottom: 24px;">
      <p style="font-size: 16px; color: #444;">Hello,</p>
      <p style="font-size: 16px; color: #444;">Your store <strong>${shop}</strong> has been successfully switched to the <strong>${planName.charAt(0).toUpperCase() + planName.slice(1)} Plan</strong>.</p>
      <p style="font-size: 16px; color: #444;">Your new features are now active and ready to use.</p>
    </div>

    <div style="background-color: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #6c4a79;">
      <div style="font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">New Plan</div>
      <div style="font-size: 18px; font-weight: 700; color: #202223;">${planName.charAt(0).toUpperCase() + planName.slice(1)}</div>
    </div>

    <p style="font-size: 15px; color: #6D7175;">If you didn't authorize this change, please contact our support immediately.</p>

    <div style="border-top: 1px solid #eee; margin-top: 32px; padding-top: 24px; text-align: center; font-size: 14px; color: #999;">
      &copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Galaxy Easy Donations. All rights reserved.
    </div>
  </div>
  `;
  const msg = {
    to: email,
    from: verifiedFromEmail,
    subject: `Your Galaxy Easy Donations plan has been updated to ${planName.charAt(0).toUpperCase() + planName.slice(1)}`,
    html: htmlContent
  };
  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error("Failed to send plan change email:", error);
    return { success: false };
  }
}
const sendgrid_server = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  sendDonationReceipt,
  sendPlanChangeConfirmation
}, Symbol.toStringTag, { value: "Module" }));
const action$k = async ({
  request
}) => {
  var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
  const {
    admin
  } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "";
  if (!admin) {
    return new Response(JSON.stringify({
      success: false,
      error: "Unauthorized"
    }), {
      status: 401,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
  try {
    const payload = await request.json();
    const {
      action: actionType,
      contractId,
      newFrequency
    } = payload;
    let mutation = "";
    let mutationName = "";
    const commonFields = `
            contract {
                id
                status
                nextBillingDate
                currencyCode
                customer {
                    firstName
                    lastName
                    email
                }
                originOrder {
                    id
                    name
                }
                lines(first: 5) {
                    edges {
                        node {
                            id
                            title
                            quantity
                            currentPrice {
                                amount
                            }
                        }
                    }
                }
            }
            userErrors {
                field
                message
            }
        `;
    if (actionType === "CANCEL") {
      mutation = `mutation { subscriptionContractCancel(subscriptionContractId: "${contractId}") { ${commonFields} } }`;
      mutationName = "subscriptionContractCancel";
    } else if (actionType === "PAUSE") {
      mutation = `mutation { subscriptionContractPause(subscriptionContractId: "${contractId}") { ${commonFields} } }`;
      mutationName = "subscriptionContractPause";
    } else if (actionType === "RESUME") {
      mutation = `mutation { subscriptionContractActivate(subscriptionContractId: "${contractId}") { ${commonFields} } }`;
      mutationName = "subscriptionContractActivate";
    } else if (actionType === "SWITCH") {
      const config = await prisma.recurringDonationConfig.findUnique({
        where: {
          shop
        }
      });
      if (!config) throw new Error("Shop configuration not found");
      const newPlanId = newFrequency === "monthly" ? config.monthlyPlanId : config.weeklyPlanId;
      if (!newPlanId) throw new Error(`Selling plan for ${newFrequency} not configured`);
      const getLineRes = await admin.graphql(`query { subscriptionContract(id: "${contractId}") { lines(first: 1) { edges { node { id } } } } }`);
      const lineData = await getLineRes.json();
      const lineId = (_f = (_e = (_d = (_c = (_b = (_a2 = lineData.data) == null ? void 0 : _a2.subscriptionContract) == null ? void 0 : _b.lines) == null ? void 0 : _c.edges) == null ? void 0 : _d[0]) == null ? void 0 : _e.node) == null ? void 0 : _f.id;
      if (!lineId) throw new Error("Subscription line not found");
      mutation = `
                mutation {
                    subscriptionContractUpdate(
                        subscriptionContractId: "${contractId}"
                        input: {
                            lines: {
                                update: {
                                    id: "${lineId}"
                                    sellingPlanId: "${newPlanId}"
                                }
                            }
                        }
                    ) {
                        ${commonFields}
                    }
                }
            `;
      mutationName = "subscriptionContractUpdate";
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid action"
      }), {
        status: 400
      });
    }
    const response = await admin.graphql(mutation);
    const json = await response.json();
    const result = (_g = json.data) == null ? void 0 : _g[mutationName];
    if (((_h = result == null ? void 0 : result.userErrors) == null ? void 0 : _h.length) > 0) {
      return new Response(JSON.stringify({
        success: false,
        error: result.userErrors[0].message
      }), {
        status: 400
      });
    }
    const contract = result == null ? void 0 : result.contract;
    if (contract) {
      const newStatus = contract.status.toLowerCase();
      const orderId = (_i = contract.originOrder) == null ? void 0 : _i.id;
      const orderNumber = (_j = contract.originOrder) == null ? void 0 : _j.name;
      await prisma.recurringDonationLog.updateMany({
        where: {
          subscriptionContractId: contractId
        },
        data: {
          status: newStatus
        }
      });
      if (orderId || orderNumber) {
        await prisma.recurringDonationLog.updateMany({
          where: {
            OR: [{
              orderId: orderId || void 0
            }, {
              orderNumber: orderNumber || void 0
            }]
          },
          data: {
            status: newStatus
          }
        });
      }
      if (orderId || orderNumber) {
        await prisma.posDonationLog.updateMany({
          where: {
            OR: [{
              orderId: orderId || void 0
            }, {
              orderNumber: orderNumber || void 0
            }]
          },
          data: {
            status: newStatus
          }
        });
      }
      await prisma.subscription.updateMany({
        where: {
          orderId: orderNumber
        },
        data: {
          status: newStatus
        }
      });
      if ((_k = contract.customer) == null ? void 0 : _k.email) {
        const totalAmount = contract.lines.edges.reduce((sum, edge) => sum + parseFloat(edge.node.currentPrice.amount) * edge.node.quantity, 0).toFixed(2);
        let emailType = "receipt";
        if (actionType === "CANCEL") emailType = "cancellation";
        else if (actionType === "PAUSE") emailType = "pause";
        else if (actionType === "RESUME") emailType = "resume";
        else if (actionType === "SWITCH") emailType = "resume";
        await sendDonationReceipt({
          email: contract.customer.email,
          name: `${contract.customer.firstName || ""} ${contract.customer.lastName || ""}`.trim(),
          amount: totalAmount,
          orderNumber: ((_l = contract.originOrder) == null ? void 0 : _l.name) || "",
          type: emailType,
          shop: shop || "Your Store",
          nextBillingDate: contract.nextBillingDate ? new Date(contract.nextBillingDate).toLocaleDateString() : "N/A",
          productTitle: ((_n = (_m = contract.lines.edges[0]) == null ? void 0 : _m.node) == null ? void 0 : _n.title) || "Donation"
        });
      }
    }
    return new Response(JSON.stringify({
      success: true
    }));
  } catch (err) {
    console.error("Subscription action error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), {
      status: 500
    });
  }
};
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$k
}, Symbol.toStringTag, { value: "Module" }));
const loader$q = async ({
  request
}) => {
  var _a2, _b, _c, _d, _e, _f, _g;
  const {
    admin
  } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customer_id");
  if (!customerId || !admin) {
    return new Response(JSON.stringify({
      hasSubscription: false
    }), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
  try {
    const response = await admin.graphql(`#graphql
      query getCustomerSubscriptions($customerId: ID!) {
        customer(id: $customerId) {
          subscriptionContracts(first: 1, query: "status:active OR status:paused") {
            edges {
              node {
                id
                status
                lines(first: 1) {
                  edges {
                    node {
                      title
                      sellingPlan {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }`, {
      variables: {
        customerId
      }
    });
    const json = await response.json();
    const contract = (_e = (_d = (_c = (_b = (_a2 = json == null ? void 0 : json.data) == null ? void 0 : _a2.customer) == null ? void 0 : _b.subscriptionContracts) == null ? void 0 : _c.edges) == null ? void 0 : _d[0]) == null ? void 0 : _e.node;
    if (contract) {
      const line = (_f = contract.lines.edges[0]) == null ? void 0 : _f.node;
      const planName = ((_g = line == null ? void 0 : line.sellingPlan) == null ? void 0 : _g.name) || "Donation";
      const frequency = planName.toLowerCase().includes("monthly") ? "monthly" : "weekly";
      return new Response(JSON.stringify({
        hasSubscription: true,
        contractId: contract.id,
        status: contract.status,
        planName,
        frequency
      }), {
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
  } catch (err) {
    console.error("Error fetching subscription status:", err);
  }
  return new Response(JSON.stringify({
    hasSubscription: false
  }), {
    headers: {
      "Content-Type": "application/json"
    }
  });
};
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$q
}, Symbol.toStringTag, { value: "Module" }));
const PLAN_FEATURES = {
  basic: {
    canUsePercentageDonation: false,
    canSendReceiptEmail: true,
    canSendRefundEmail: false,
    canSendCancelEmail: false,
    canEditTemplates: false,
    canUseFilters: false,
    canUseCustomBranding: false
  },
  advanced: {
    canUsePercentageDonation: true,
    canSendReceiptEmail: true,
    canSendRefundEmail: true,
    canSendCancelEmail: false,
    canEditTemplates: false,
    canUseFilters: true,
    canUseCustomBranding: false
  },
  pro: {
    canUsePercentageDonation: true,
    canSendReceiptEmail: true,
    canSendRefundEmail: true,
    canSendCancelEmail: true,
    canEditTemplates: true,
    canUseFilters: true,
    canUseCustomBranding: true
  }
};
function checkFeatureAccess(plan, feature) {
  const planType = plan || "basic";
  const features = PLAN_FEATURES[planType] || PLAN_FEATURES.basic;
  return !!features[feature];
}
const PLAN_DETAILS = {
  basic: {
    name: "Basic",
    price: "$1.99",
    description: "Starter level (minimum usable)"
  },
  advanced: {
    name: "Advanced",
    price: "$4.99",
    description: "For growing merchants"
  },
  pro: {
    name: "Pro",
    price: "$9",
    description: "Full power for your store"
  }
};
const loader$p = async ({
  request
}) => {
  try {
    const {
      session
    } = await authenticate.public.appProxy(request);
    if (!session) {
      return data({
        error: "Unauthorized"
      }, {
        status: 401
      });
    }
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    if (!shop) {
      return data({
        error: "Shop parameter required"
      }, {
        status: 400
      });
    }
    const settings = await prisma.posDonationSettings.findUnique({
      where: {
        shop
      }
    });
    const subscription = await prisma.planSubscription.findUnique({
      where: {
        shop
      }
    });
    const plan = (subscription == null ? void 0 : subscription.plan) || "basic";
    let finalSettings = settings ? {
      ...settings
    } : {
      enabled: false,
      donationType: "fixed",
      donationBasis: "order",
      donationValue: 5,
      minimumValue: 0,
      donationMessage: "{donationAmount} of {totalOrderValue} will be donated to charity",
      tooltipMessage: "A portion of your purchase supports charity",
      orderTag: "galaxy_pos_donation"
    };
    if (finalSettings.donationType === "percentage" && !checkFeatureAccess(plan, "canUsePercentageDonation")) {
      finalSettings.donationType = "fixed";
      console.log(`[Proxy] Forcing donationType to fixed for ${shop} (Basic Plan)`);
    }
    return finalSettings;
  } catch (error) {
    console.error("Error fetching POS donation settings:", error);
    return data({
      error: "Internal server error"
    }, {
      status: 500
    });
  }
};
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$p
}, Symbol.toStringTag, { value: "Module" }));
const action$j = async ({
  request
}) => {
  const {
    payload,
    session,
    topic,
    shop
  } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  const current = payload.current;
  if (session) {
    await prisma.session.update({
      where: {
        id: session.id
      },
      data: {
        scope: current.toString()
      }
    });
  }
  return new Response();
};
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$j
}, Symbol.toStringTag, { value: "Module" }));
const action$i = async ({
  request
}) => {
  var _a2, _b, _c, _d, _e;
  const url = new URL(request.url);
  if (url.protocol === "http:" && !url.hostname.includes("localhost")) {
    url.protocol = "https:";
  }
  const secureRequest = new Request(url.toString(), request);
  const {
    admin,
    session
  } = await authenticate.admin(secureRequest);
  const shop = session.shop;
  if (request.method !== "POST") {
    return data({
      success: false,
      error: "Method not allowed"
    }, {
      status: 405
    });
  }
  const formData = await request.formData();
  const donationId = formData.get("donationId");
  const logId = formData.get("logId");
  if (donationId) {
    const donation = await prisma.donation.findUnique({
      where: {
        id: donationId
      },
      include: {
        campaign: true
      }
    });
    if (!donation) {
      return data({
        success: false,
        error: "Donation record not found"
      }, {
        status: 404
      });
    }
    if (!donation.donorEmail) {
      return data({
        success: false,
        error: "Donation does not have an attached email"
      }, {
        status: 400
      });
    }
    const emailSettings = await prisma.emailSettings.findUnique({
      where: {
        shop: donation.campaign.shop
      }
    });
    const defaultTemplateString = (emailSettings == null ? void 0 : emailSettings.receiptBody) || `
      <h3>Donation Receipt</h3>
      <table border="1" style="border-collapse: collapse; width: 100%; max-width: 400px; text-align: left; font-size: 14px;">
        <tbody>
          <tr><th style="padding: 8px; border: 1px solid #ddd;">First Name:</th><td style="padding: 8px; border: 1px solid #ddd;">{{first_name}}</td></tr>
          <tr><th style="padding: 8px; border: 1px solid #ddd;">Last Name:</th><td style="padding: 8px; border: 1px solid #ddd;">{{last_name}}</td></tr>
          <tr><th style="padding: 8px; border: 1px solid #ddd;">Email:</th><td style="padding: 8px; border: 1px solid #ddd;">{{email}}</td></tr>
          <tr><th style="padding: 8px; border: 1px solid #ddd;">Date:</th><td style="padding: 8px; border: 1px solid #ddd;">{{date}}</td></tr>
          <tr><th style="padding: 8px; border: 1px solid #ddd;">Order Number:</th><td style="padding: 8px; border: 1px solid #ddd;">{{order_number}}</td></tr>
          <tr><th style="padding: 8px; border: 1px solid #ddd;">Donation Name:</th><td style="padding: 8px; border: 1px solid #ddd;">{{donation_name}}</td></tr>
          <tr><th style="padding: 8px; border: 1px solid #ddd;">Donate Price:</th><td style="padding: 8px; border: 1px solid #ddd;">{{price}}</td></tr>
          <tr><th style="padding: 8px; border: 1px solid #ddd;">Currency:</th><td style="padding: 8px; border: 1px solid #ddd;">{{currency}}</td></tr>
        </tbody>
      </table>
      <h3 style="margin-top: 16px;">Thanks For Donating!</h3>
    `;
    const donorNameParts = (donation.donorName || "").split(" ");
    const firstName = donorNameParts[0] || "Generous";
    const lastName = donorNameParts.slice(1).join(" ") || "Donor";
    const compiledTemplate = defaultTemplateString.replace(/{{first_name}}/g, firstName).replace(/{{last_name}}/g, lastName).replace(/{{email}}/g, donation.donorEmail).replace(/{{date}}/g, donation.createdAt.toISOString().split("T")[0]).replace(/{{order_number}}/g, donation.orderId || "N/A").replace(/{{donation_name}}/g, donation.campaign.name).replace(/{{price}}/g, donation.amount.toString()).replace(/{{currency}}/g, "USD");
    let transporter;
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      console.log("No SMTP details found in .env, falling back to dynamic Ethereal test account...");
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    }
    try {
      const emailSubject = (emailSettings == null ? void 0 : emailSettings.receiptSubject) || "Donation Receipt";
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM_EMAIL || '"Donations App" <no-reply@donations.app>',
        to: donation.donorEmail,
        subject: emailSubject,
        html: compiledTemplate
      });
      console.log("Email sent successfully! Message ID: %s", info.messageId);
      return data({
        success: true,
        message: "Email sent successfully"
      });
    } catch (emailError) {
      console.error("Failed to send email via SMTP:", emailError);
      return data({
        success: false,
        error: emailError.message || "Email failed to send. Please try again."
      }, {
        status: 500
      });
    }
  } else if (logId) {
    let log = await prisma.posDonationLog.findUnique({
      where: {
        id: logId
      }
    });
    let logType = "pos";
    if (!log) {
      log = await prisma.recurringDonationLog.findUnique({
        where: {
          id: logId
        }
      });
      logType = "recurring";
    }
    if (!log) {
      return data({
        success: false,
        error: "Log not found"
      }, {
        status: 404
      });
    }
    const orderResponse = await admin.graphql(`#graphql
      query getOrder($id: ID!) {
        order(id: $id) {
          name
          email
          shippingAddress {
            name address1 address2 city provinceCode zip country
          }
          billingAddress {
            name address1 address2 city provinceCode zip country
            firstName
            lastName
          }
        }
      }`, {
      variables: {
        id: log.orderId
      }
    });
    const orderData = await orderResponse.json();
    const order = (_a2 = orderData.data) == null ? void 0 : _a2.order;
    if (!order || !order.email) {
      if (logType === "pos") {
        await prisma.posDonationLog.update({
          where: {
            id: logId
          },
          data: {
            receiptStatus: "failed"
          }
        });
      }
      return data({
        success: false,
        error: "Order or customer email not found"
      }, {
        status: 400
      });
    }
    const customerName = order.billingAddress ? `${order.billingAddress.firstName || ""} ${order.billingAddress.lastName || ""}`.trim() : "";
    const shippingAddr = order.shippingAddress ? `${order.shippingAddress.name}
${order.shippingAddress.address1}${order.shippingAddress.address2 ? ` ${order.shippingAddress.address2}` : ""}
${order.shippingAddress.city}, ${order.shippingAddress.provinceCode || ""} ${order.shippingAddress.zip}
${order.shippingAddress.country}` : "";
    const billingAddr = order.billingAddress ? `${order.billingAddress.name}
${order.billingAddress.address1}${order.billingAddress.address2 ? ` ${order.billingAddress.address2}` : ""}
${order.billingAddress.city}, ${order.billingAddress.provinceCode || ""} ${order.billingAddress.zip}
${order.billingAddress.country}` : "";
    const freqLabel = logType === "recurring" ? log.frequency === "weekly" ? "Weekly" : log.frequency === "monthly" ? "Monthly" : "One-time" : "One-time";
    const config = await prisma.recurringDonationConfig.findUnique({
      where: {
        shop
      }
    });
    const donationProductId = (config == null ? void 0 : config.productId) || "9946640679159";
    const orderDetailResponse = await admin.graphql(`#graphql
      query getOrderDetail($id: ID!) {
        order(id: $id) {
          lineItems(first: 20) {
            edges {
              node {
                title
                variant {
                    product {
                        id
                    }
                }
              }
            }
          }
        }
      }`, {
      variables: {
        id: log.orderId
      }
    });
    const detailData = await orderDetailResponse.json();
    const lineItems = ((_e = (_d = (_c = (_b = detailData.data) == null ? void 0 : _b.order) == null ? void 0 : _c.lineItems) == null ? void 0 : _d.edges) == null ? void 0 : _e.map((e) => e.node)) || [];
    const donationItem = lineItems.find((li) => {
      var _a3, _b2, _c2;
      return (_c2 = (_b2 = (_a3 = li.variant) == null ? void 0 : _a3.product) == null ? void 0 : _b2.id) == null ? void 0 : _c2.includes(donationProductId);
    });
    let nextBillingDate = "";
    const createdDate = new Date(log.createdAt);
    const frequencyFromLog = log.frequency;
    if (frequencyFromLog === "weekly") {
      createdDate.setDate(createdDate.getDate() + 7);
      nextBillingDate = createdDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } else if (frequencyFromLog === "monthly") {
      createdDate.setDate(createdDate.getDate() + 30);
      nextBillingDate = createdDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    }
    const res = await sendDonationReceipt({
      email: order.email,
      name: customerName,
      amount: log.donationAmount.toFixed(2),
      orderNumber: order.name,
      shop,
      frequency: freqLabel,
      shippingAddress: shippingAddr,
      billingAddress: billingAddr,
      productTitle: (donationItem == null ? void 0 : donationItem.title) || "Recurring Donation",
      manageUrl: `https://${shop}/account/subscriptions`,
      nextBillingDate
    });
    if (res.success) {
      if (logType === "pos") {
        await prisma.posDonationLog.update({
          where: {
            id: logId
          },
          data: {
            receiptStatus: "sent",
            receiptSentAt: /* @__PURE__ */ new Date(),
            isResent: true
          }
        });
      } else {
        await prisma.recurringDonationLog.update({
          where: {
            id: logId
          },
          data: {
            receiptStatus: "sent",
            receiptSentAt: /* @__PURE__ */ new Date(),
            isResent: true
          }
        });
      }
      return data({
        success: true
      });
    } else {
      if (logType === "pos") {
        await prisma.posDonationLog.update({
          where: {
            id: logId
          },
          data: {
            receiptStatus: "failed"
          }
        });
      } else {
        await prisma.recurringDonationLog.update({
          where: {
            id: logId
          },
          data: {
            receiptStatus: "failed"
          }
        });
      }
      return data({
        success: false,
        error: res.error
      }, {
        status: 500
      });
    }
  } else {
    return data({
      success: false,
      error: "Missing logId or donationId"
    }, {
      status: 400
    });
  }
};
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$i
}, Symbol.toStringTag, { value: "Module" }));
const action$h = async ({
  request
}) => {
  var _a2, _b, _c, _d, _e;
  const {
    shop,
    admin,
    payload,
    topic
  } = await authenticate.webhook(request);
  if (topic !== "ORDERS_CANCELLED") {
    return new Response(null, {
      status: 400
    });
  }
  const order = payload;
  const orderIdStr = order.admin_graphql_api_id || `gid://shopify/Order/${order.id}`;
  const subscription = await prisma.planSubscription.findUnique({
    where: {
      shop
    }
  });
  const plan = (subscription == null ? void 0 : subscription.plan) || "basic";
  try {
    let existingLog = await prisma.posDonationLog.findUnique({
      where: {
        orderId: orderIdStr
      }
    });
    let logType = "pos";
    if (!existingLog) {
      existingLog = await prisma.recurringDonationLog.findUnique({
        where: {
          orderId: orderIdStr
        }
      });
      logType = "recurring";
    }
    if (existingLog) {
      if (logType === "pos") {
        await prisma.posDonationLog.update({
          where: {
            orderId: orderIdStr
          },
          data: {
            status: "cancelled"
          }
        });
      } else {
        await prisma.recurringDonationLog.update({
          where: {
            orderId: orderIdStr
          },
          data: {
            status: "cancelled"
          }
        });
      }
      try {
        const customerEmail = order.email || order.contact_email || ((_a2 = order.customer) == null ? void 0 : _a2.email);
        const customerName = order.customer ? `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim() : ((_b = order.billing_address) == null ? void 0 : _b.name) || "";
        if (customerEmail) {
          if (checkFeatureAccess(plan, "canSendCancelEmail")) {
            const freqLabel = logType === "recurring" ? existingLog.frequency === "weekly" ? "Weekly" : existingLog.frequency === "monthly" ? "Monthly" : "One-time" : "One-time";
            await sendDonationReceipt({
              email: customerEmail,
              name: customerName,
              amount: existingLog.donationAmount.toFixed(2),
              orderNumber: existingLog.orderNumber || "",
              type: "cancellation",
              shop,
              frequency: freqLabel
            });
          } else {
            console.log(`[Webhook] Cancellation email skipped for ${shop} - Plan restriction: ${plan}`);
          }
        }
      } catch (emailErr) {
        console.error("Failed to send cancellation email:", emailErr);
      }
      if (admin) {
        const existingTags = order.tags ? order.tags.split(",").map((t) => t.trim()) : [];
        if (!existingTags.includes("donation_refunded")) {
          existingTags.push("donation_refunded");
        }
        const input2 = {
          id: orderIdStr,
          tags: existingTags.join(",")
        };
        const updateResponse = await admin.graphql(`#graphql
          mutation orderUpdate($input: OrderInput!) {
            orderUpdate(input: $input) {
              order {
                id
                tags
              }
              userErrors {
                field
                message
              }
            }
          }`, {
          variables: {
            input: input2
          }
        });
        const updateData = await updateResponse.json();
        if (((_e = (_d = (_c = updateData.data) == null ? void 0 : _c.orderUpdate) == null ? void 0 : _d.userErrors) == null ? void 0 : _e.length) > 0) {
          console.error("Order cancel tags update errors:", updateData.data.orderUpdate.userErrors);
        }
      }
    }
  } catch (err) {
    console.error("Error processing orders/cancelled webhook:", err);
  }
  return new Response("OK", {
    status: 200
  });
};
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$h
}, Symbol.toStringTag, { value: "Module" }));
const loader$o = async () => jsonResp({
  success: false,
  error: "Use POST"
}, 405);
const action$g = async ({
  request
}) => {
  var _a2, _b, _c, _d, _e;
  if (request.method !== "POST") {
    return jsonResp({
      success: false,
      error: "Method not allowed"
    }, 405);
  }
  let shop;
  try {
    const auth = await authenticate.public.appProxy(request);
    shop = ((_a2 = auth.session) == null ? void 0 : _a2.shop) || "";
    if (!shop) throw new Error("Missing shop");
  } catch (err) {
    return jsonResp({
      success: false,
      error: "Unauthorized"
    }, 401);
  }
  let admin;
  try {
    const result = await unauthenticated.admin(shop);
    admin = result.admin;
  } catch (err) {
    console.error("[custom-cart] Failed to get admin client:", err);
    return jsonResp({
      success: false,
      error: "Could not initialise admin client"
    }, 500);
  }
  let body = {};
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const fd = await request.formData();
      fd.forEach((v, k) => {
        body[k] = String(v);
      });
    }
  } catch {
    return jsonResp({
      success: false,
      error: "Invalid request body"
    }, 400);
  }
  const {
    campaignId,
    customAmount,
    variantId
  } = body;
  if (!campaignId || !customAmount) {
    return jsonResp({
      success: false,
      error: "Missing campaignId or customAmount"
    }, 400);
  }
  const parsedAmount = parseFloat(customAmount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return jsonResp({
      success: false,
      error: "Invalid customAmount"
    }, 400);
  }
  let campaign;
  try {
    campaign = await prisma.campaign.findUnique({
      where: {
        id: campaignId
      }
    });
  } catch (err) {
    console.error("[custom-cart] DB error:", err);
    return jsonResp({
      success: false,
      error: "Campaign lookup failed"
    }, 500);
  }
  if (!campaign) {
    return jsonResp({
      success: false,
      error: "Campaign not found"
    }, 404);
  }
  if (campaign.shop !== shop) {
    return jsonResp({
      success: false,
      error: "Campaign not found"
    }, 404);
  }
  let resolvedVariantId = variantId || null;
  if (!resolvedVariantId) {
    try {
      const vids = JSON.parse(campaign.shopifyVariantIds || "[]");
      resolvedVariantId = vids[0] || null;
    } catch {
      resolvedVariantId = null;
    }
  }
  if (!resolvedVariantId) {
    return jsonResp({
      success: false,
      error: "No variant found for campaign"
    }, 422);
  }
  const variantGid = resolvedVariantId.includes("gid://") ? resolvedVariantId : `gid://shopify/ProductVariant/${resolvedVariantId}`;
  const priceOverride = parsedAmount.toFixed(2);
  try {
    const response = await admin.graphql(`#graphql
      mutation draftOrderCreate($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            id
            invoiceUrl
            status
          }
          userErrors {
            field
            message
          }
        }
      }`, {
      variables: {
        input: {
          lineItems: [{
            variantId: variantGid,
            quantity: 1,
            originalUnitPrice: priceOverride
          }],
          tags: ["preset_donation"],
          note: `Preset donation – Custom amount: $${priceOverride}`,
          customAttributes: [{
            key: "Donation Campaign",
            value: campaign.name
          }, {
            key: "Donation Amount",
            value: `$${priceOverride}`
          }, {
            key: "Custom Amount",
            value: "true"
          }, {
            key: "_donation_widget_active",
            value: "true"
          }]
        }
      }
    });
    const json = await response.json();
    const userErrors = ((_c = (_b = json == null ? void 0 : json.data) == null ? void 0 : _b.draftOrderCreate) == null ? void 0 : _c.userErrors) || [];
    if (userErrors.length > 0) {
      console.error("[custom-cart] draftOrderCreate userErrors:", userErrors);
      return jsonResp({
        success: false,
        error: userErrors[0].message
      }, 422);
    }
    const draftOrder = (_e = (_d = json == null ? void 0 : json.data) == null ? void 0 : _d.draftOrderCreate) == null ? void 0 : _e.draftOrder;
    if (!(draftOrder == null ? void 0 : draftOrder.invoiceUrl)) {
      return jsonResp({
        success: false,
        error: "Draft order created but no invoiceUrl returned"
      }, 500);
    }
    console.log(`[custom-cart] Draft order created: ${draftOrder.id}, invoiceUrl: ${draftOrder.invoiceUrl}`);
    return jsonResp({
      success: true,
      checkoutUrl: draftOrder.invoiceUrl
    });
  } catch (err) {
    console.error("[custom-cart] draftOrderCreate error:", err);
    return jsonResp({
      success: false,
      error: String(err.message || err)
    }, 500);
  }
};
function jsonResp(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
const route10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$g,
  loader: loader$o
}, Symbol.toStringTag, { value: "Module" }));
const action$f = async ({
  request
}) => {
  const {
    shop,
    session,
    topic
  } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  if (session) {
    await prisma.session.deleteMany({
      where: {
        shop
      }
    });
  }
  return new Response();
};
const route11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$f
}, Symbol.toStringTag, { value: "Module" }));
const action$e = async ({
  request
}) => {
  var _a2, _b, _c, _d;
  const {
    shop,
    admin,
    payload,
    topic
  } = await authenticate.webhook(request);
  if (topic !== "REFUNDS_CREATE") {
    return new Response(null, {
      status: 400
    });
  }
  const refund = payload;
  if (!refund.order_id) return new Response(null, {
    status: 200
  });
  const subscription = await prisma.planSubscription.findUnique({
    where: {
      shop
    }
  });
  const plan = (subscription == null ? void 0 : subscription.plan) || "basic";
  const orderIdStr = `gid://shopify/Order/${refund.order_id}`;
  try {
    let existingLog = await prisma.posDonationLog.findUnique({
      where: {
        orderId: orderIdStr
      }
    });
    let logType = "pos";
    if (!existingLog) {
      existingLog = await prisma.recurringDonationLog.findUnique({
        where: {
          orderId: orderIdStr
        }
      });
      logType = "recurring";
    }
    if (existingLog) {
      if (logType === "pos") {
        await prisma.posDonationLog.update({
          where: {
            orderId: orderIdStr
          },
          data: {
            status: "refunded"
          }
        });
      } else {
        await prisma.recurringDonationLog.update({
          where: {
            orderId: orderIdStr
          },
          data: {
            status: "refunded"
          }
        });
      }
      if (admin) {
        const orderResponse = await admin.graphql(`#graphql
          query getOrder($id: ID!) {
            order(id: $id) {
              id
              name
              email
              tags
              billingAddress {
                firstName
                lastName
              }
            }
          }`, {
          variables: {
            id: orderIdStr
          }
        });
        const orderData = await orderResponse.json();
        const order = (_a2 = orderData.data) == null ? void 0 : _a2.order;
        if (order && order.email) {
          const customerName = order.billingAddress ? `${order.billingAddress.firstName || ""} ${order.billingAddress.lastName || ""}`.trim() : "";
          try {
            if (checkFeatureAccess(plan, "canSendRefundEmail")) {
              const freqLabel = logType === "recurring" ? existingLog.frequency === "weekly" ? "Weekly" : existingLog.frequency === "monthly" ? "Monthly" : "One-time" : "One-time";
              await sendDonationReceipt({
                email: order.email,
                name: customerName,
                amount: existingLog.donationAmount.toFixed(2),
                orderNumber: order.name,
                type: "refund",
                shop,
                frequency: freqLabel
              });
            } else {
              console.log(`[Webhook] Refund email skipped for ${shop} - Plan restriction: ${plan}`);
            }
          } catch (emailErr) {
            console.error("Failed to send refund email:", emailErr);
          }
        }
        const existingTags = (order == null ? void 0 : order.tags) || [];
        if (!existingTags.includes("donation_refunded")) {
          existingTags.push("donation_refunded");
          const input2 = {
            id: orderIdStr,
            tags: existingTags.join(",")
          };
          const updateResponse = await admin.graphql(`#graphql
            mutation orderUpdate($input: OrderInput!) {
              orderUpdate(input: $input) {
                userErrors {
                  field
                  message
                }
              }
            }`, {
            variables: {
              input: input2
            }
          });
          const updateData = await updateResponse.json();
          if (((_d = (_c = (_b = updateData.data) == null ? void 0 : _b.orderUpdate) == null ? void 0 : _c.userErrors) == null ? void 0 : _d.length) > 0) {
            console.error("Order refund tags update errors:", updateData.data.orderUpdate.userErrors);
          }
        }
      }
    }
  } catch (err) {
    console.error("Error processing refunds/create webhook:", err);
  }
  return new Response("OK", {
    status: 200
  });
};
const route12 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$e
}, Symbol.toStringTag, { value: "Module" }));
const action$d = async ({
  request
}) => {
  var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r;
  console.log(`

[!!! WEBHOOK HIT !!!] Incoming request to /webhooks/orders/create at ${(/* @__PURE__ */ new Date()).toISOString()}`);
  let shop = "unknown";
  let topic = "unknown";
  let payload;
  let admin;
  let session;
  try {
    const auth = await authenticate.webhook(request);
    payload = auth.payload;
    admin = auth.admin;
    session = auth.session;
    shop = auth.shop;
    topic = auth.topic;
    console.log(`[Webhook] Auth SUCCESS. Topic: ${topic}, Shop: ${shop}`);
    if (topic !== "ORDERS_CREATE") {
      console.warn(`[Webhook] Unexpected topic: ${topic}`);
      return new Response(null, {
        status: 400
      });
    }
    if (!admin) {
      console.error("Admin context is not available for this webhook request.");
      return new Response();
    }
    const order = payload;
    const orderId = (_a2 = payload.id) == null ? void 0 : _a2.toString();
    const orderIdStr = order.admin_graphql_api_id || `gid://shopify/Order/${order.id}`;
    const customerName = payload.customer ? `${payload.customer.first_name || ""} ${payload.customer.last_name || ""}`.trim() : ((_b = order.billing_address) == null ? void 0 : _b.name) || "Anonymous";
    const customerEmail = payload.email || payload.contact_email || ((_c = payload.customer) == null ? void 0 : _c.email) || "No Email provided";
    const currency = payload.currency || "USD";
    const createdAt = payload.created_at ? new Date(payload.created_at) : /* @__PURE__ */ new Date();
    if (payload.line_items && Array.isArray(payload.line_items)) {
      for (const item of payload.line_items) {
        if (!item.product_id) continue;
        try {
          const productIdStr = item.product_id.toString();
          const variantIdStr = ((_d = item.variant_id) == null ? void 0 : _d.toString()) || null;
          const response = await admin.graphql(`#graphql
                        query getProductDetails($id: ID!) {
                            product(id: $id) {
                                productType
                                tags
                            }
                        }`, {
            variables: {
              id: `gid://shopify/Product/${productIdStr}`
            }
          });
          const {
            data: data2
          } = await response.json();
          let isDonation = false;
          if (data2 == null ? void 0 : data2.product) {
            const productType = (_e = data2.product.productType) == null ? void 0 : _e.toLowerCase();
            const tags = data2.product.tags || [];
            if (productType === "donation" || tags.some((t) => t.toLowerCase() === "donation")) {
              isDonation = true;
            }
          }
          const matchingCampaign = await prisma.campaign.findFirst({
            where: {
              shop,
              shopifyProductId: {
                endsWith: productIdStr
              }
            }
          });
          if (isDonation && matchingCampaign) {
            const hasSellingPlan = !!item.selling_plan_allocation;
            const hasSellingPlanProp = (item.properties || []).some((p) => ["selling_plan", "_selling_plan_id"].includes(p.name));
            if (hasSellingPlan || hasSellingPlanProp) {
              console.log(`[Webhook] Skipping Donation table for recurring item (variant ${variantIdStr}) — will be handled by STAGING LOGIC.`);
              continue;
            }
            const basePrice = parseFloat(item.price || "0") * (item.quantity || 1);
            const lineDiscount = parseFloat(item.total_discount || "0");
            const donationAmount = Math.max(0, basePrice - lineDiscount);
            const donationAmtFormatted = donationAmount.toFixed(2);
            try {
              await prisma.donation.upsert({
                where: {
                  orderId_shopifyVariantId: {
                    orderId,
                    shopifyVariantId: variantIdStr || "unknown"
                  }
                },
                create: {
                  campaignId: matchingCampaign.id,
                  orderId,
                  orderNumber: order.name,
                  amount: donationAmount,
                  currency,
                  donorName: customerName,
                  donorEmail: customerEmail,
                  shopifyProductId: productIdStr,
                  shopifyVariantId: variantIdStr || "unknown",
                  createdAt
                },
                update: {
                  amount: donationAmount,
                  orderNumber: order.name
                }
              });
              console.log(`[Webhook] Inserted/Updated donation mapping for Campaign ${matchingCampaign.id}`);
            } catch (dbError) {
              console.error("Error inserting donation record:", dbError);
            }
            if (admin) {
              try {
                const existingTags = order.tags ? order.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
                if (!existingTags.includes("preset_donation")) {
                  existingTags.push("preset_donation");
                }
                await admin.graphql(`#graphql
                                    mutation orderUpdate($input: OrderInput!) {
                                        orderUpdate(input: $input) {
                                            order { id tags }
                                            userErrors { field message }
                                        }
                                    }`, {
                  variables: {
                    input: {
                      id: orderIdStr,
                      tags: existingTags
                    }
                  }
                });
                console.log(`[Webhook] Tagged order ${order.name} with preset_donation`);
              } catch (tagErr) {
                console.error("[Webhook] Failed to tag preset_donation order:", tagErr);
              }
            }
            try {
              const planSub = await prisma.planSubscription.findUnique({
                where: {
                  shop
                }
              });
              const planName = (planSub == null ? void 0 : planSub.plan) || "basic";
              const currentCustomerEmail = payload.email || payload.contact_email || ((_f = payload.customer) == null ? void 0 : _f.email) || "No Email provided";
              if (currentCustomerEmail !== "No Email provided" && checkFeatureAccess(planName, "canSendReceiptEmail")) {
                const emailResult = await sendDonationReceipt({
                  email: currentCustomerEmail,
                  name: customerName,
                  amount: donationAmtFormatted,
                  orderNumber: order.name || orderId,
                  shop,
                  donationName: matchingCampaign.name,
                  frequency: "One-time"
                });
                if (emailResult.success) {
                  console.log(`[Webhook] Donation confirmation email sent to ${currentCustomerEmail} for order ${order.name}`);
                } else {
                  console.error(`[Webhook] Failed to send email:`, emailResult.error);
                }
              } else {
                console.log(`[Webhook] Email skipped: email=${currentCustomerEmail}, plan=${planName}`);
              }
            } catch (emailErr) {
              console.error("[Webhook] Error sending donation email:", emailErr);
            }
          }
        } catch (error) {
          console.error("Error processing line item:", error);
        }
      }
    }
    const settings = await prisma.posDonationSettings.findUnique({
      where: {
        shop
      }
    });
    const roundupSettings = await prisma.roundUpDonationSettings.findUnique({
      where: {
        shop
      }
    });
    const defaultSettings = {
      enabled: true,
      // Default to true for POS discovery if settings missing
      donationType: "fixed",
      donationBasis: "order",
      donationValue: 5,
      minimumValue: 0,
      orderTag: "galaxy_pos_donation"
    };
    const effectiveSettings = settings || defaultSettings;
    const isSettingsEnabled = effectiveSettings.enabled;
    console.log(`[Webhook] Settings for ${shop}: ${settings ? "Found" : "NOT found (using defaults)"}. Enabled state: ${isSettingsEnabled}`);
    const subscription = await prisma.planSubscription.findUnique({
      where: {
        shop
      }
    });
    const plan = (subscription == null ? void 0 : subscription.plan) || "basic";
    const config = await prisma.recurringDonationConfig.findUnique({
      where: {
        shop
      }
    });
    const DONATION_PRODUCT_ID = (config == null ? void 0 : config.productId) || "9946640679159";
    let isRecurring = false;
    let recurringSellingPlanId = null;
    let subscriptionContractId = null;
    let directDonationAmountCents = 0;
    let hasDirectDonationProduct = false;
    let directDonationName = "Charity Donation";
    let hasRoundUpDonation = false;
    let roundUpAmountCents = 0;
    for (const lineItem of order.line_items || []) {
      if (String(lineItem.product_id) === String(DONATION_PRODUCT_ID)) {
        hasDirectDonationProduct = true;
        directDonationName = lineItem.title || "Charity Donation";
        directDonationAmountCents += parseFloat(lineItem.price || 0) * 100 * (lineItem.quantity || 1);
      }
      const typeProp = (lineItem.properties || []).find((p) => {
        const nameLower = String(p.name).toLowerCase();
        return nameLower === "type" || nameLower === "_type";
      });
      if (typeProp) {
        const valLower = String(typeProp.value).toLowerCase();
        if (valLower === "roundup" || valLower === "extra") {
          hasRoundUpDonation = true;
          const basePrice = parseFloat(lineItem.price || 0) * (lineItem.quantity || 1);
          const lineDiscount = parseFloat(lineItem.total_discount || 0);
          roundUpAmountCents += Math.round(Math.max(0, basePrice - lineDiscount) * 100);
        }
      }
      if (lineItem.selling_plan_allocation) {
        isRecurring = true;
        recurringSellingPlanId = lineItem.selling_plan_allocation.selling_plan_id ? `gid://shopify/SellingPlan/${lineItem.selling_plan_allocation.selling_plan_id}` : null;
        if (lineItem.selling_plan_allocation.subscription_contract_id) {
          subscriptionContractId = lineItem.selling_plan_allocation.subscription_contract_id.includes("gid://") ? lineItem.selling_plan_allocation.subscription_contract_id : `gid://shopify/SubscriptionContract/${lineItem.selling_plan_allocation.subscription_contract_id}`;
        }
      } else {
        const spProp = (lineItem.properties || []).find((p) => p.name === "selling_plan" || p.name === "_selling_plan_id");
        if (spProp) {
          isRecurring = true;
          recurringSellingPlanId = String(spProp.value).includes("gid://") ? String(spProp.value) : `gid://shopify/SellingPlan/${spProp.value}`;
        }
        const subProp = (lineItem.properties || []).find((p) => p.name === "subscription_id" || p.name === "_subscription_id");
        if (subProp) {
          isRecurring = true;
          subscriptionContractId = String(subProp.value).includes("gid://") ? String(subProp.value) : `gid://shopify/SubscriptionContract/${subProp.value}`;
        }
      }
    }
    let isPosDonationSource = false;
    let frequency = "one_time";
    if (isRecurring && recurringSellingPlanId) {
      if (config) {
        const spId = recurringSellingPlanId.split("/").pop() || "";
        if ((_g = config.monthlyPlanId) == null ? void 0 : _g.includes(spId)) frequency = "monthly";
        else if ((_h = config.weeklyPlanId) == null ? void 0 : _h.includes(spId)) frequency = "weekly";
      }
    }
    let isApplicable = false;
    let donationAmtCents = 0;
    let samplePriceCents = 0;
    const totalCents = parseFloat(order.total_price || 0) * 100;
    const minValCents = (effectiveSettings.minimumValue || 0) * 100;
    if (hasDirectDonationProduct) {
      isApplicable = true;
      donationAmtCents += directDonationAmountCents;
      samplePriceCents = totalCents;
      console.log(`[Webhook] Flow A: Direct Donation detected. Amount: ${directDonationAmountCents}c`);
    }
    if (hasRoundUpDonation) {
      isApplicable = true;
      donationAmtCents += roundUpAmountCents;
      if (!hasDirectDonationProduct) {
        directDonationName = (roundupSettings == null ? void 0 : roundupSettings.campaignTitle) || "Round-Up Donation";
      }
      console.log(`[Webhook] Flow B: Round-Up Donation detected. Amount: ${roundUpAmountCents}c`);
    }
    if (!isApplicable && isSettingsEnabled) {
      console.log(`[Webhook] Flow C: Checking POS/Portion-of-Sale logic...`);
      if (effectiveSettings.donationType === "percentage" && !checkFeatureAccess(plan, "canUsePercentageDonation")) {
        console.log(`[Webhook] Skipping POS check - Percentage donation restricted for plan: ${plan}`);
      } else {
        const widgetActive = (order.note_attributes || []).some((attr) => attr.name === "_donation_widget_active" && attr.value === "true");
        const isWeb = order.source_name === "web";
        const isPos = order.source_name === "pos";
        if (isWeb && !widgetActive) {
          console.log(`[Webhook] Skipping POS check - Web source without active donation widget.`);
        } else if (isPos || widgetActive) {
          if (effectiveSettings.donationBasis === "product") {
            for (const lineItem of order.line_items || []) {
              const itemPriceCents = parseFloat(lineItem.price || 0) * 100;
              if (itemPriceCents >= minValCents) {
                isApplicable = true;
                isPosDonationSource = true;
                samplePriceCents = itemPriceCents;
                donationAmtCents = effectiveSettings.donationType === "percentage" ? effectiveSettings.donationValue / 100 * samplePriceCents : effectiveSettings.donationValue * 100;
                break;
              }
            }
          } else if (totalCents >= minValCents) {
            isApplicable = true;
            isPosDonationSource = true;
            samplePriceCents = totalCents;
            donationAmtCents = effectiveSettings.donationType === "percentage" ? effectiveSettings.donationValue / 100 * samplePriceCents : effectiveSettings.donationValue * 100;
          }
        } else {
          console.log(`[Webhook] Skipping POS check - Widget not active and source is not POS. Source: ${order.source_name}`);
        }
      }
    }
    if (isApplicable) {
      const donationAmtFormatted = (donationAmtCents / 100).toFixed(2);
      let emailStatus = "pending";
      let sentDate = null;
      let currentCustomerEmail = customerEmail;
      let currentCustomerName = customerName;
      if (admin) {
        try {
          const resp = await admin.graphql(`#graphql
                        query getOrder($id: ID!) { 
                          order(id: $id) { 
                            email 
                            customer { id } 
                            billingAddress { firstName lastName } 
                            lineItems(first: 20) {
                              edges {
                                node {
                                  variant {
                                    product {
                                      id
                                      featuredImage {
                                        url
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          } 
                        }`, {
            variables: {
              id: orderIdStr
            }
          });
          const data2 = await resp.json();
          const fresh = (_i = data2.data) == null ? void 0 : _i.order;
          if (fresh) {
            if ((_j = fresh.customer) == null ? void 0 : _j.id) order.customer_gql_id = fresh.customer.id;
            if (fresh.email) currentCustomerEmail = fresh.email;
            if (fresh.billingAddress) currentCustomerName = `${fresh.billingAddress.firstName || ""} ${fresh.billingAddress.lastName || ""}`.trim();
            const gqlLineItems = ((_l = (_k = fresh.lineItems) == null ? void 0 : _k.edges) == null ? void 0 : _l.map((e) => e.node)) || [];
            const gqlDonationItem = gqlLineItems.find((li) => {
              var _a3, _b2, _c2;
              return (_c2 = (_b2 = (_a3 = li.variant) == null ? void 0 : _a3.product) == null ? void 0 : _b2.id) == null ? void 0 : _c2.includes(DONATION_PRODUCT_ID);
            });
            if ((_o = (_n = (_m = gqlDonationItem == null ? void 0 : gqlDonationItem.variant) == null ? void 0 : _m.product) == null ? void 0 : _n.featuredImage) == null ? void 0 : _o.url) {
              order.donation_product_image = gqlDonationItem.variant.product.featuredImage.url;
            }
          }
        } catch (e) {
          console.error("GQL Refresh Error:", e);
        }
      }
      if (currentCustomerEmail !== "No Email provided" && checkFeatureAccess(plan, "canSendReceiptEmail")) {
        const freqLabel = frequency === "weekly" ? "Weekly" : frequency === "monthly" ? "Monthly" : "One-time";
        const shippingAddr = order.shipping_address ? `${order.shipping_address.name}
${order.shipping_address.address1}${order.shipping_address.address2 ? ` ${order.shipping_address.address2}` : ""}
${order.shipping_address.city}, ${order.shipping_address.province_code || ""} ${order.shipping_address.zip}
${order.shipping_address.country}` : "";
        const billingAddr = order.billing_address ? `${order.billing_address.name}
${order.billing_address.address1}${order.billing_address.address2 ? ` ${order.billing_address.address2}` : ""}
${order.billing_address.city}, ${order.billing_address.province_code || ""} ${order.billing_address.zip}
${order.billing_address.country}` : "";
        const donationItem = (order.line_items || []).find((li) => String(li.product_id) === String(DONATION_PRODUCT_ID));
        let nextBillingDate = "";
        const today = /* @__PURE__ */ new Date();
        if (frequency === "weekly") {
          today.setDate(today.getDate() + 7);
          nextBillingDate = today.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
          });
        } else if (frequency === "monthly") {
          today.setDate(today.getDate() + 30);
          nextBillingDate = today.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
          });
        }
        let paymentMethod = "Ending in card";
        if ((_p = order.payment_details) == null ? void 0 : _p.credit_card_number) {
          const last4 = order.payment_details.credit_card_number.slice(-4);
          paymentMethod = `Ending in ${last4}`;
        } else if (((_q = order.payment_gateway_names) == null ? void 0 : _q.length) > 0) {
          paymentMethod = order.payment_gateway_names[0];
        }
        const res = await sendDonationReceipt({
          email: currentCustomerEmail,
          name: currentCustomerName,
          amount: donationAmtFormatted,
          orderNumber: order.name,
          shop,
          donationName: directDonationName,
          frequency: freqLabel,
          shippingAddress: shippingAddr,
          billingAddress: billingAddr,
          productTitle: (donationItem == null ? void 0 : donationItem.title) || directDonationName,
          manageUrl: `https://${shop}/account/subscriptions`,
          nextBillingDate,
          paymentMethod,
          productImage: order.donation_product_image
        });
        if (res.success) {
          emailStatus = "sent";
          sentDate = /* @__PURE__ */ new Date();
        } else {
          emailStatus = "failed";
        }
      } else {
        emailStatus = currentCustomerEmail !== "No Email provided" ? "skipped" : "failed";
      }
      try {
        if (hasDirectDonationProduct) {
          await prisma.recurringDonationLog.upsert({
            where: {
              orderId: orderIdStr
            },
            update: {
              subscriptionContractId,
              type: "recurring"
            },
            create: {
              shop,
              orderId: orderIdStr,
              orderNumber: order.name,
              donationAmount: parseFloat(donationAmtFormatted),
              orderTotal: parseFloat(order.total_price || 0),
              currency: order.currency || "USD",
              receiptStatus: emailStatus,
              receiptSentAt: sentDate,
              sellingPlanId: recurringSellingPlanId,
              frequency,
              subscriptionContractId,
              type: "recurring"
            }
          });
        } else if (hasRoundUpDonation) {
          await prisma.roundUpDonationLog.upsert({
            where: {
              orderId: orderIdStr
            },
            update: {
              type: "roundup"
            },
            create: {
              shop,
              orderId: orderIdStr,
              orderNumber: order.name,
              donationAmount: parseFloat(donationAmtFormatted),
              orderTotal: parseFloat(order.total_price || 0),
              currency: order.currency || "USD",
              status: "active",
              receiptStatus: emailStatus,
              receiptSentAt: sentDate,
              isResent: false,
              type: "roundup"
            }
          });
        } else {
          await prisma.posDonationLog.upsert({
            where: {
              orderId: orderIdStr
            },
            update: {
              type: "pos"
            },
            create: {
              shop,
              orderId: orderIdStr,
              orderNumber: order.name,
              donationAmount: parseFloat(donationAmtFormatted),
              orderTotal: parseFloat(order.total_price || 0),
              currency: order.currency || "USD",
              status: "active",
              receiptStatus: emailStatus,
              receiptSentAt: sentDate,
              isResent: false,
              type: "pos"
            }
          });
        }
      } catch (e) {
        console.error("DB Log Error:", e);
      }
      if (admin) {
        try {
          const existingTags = order.tags ? order.tags.split(",").map((t) => t.trim()) : [];
          if (hasDirectDonationProduct) {
            const orderTag = frequency === "one_time" ? "preset_donation" : frequency === "monthly" ? "recurring_donation_monthly" : "recurring_donation_weekly";
            const customerTag = frequency === "one_time" ? "preset_donor" : frequency === "monthly" ? "recurring_donor_monthly" : "recurring_donor_weekly";
            if (!existingTags.includes(orderTag)) existingTags.push(orderTag);
            const customerId = order.customer_gql_id || (((_r = order.customer) == null ? void 0 : _r.id) ? `gid://shopify/Customer/${order.customer.id}` : null);
            if (customerId) {
              await admin.graphql(`#graphql
                                mutation tagsAdd($id: ID!, $tags: [String!]!) { tagsAdd(id: $id, tags: $tags) { node { id } } }`, {
                variables: {
                  id: customerId,
                  tags: [customerTag]
                }
              });
            }
          }
          if (hasRoundUpDonation) {
            const roundupTag = (roundupSettings == null ? void 0 : roundupSettings.donationOrderTag) || "roundup_donation";
            if (!existingTags.includes(roundupTag)) existingTags.push(roundupTag);
          }
          if (isPosDonationSource) {
            const baseTag = effectiveSettings.orderTag || "galaxy_pos_donation";
            if (!existingTags.includes(baseTag)) existingTags.push(baseTag);
          }
          const currentAttrs = (order.note_attributes || []).map((a) => ({
            key: a.name,
            value: a.value
          }));
          if (!currentAttrs.some((a) => a.key === "POS Donation Amount")) {
            currentAttrs.push({
              key: "POS Donation Amount",
              value: `${order.currency || "$"}${donationAmtFormatted}`
            });
          }
          await admin.graphql(`#graphql
                        mutation orderUpdate($input: OrderInput!) { orderUpdate(input: $input) { order { id } } }`, {
            variables: {
              input: {
                id: orderIdStr,
                tags: existingTags,
                customAttributes: currentAttrs
              }
            }
          });
          console.log(`[Webhook] Success: Handled Order ${order.name} (${donationAmtFormatted})`);
        } catch (e) {
          console.error("Tagging Error:", e);
        }
      }
    }
  } catch (err) {
    console.error("Fatal Webhook Error:", err);
  }
  return new Response("OK", {
    status: 200
  });
};
const route13 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$d
}, Symbol.toStringTag, { value: "Module" }));
const loader$n = async ({
  request
}) => {
  const {
    session
  } = await authenticate.admin(request);
  const shop = session.shop;
  const config = await prisma.blockConfig.findUnique({
    where: {
      shop
    }
  });
  return data({
    success: true,
    config: config ?? {
      shop,
      productBlockEnabled: true,
      cartBlockEnabled: true
    }
  });
};
const action$c = async ({
  request
}) => {
  if (request.method !== "POST") {
    return data({
      success: false,
      error: "Method not allowed"
    }, {
      status: 405
    });
  }
  const {
    session
  } = await authenticate.admin(request);
  const shop = session.shop;
  let body;
  try {
    body = await request.json();
  } catch {
    return data({
      success: false,
      error: "Invalid JSON body"
    }, {
      status: 400
    });
  }
  const productBlockEnabled = typeof body.productBlockEnabled === "boolean" ? body.productBlockEnabled : true;
  const cartBlockEnabled = typeof body.cartBlockEnabled === "boolean" ? body.cartBlockEnabled : true;
  try {
    const config = await prisma.blockConfig.upsert({
      where: {
        shop
      },
      create: {
        shop,
        productBlockEnabled,
        cartBlockEnabled
      },
      update: {
        productBlockEnabled,
        cartBlockEnabled
      }
    });
    return data({
      success: true,
      config
    });
  } catch (error) {
    console.error("[api.block-config] Error:", error);
    return data({
      success: false,
      error: "Failed to save configuration"
    }, {
      status: 500
    });
  }
};
const route14 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$c,
  loader: loader$n
}, Symbol.toStringTag, { value: "Module" }));
const loader$m = async ({
  request
}) => {
  try {
    const {
      session
    } = await authenticate.public.appProxy(request);
    if (!session) {
      return new Response(JSON.stringify({
        error: "Unauthorized"
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop") || session.shop;
    const settings = await prisma.posDonationSettings.findUnique({
      where: {
        shop
      }
    });
    if (!settings) {
      return new Response(JSON.stringify({
        enabled: false,
        donationType: "percentage",
        donationValue: 5,
        minimumValue: 0,
        donationMessage: "{donationAmount} of {totalOrderValue} will be donated to charity",
        tooltipMessage: "A portion of your purchase supports charity",
        orderTag: "galaxy_pos_donation"
      }), {
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    const {
      id,
      createdAt,
      updatedAt,
      shop: shopField,
      ...publicSettings
    } = settings;
    return new Response(JSON.stringify(publicSettings), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error fetching POS donation settings:", error);
    return new Response(JSON.stringify({
      error: "Internal server error"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
};
const route15 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$m
}, Symbol.toStringTag, { value: "Module" }));
const loader$l = async ({
  request
}) => {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    if (!shop) {
      return new Response(JSON.stringify({
        error: "Shop parameter required"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    const apiKey = url.searchParams.get("api_key");
    const validApiKey = process.env.POS_DONATION_API_KEY;
    if (validApiKey && apiKey !== validApiKey) {
      return new Response(JSON.stringify({
        error: "Invalid API key"
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    const settings = await prisma.posDonationSettings.findUnique({
      where: {
        shop
      }
    });
    const subscription = await prisma.planSubscription.findUnique({
      where: {
        shop
      }
    });
    const plan = (subscription == null ? void 0 : subscription.plan) || "basic";
    let finalSettings = settings ? {
      ...settings
    } : {
      enabled: false,
      donationType: "fixed",
      donationBasis: "order",
      donationValue: 5,
      minimumValue: 0,
      donationMessage: "{donationAmount} of {totalOrderValue} will be donated to charity",
      tooltipMessage: "A portion of your purchase supports charity",
      orderTag: "galaxy_pos_donation"
    };
    if (finalSettings.donationType === "percentage" && !checkFeatureAccess(plan, "canUsePercentageDonation")) {
      finalSettings.donationType = "fixed";
      console.log(`[API] Forcing donationType to fixed for ${shop} (Basic Plan)`);
    }
    const publicSettings = {
      enabled: finalSettings.enabled,
      donationType: finalSettings.donationType,
      donationBasis: finalSettings.donationBasis || "order",
      donationValue: finalSettings.donationValue,
      minimumValue: finalSettings.minimumValue,
      donationMessage: finalSettings.donationMessage,
      tooltipMessage: finalSettings.tooltipMessage,
      orderTag: finalSettings.orderTag
    };
    return new Response(JSON.stringify(publicSettings), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error fetching POS donation settings:", error);
    return new Response(JSON.stringify({
      error: "Internal server error"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
};
const route16 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$l
}, Symbol.toStringTag, { value: "Module" }));
const loader$k = async ({
  request
}) => {
  let shop;
  const url = new URL(request.url);
  shop = shop || url.searchParams.get("shop") || "";
  try {
    const campaigns = await prisma.campaign.findMany({
      where: {
        enabled: true,
        ...shop ? {
          shop
        } : {}
      },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        shopifyProductId: true,
        shopifyVariantIds: true,
        donationAmounts: true,
        allowOtherAmount: true,
        otherAmountTitle: true,
        displayStyle: true,
        isRecurringEnabled: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    const recurringConfig = await prisma.recurringDonationConfig.findUnique({
      where: {
        shop
      }
    });
    return new Response(JSON.stringify({
      success: true,
      recurringConfig: recurringConfig ? {
        monthlyPlanId: recurringConfig.monthlyPlanId,
        weeklyPlanId: recurringConfig.weeklyPlanId
      } : null,
      campaigns: campaigns.map((c) => ({
        ...c,
        // Parse JSON string fields for convenience
        donationAmounts: (() => {
          try {
            return JSON.parse(c.donationAmounts);
          } catch {
            return [];
          }
        })(),
        shopifyVariantIds: (() => {
          try {
            return JSON.parse(c.shopifyVariantIds);
          } catch {
            return [];
          }
        })()
      }))
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60"
      }
    });
  } catch (error) {
    console.error("[api.campaigns] Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Internal server error"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
const route17 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$k
}, Symbol.toStringTag, { value: "Module" }));
const loader$j = async ({
  request
}) => {
  var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j;
  const {
    liquid,
    admin
  } = await authenticate.public.appProxy(request);
  if (!admin) {
    return liquid(`
      <div style="max-width:600px;margin:60px auto;font-family:sans-serif;text-align:center;">
        <h2>Error: Store connection not found or app unauthenticated.</h2>
      </div>
    `);
  }
  const url = new URL(request.url);
  const customerId = url.searchParams.get("logged_in_customer_id");
  if (!customerId) {
    return liquid(`
      <div style="max-width:600px;margin:60px auto;font-family:sans-serif;text-align:center;padding:0 16px;">
        <h2 style="margin:0 0 8px;font-size:20px;color:#222;">Please log in to continue</h2>
        <p style="color:#666;margin:0 0 24px;">You need to be logged in to view your subscriptions.</p>
        <a href="{{ routes.account_login_url }}" style="display:inline-block;padding:10px 24px;background:#000;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Log In</a>
      </div>
    `);
  }
  const customerGid = `gid://shopify/Customer/${customerId}`;
  let contracts = [];
  try {
    const response = await admin.graphql(`#graphql
      query getCustomerSubscriptions($customerId: ID!) {
        customer(id: $customerId) {
          displayName
          subscriptionContracts(first: 20) {
            edges {
              node {
                id
                status
                createdAt
                nextBillingDate
                currencyCode
                lines(first: 10) {
                  edges {
                    node {
                      title
                      quantity
                      currentPrice {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
                originOrder {
                  id
                  name
                }
              }
            }
          }
        }
      }`, {
      variables: {
        customerId: customerGid
      }
    });
    const json = await response.json();
    if (json.errors) {
      console.error("GraphQL Errors:", json.errors);
      return liquid(`
        <div style="max-width:700px;margin:40px auto;font-family:sans-serif;padding:0 16px;">
          <h2 style="margin:0 0 8px;font-size:22px;color:#991b1b;">Error accessing subscriptions</h2>
          <div style="background:#fee2e2;border:1px solid #f87171;color:#991b1b;padding:16px;border-radius:8px;">
            <p style="margin:0 0 8px;font-weight:bold;">${(_a2 = json.errors[0]) == null ? void 0 : _a2.message}</p>
            <p style="margin:0;font-size:14px;">If you see an "Access denied" error, it means your app has not been granted the required subscription permissions. Please add the subscription scopes to <code>shopify.app.toml</code> and request access to the Subscription API in the Shopify Partner Dashboard.</p>
          </div>
        </div>
      `);
    }
    contracts = ((_e = (_d = (_c = (_b = json == null ? void 0 : json.data) == null ? void 0 : _b.customer) == null ? void 0 : _c.subscriptionContracts) == null ? void 0 : _d.edges) == null ? void 0 : _e.map((e) => e.node)) ?? [];
    contracts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("Failed to fetch subscription contracts:", err);
  }
  const badgeStyle = (status) => {
    const map = {
      active: "background:#d1fae5;color:#065f46;",
      paused: "background:#fef3c7;color:#92400e;",
      cancelled: "background:#fee2e2;color:#991b1b;",
      pending: "background:#e0e7ff;color:#3730a3;",
      failed: "background:#fee2e2;color:#991b1b;",
      expired: "background:#f3f4f6;color:#6b7280;"
    };
    return map[status == null ? void 0 : status.toLowerCase()] ?? "background:#f3f4f6;color:#374151;";
  };
  const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const fmtDateShort = (d) => new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
  let html = `
    <div style="max-width:700px;margin:40px auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:0 16px;color:#111;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <div>
          <h2 style="margin:0 0 4px;font-size:22px;font-weight:700;">My Subscriptions</h2>
          <p style="margin:0;color:#666;font-size:14px;">Manage your active donation subscriptions</p>
        </div>
        <a href="{{ routes.account_url }}" style="font-size:13px;color:#555;text-decoration:none;">← Back to Account</a>
      </div>
  `;
  if (!contracts.length) {
    html += `
      <div style="text-align:center;padding:48px 24px;border:1px dashed #ddd;border-radius:12px;color:#888;">
        <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#ccc" style="margin-bottom:12px;">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p style="margin:0;font-size:15px;">No subscriptions found.</p>
        <p style="margin:8px 0 0;font-size:13px;">Your donation subscriptions will appear here once created.</p>
      </div>
    `;
  } else {
    for (const contract of contracts) {
      const lines = ((_g = (_f = contract.lines) == null ? void 0 : _f.edges) == null ? void 0 : _g.map((e) => e.node)) ?? [];
      const subscriptionNumericId = contract.id.split("/").pop();
      const orderNumber = ((_h = contract.originOrder) == null ? void 0 : _h.name) || "N/A";
      const total = lines.reduce((sum, line) => {
        var _a3;
        return sum + parseFloat(((_a3 = line.currentPrice) == null ? void 0 : _a3.amount) ?? "0") * (line.quantity ?? 1);
      }, 0);
      const currency = contract.currencyCode ?? ((_j = (_i = lines[0]) == null ? void 0 : _i.currentPrice) == null ? void 0 : _j.currencyCode) ?? "USD";
      const nextBilling = contract.nextBillingDate ? fmtDate(contract.nextBillingDate) : "—";
      const createdAt = fmtDateShort(contract.createdAt);
      const productTitles = lines.map((l) => `${l.quantity > 1 ? l.quantity + "× " : ""}${l.title}`).join(", ");
      html += `
        <div style="border:1px solid #e5e5e5;border-radius:12px;padding:20px;margin-bottom:16px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
            <div>
              <div style="font-size:15px;font-weight:600;margin-bottom:4px;">${productTitles}</div>
              <div style="font-size:12px;color:#888;">Order ${orderNumber} • Since ${createdAt}</div>
            </div>
            <span style="display:inline-block;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;text-transform:capitalize;${badgeStyle(contract.status)}">
              ${contract.status.toLowerCase()}
            </span>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:16px;">
            <div>
              <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Amount</div>
              <div style="font-size:14px;font-weight:500;">${currency} ${total.toFixed(2)}</div>
            </div>
            <div>
              <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Next Billing</div>
              <div style="font-size:14px;font-weight:500;">${nextBilling}</div>
            </div>
          </div>
          
          <div style="margin-top:8px;padding-top:12px;border-top:1px solid #f0f0f0;">
            <a href="/apps/pos-donation/subscriptions/${subscriptionNumericId}?logged_in_customer_id=${customerId}" 
               style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:#f3f4f6;color:#374151;border-radius:8px;text-decoration:none;font-size:13px;font-weight:500;">
              View Details → 
            </a>
          </div>
        </div>
      `;
    }
  }
  html += `</div>`;
  return liquid(html);
};
const route18 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$j
}, Symbol.toStringTag, { value: "Module" }));
const loader$i = async ({
  request,
  params
}) => {
  var _a2, _b, _c, _d;
  const {
    liquid,
    admin
  } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const customerId = url.searchParams.get("logged_in_customer_id");
  const subscriptionId = params.id;
  const successMsg = url.searchParams.get("success");
  const errorMsg = url.searchParams.get("error");
  if (!customerId) {
    return liquid(`
      <div style="max-width:600px;margin:60px auto;font-family:sans-serif;text-align:center;">
        <h2>Please log in</h2>
        <a href="{{ routes.account_login_url }}">Log In</a>
      </div>
    `);
  }
  try {
    const fullGid = `gid://shopify/SubscriptionContract/${subscriptionId}`;
    const response = await admin.graphql(`#graphql
      query getSubscriptionDetails($id: ID!) {
        subscriptionContract(id: $id) {
          id
          status
          createdAt
          nextBillingDate
          currencyCode
          lines(first: 10) {
            edges {
              node {
                title
                quantity
                currentPrice {
                  amount
                  currencyCode
                }
              }
            }
          }
          originOrder {
            id
            name
          }
        }
      }`, {
      variables: {
        id: fullGid
      }
    });
    const json = await response.json();
    const contract = (_a2 = json == null ? void 0 : json.data) == null ? void 0 : _a2.subscriptionContract;
    if (!contract) {
      return liquid(`
        <div style="max-width:700px;margin:40px auto;text-align:center;">
          <h2>Subscription not found</h2>
          <a href="/apps/pos-donation/subscriptions?logged_in_customer_id=${customerId}">← Back</a>
        </div>
      `);
    }
    const lines = ((_c = (_b = contract.lines) == null ? void 0 : _b.edges) == null ? void 0 : _c.map((e) => e.node)) ?? [];
    const total = lines.reduce((sum, line) => {
      var _a3;
      return sum + parseFloat(((_a3 = line.currentPrice) == null ? void 0 : _a3.amount) ?? "0") * (line.quantity ?? 1);
    }, 0);
    const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    const productNames = lines.map((l) => l.title).join(", ");
    const orderNumber = ((_d = contract.originOrder) == null ? void 0 : _d.name) || "N/A";
    const canPause = contract.status === "ACTIVE";
    const canActivate = contract.status === "PAUSED";
    const canCancel = contract.status === "ACTIVE" || contract.status === "PAUSED";
    const html = `
      <div style="max-width:700px;margin:40px auto;font-family:sans-serif;padding:0 16px;">
        <div style="margin-bottom:20px;">
          <a href="/apps/pos-donation/subscriptions?logged_in_customer_id=${customerId}" style="color:#555;text-decoration:none;">← Back to Subscriptions</a>
        </div>

        ${successMsg ? `
          <div style="background:#d1fae5;color:#065f46;padding:12px;border-radius:8px;margin-bottom:20px;">
            ✓ ${successMsg}
          </div>
        ` : ""}
        
        ${errorMsg ? `
          <div style="background:#fee2e2;color:#991b1b;padding:12px;border-radius:8px;margin-bottom:20px;">
            ✗ ${errorMsg}
          </div>
        ` : ""}

        <div style="background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:24px;">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:20px;">
            <div>
              <h2 style="margin:0 0 8px;font-size:22px;">Subscription Details</h2>
              <p style="margin:0;color:#666;">${productNames}</p>
              <p style="margin:4px 0 0;color:#999;font-size:12px;">Order ${orderNumber}</p>
            </div>
            <span style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;background:${contract.status === "ACTIVE" ? "#d1fae5" : contract.status === "PAUSED" ? "#fef3c7" : "#fee2e2"};color:${contract.status === "ACTIVE" ? "#065f46" : contract.status === "PAUSED" ? "#92400e" : "#991b1b"}">
              ${contract.status.toLowerCase()}
            </span>
          </div>

          <div style="border-top:1px solid #eee;padding-top:16px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
              <span style="color:#666;">Amount:</span>
              <span style="font-weight:600;">${contract.currencyCode} ${total.toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
              <span style="color:#666;">Next billing:</span>
              <span>${contract.nextBillingDate ? fmtDate(contract.nextBillingDate) : "—"}</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:#666;">Started:</span>
              <span>${fmtDate(contract.createdAt)}</span>
            </div>
          </div>
        </div>

        <div style="display:flex;gap:12px;margin-top:20px;">
          ${canPause ? `
            <form method="POST" style="flex:1;">
              <input type="hidden" name="_action" value="pause">
              <button type="submit" style="width:100%;padding:12px;background:#fef3c7;color:#92400e;border:1px solid #fde68a;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
                ⏸️ Pause
              </button>
            </form>
          ` : ""}
          
          ${canActivate ? `
            <form method="POST" style="flex:1;">
              <input type="hidden" name="_action" value="activate">
              <button type="submit" style="width:100%;padding:12px;background:#d1fae5;color:#065f46;border:1px solid #a7f3d0;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
                ▶️ Resume
              </button>
            </form>
          ` : ""}
          
          ${canCancel ? `
            <form method="POST" style="flex:1;" onsubmit="return confirm('Cancel this subscription? This cannot be undone.');">
              <input type="hidden" name="_action" value="cancel">
              <button type="submit" style="width:100%;padding:12px;background:#fee2e2;color:#991b1b;border:1px solid #fecaca;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
                🗑️ Cancel
              </button>
            </form>
          ` : ""}
        </div>
      </div>
    `;
    return liquid(html);
  } catch (err) {
    console.error("Error:", err);
    return liquid(`
      <div style="max-width:700px;margin:40px auto;text-align:center;">
        <h2>Error loading subscription</h2>
        <p style="color:#666;">${err instanceof Error ? err.message : "Unknown error"}</p>
        <a href="/apps/pos-donation/subscriptions?logged_in_customer_id=${customerId}">← Back to Subscriptions</a>
      </div>
    `);
  }
};
const action$b = async ({
  request,
  params
}) => {
  const url = new URL(request.url);
  const {
    admin,
    session
  } = await authenticate.public.appProxy(request);
  const shop = (session == null ? void 0 : session.shop) || url.searchParams.get("shop");
  if (!admin) {
    return new Response("Unauthorized", {
      status: 401
    });
  }
  const customerId = url.searchParams.get("logged_in_customer_id");
  const subscriptionId = params.id;
  const formData = await request.formData();
  const actionType = formData.get("_action");
  try {
    const {
      performSubscriptionAction: performSubscriptionAction2
    } = await Promise.resolve().then(() => subscriptionActions_server);
    const result = await performSubscriptionAction2({
      admin,
      shop: shop || "",
      subscriptionId,
      actionType
    });
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/apps/pos-donation/subscriptions/${subscriptionId}?logged_in_customer_id=${customerId}&success=${encodeURIComponent(result.message)}`
      }
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to update subscription";
    console.error(`Failed to ${actionType}:`, err);
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/apps/pos-donation/subscriptions/${subscriptionId}?logged_in_customer_id=${customerId}&error=${encodeURIComponent(errorMessage)}`
      }
    });
  }
};
const route19 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$b,
  loader: loader$i
}, Symbol.toStringTag, { value: "Module" }));
function loginErrorMessage(loginErrors) {
  if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.MissingShop) {
    return { shop: "Please enter your shop domain to log in" };
  } else if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.InvalidShop) {
    return { shop: "Please enter a valid shop domain to log in" };
  }
  return {};
}
const loader$h = async ({
  request
}) => {
  const url = new URL(request.url);
  if (url.protocol === "http:" && !url.hostname.includes("localhost")) {
    url.protocol = "https:";
  }
  const secureRequest = new Request(url.toString(), request);
  console.log("Auth Login Loader Request URL (patched):", secureRequest.url);
  try {
    const {
      session
    } = await authenticate.admin(secureRequest);
    if (session) {
      console.log("Auth Login: Already authenticated for", session.shop, "Redirecting to /app");
      return redirect(`/app?shop=${session.shop}`);
    }
  } catch (error) {
  }
  const result = await login(secureRequest);
  console.log("Login helper result (loader):", JSON.stringify(result));
  const errors = loginErrorMessage(result);
  return {
    errors
  };
};
const action$a = async ({
  request
}) => {
  const url = new URL(request.url);
  if (url.protocol === "http:" && !url.hostname.includes("localhost")) {
    url.protocol = "https:";
  }
  const secureRequest = new Request(url.toString(), request);
  console.log("Auth Login Action Request URL (patched):", secureRequest.url);
  const result = await login(secureRequest);
  console.log("Login helper result (action):", JSON.stringify(result));
  const errors = loginErrorMessage(result);
  return {
    errors
  };
};
const headers$8 = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route$1 = UNSAFE_withComponentProps(function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const {
    errors
  } = actionData || loaderData || {
    errors: {}
  };
  return /* @__PURE__ */ jsx(AppProvider, {
    embedded: false,
    children: /* @__PURE__ */ jsx("s-page", {
      children: typeof window !== "undefined" && window.top !== window.self ? /* @__PURE__ */ jsxs("div", {
        style: {
          padding: "40px",
          maxWidth: "600px",
          margin: "40px auto",
          textAlign: "center",
          background: "#ffffff",
          border: "1px solid #EBEBEB",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
        },
        children: [/* @__PURE__ */ jsx("div", {
          style: {
            fontSize: "20px",
            fontWeight: "700",
            marginBottom: "12px",
            color: "#202223"
          },
          children: "Authentication Required"
        }), /* @__PURE__ */ jsx("p", {
          style: {
            fontSize: "14px",
            color: "#6D7175",
            marginBottom: "24px",
            lineHeight: "1.5"
          },
          children: "To keep your data secure, Shopify requires you to complete the login process in a separate window."
        }), /* @__PURE__ */ jsxs("form", {
          action: window.location.href,
          target: "_top",
          method: "GET",
          children: [Array.from(new URLSearchParams(window.location.search).entries()).map(([key, value]) => /* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: key,
            value
          }, key)), /* @__PURE__ */ jsx("s-button", {
            type: "submit",
            children: "Continue to Login"
          })]
        })]
      }) : /* @__PURE__ */ jsx(Form, {
        method: "post",
        children: /* @__PURE__ */ jsxs("s-section", {
          heading: "Log in",
          children: [/* @__PURE__ */ jsx("s-text-field", {
            name: "shop",
            label: "Shop domain",
            details: "example.myshopify.com",
            value: shop,
            onChange: (e) => setShop(e.currentTarget.value),
            autocomplete: "on",
            error: errors.shop
          }), /* @__PURE__ */ jsx("s-button", {
            type: "submit",
            children: "Log in"
          })]
        })
      })
    })
  });
});
const route20 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$a,
  default: route$1,
  headers: headers$8,
  loader: loader$h
}, Symbol.toStringTag, { value: "Module" }));
const index = "_index_12o3y_1";
const heading = "_heading_12o3y_11";
const text = "_text_12o3y_12";
const content = "_content_12o3y_22";
const form = "_form_12o3y_27";
const label = "_label_12o3y_35";
const input = "_input_12o3y_43";
const button = "_button_12o3y_47";
const list = "_list_12o3y_51";
const styles = {
  index,
  heading,
  text,
  content,
  form,
  label,
  input,
  button,
  list
};
const loader$g = async ({
  request
}) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  return {
    showForm: Boolean(login)
  };
};
const route = UNSAFE_withComponentProps(function App2() {
  const {
    showForm
  } = useLoaderData();
  return /* @__PURE__ */ jsx("div", {
    className: styles.index,
    children: /* @__PURE__ */ jsxs("div", {
      className: styles.content,
      children: [/* @__PURE__ */ jsx("h1", {
        className: styles.heading,
        children: "A short heading about [your app]"
      }), /* @__PURE__ */ jsx("p", {
        className: styles.text,
        children: "A tagline about [your app] that describes your value proposition."
      }), showForm && /* @__PURE__ */ jsxs(Form, {
        className: styles.form,
        method: "post",
        action: "/auth/login",
        children: [/* @__PURE__ */ jsxs("label", {
          className: styles.label,
          children: [/* @__PURE__ */ jsx("span", {
            children: "Shop domain"
          }), /* @__PURE__ */ jsx("input", {
            className: styles.input,
            type: "text",
            name: "shop"
          }), /* @__PURE__ */ jsx("span", {
            children: "e.g: my-shop-domain.myshopify.com"
          })]
        }), /* @__PURE__ */ jsx("button", {
          className: styles.button,
          type: "submit",
          children: "Log in"
        })]
      }), /* @__PURE__ */ jsxs("ul", {
        className: styles.list,
        children: [/* @__PURE__ */ jsxs("li", {
          children: [/* @__PURE__ */ jsx("strong", {
            children: "Product feature"
          }), ". Some detail about your feature and its benefit to your customer."]
        }), /* @__PURE__ */ jsxs("li", {
          children: [/* @__PURE__ */ jsx("strong", {
            children: "Product feature"
          }), ". Some detail about your feature and its benefit to your customer."]
        }), /* @__PURE__ */ jsxs("li", {
          children: [/* @__PURE__ */ jsx("strong", {
            children: "Product feature"
          }), ". Some detail about your feature and its benefit to your customer."]
        })]
      })]
    })
  });
});
const route21 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: route,
  loader: loader$g
}, Symbol.toStringTag, { value: "Module" }));
const loader$f = async ({
  request
}) => {
  const url = new URL(request.url);
  if (url.protocol === "http:" && !url.hostname.includes("localhost")) {
    url.protocol = "https:";
  }
  const secureRequest = new Request(url.toString(), request);
  await authenticate.admin(secureRequest);
  return null;
};
const headers$7 = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route22 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  headers: headers$7,
  loader: loader$f
}, Symbol.toStringTag, { value: "Module" }));
const Polaris = /* @__PURE__ */ JSON.parse('{"ActionMenu":{"Actions":{"moreActions":"More actions"},"RollupActions":{"rollupButton":"View actions"}},"ActionList":{"SearchField":{"clearButtonLabel":"Clear","search":"Search","placeholder":"Search actions"}},"Avatar":{"label":"Avatar","labelWithInitials":"Avatar with initials {initials}"},"Autocomplete":{"spinnerAccessibilityLabel":"Loading","ellipsis":"{content}…"},"Badge":{"PROGRESS_LABELS":{"incomplete":"Incomplete","partiallyComplete":"Partially complete","complete":"Complete"},"TONE_LABELS":{"info":"Info","success":"Success","warning":"Warning","critical":"Critical","attention":"Attention","new":"New","readOnly":"Read-only","enabled":"Enabled"},"progressAndTone":"{toneLabel} {progressLabel}"},"Banner":{"dismissButton":"Dismiss notification"},"Button":{"spinnerAccessibilityLabel":"Loading"},"Common":{"checkbox":"checkbox","undo":"Undo","cancel":"Cancel","clear":"Clear","close":"Close","submit":"Submit","more":"More"},"ContextualSaveBar":{"save":"Save","discard":"Discard"},"DataTable":{"sortAccessibilityLabel":"sort {direction} by","navAccessibilityLabel":"Scroll table {direction} one column","totalsRowHeading":"Totals","totalRowHeading":"Total"},"DatePicker":{"previousMonth":"Show previous month, {previousMonthName} {showPreviousYear}","nextMonth":"Show next month, {nextMonth} {nextYear}","today":"Today ","start":"Start of range","end":"End of range","months":{"january":"January","february":"February","march":"March","april":"April","may":"May","june":"June","july":"July","august":"August","september":"September","october":"October","november":"November","december":"December"},"days":{"monday":"Monday","tuesday":"Tuesday","wednesday":"Wednesday","thursday":"Thursday","friday":"Friday","saturday":"Saturday","sunday":"Sunday"},"daysAbbreviated":{"monday":"Mo","tuesday":"Tu","wednesday":"We","thursday":"Th","friday":"Fr","saturday":"Sa","sunday":"Su"}},"DiscardConfirmationModal":{"title":"Discard all unsaved changes","message":"If you discard changes, you’ll delete any edits you made since you last saved.","primaryAction":"Discard changes","secondaryAction":"Continue editing"},"DropZone":{"single":{"overlayTextFile":"Drop file to upload","overlayTextImage":"Drop image to upload","overlayTextVideo":"Drop video to upload","actionTitleFile":"Add file","actionTitleImage":"Add image","actionTitleVideo":"Add video","actionHintFile":"or drop file to upload","actionHintImage":"or drop image to upload","actionHintVideo":"or drop video to upload","labelFile":"Upload file","labelImage":"Upload image","labelVideo":"Upload video"},"allowMultiple":{"overlayTextFile":"Drop files to upload","overlayTextImage":"Drop images to upload","overlayTextVideo":"Drop videos to upload","actionTitleFile":"Add files","actionTitleImage":"Add images","actionTitleVideo":"Add videos","actionHintFile":"or drop files to upload","actionHintImage":"or drop images to upload","actionHintVideo":"or drop videos to upload","labelFile":"Upload files","labelImage":"Upload images","labelVideo":"Upload videos"},"errorOverlayTextFile":"File type is not valid","errorOverlayTextImage":"Image type is not valid","errorOverlayTextVideo":"Video type is not valid"},"EmptySearchResult":{"altText":"Empty search results"},"Frame":{"skipToContent":"Skip to content","navigationLabel":"Navigation","Navigation":{"closeMobileNavigationLabel":"Close navigation"}},"FullscreenBar":{"back":"Back","accessibilityLabel":"Exit fullscreen mode"},"Filters":{"moreFilters":"More filters","moreFiltersWithCount":"More filters ({count})","filter":"Filter {resourceName}","noFiltersApplied":"No filters applied","cancel":"Cancel","done":"Done","clearAllFilters":"Clear all filters","clear":"Clear","clearLabel":"Clear {filterName}","addFilter":"Add filter","clearFilters":"Clear all","searchInView":"in:{viewName}"},"FilterPill":{"clear":"Clear","unsavedChanges":"Unsaved changes - {label}"},"IndexFilters":{"searchFilterTooltip":"Search and filter","searchFilterTooltipWithShortcut":"Search and filter (F)","searchFilterAccessibilityLabel":"Search and filter results","sort":"Sort your results","addView":"Add a new view","newView":"Custom search","SortButton":{"ariaLabel":"Sort the results","tooltip":"Sort","title":"Sort by","sorting":{"asc":"Ascending","desc":"Descending","az":"A-Z","za":"Z-A"}},"EditColumnsButton":{"tooltip":"Edit columns","accessibilityLabel":"Customize table column order and visibility"},"UpdateButtons":{"cancel":"Cancel","update":"Update","save":"Save","saveAs":"Save as","modal":{"title":"Save view as","label":"Name","sameName":"A view with this name already exists. Please choose a different name.","save":"Save","cancel":"Cancel"}}},"IndexProvider":{"defaultItemSingular":"Item","defaultItemPlural":"Items","allItemsSelected":"All {itemsLength}+ {resourceNamePlural} are selected","selected":"{selectedItemsCount} selected","a11yCheckboxDeselectAllSingle":"Deselect {resourceNameSingular}","a11yCheckboxSelectAllSingle":"Select {resourceNameSingular}","a11yCheckboxDeselectAllMultiple":"Deselect all {itemsLength} {resourceNamePlural}","a11yCheckboxSelectAllMultiple":"Select all {itemsLength} {resourceNamePlural}"},"IndexTable":{"emptySearchTitle":"No {resourceNamePlural} found","emptySearchDescription":"Try changing the filters or search term","onboardingBadgeText":"New","resourceLoadingAccessibilityLabel":"Loading {resourceNamePlural}…","selectAllLabel":"Select all {resourceNamePlural}","selected":"{selectedItemsCount} selected","undo":"Undo","selectAllItems":"Select all {itemsLength}+ {resourceNamePlural}","selectItem":"Select {resourceName}","selectButtonText":"Select","sortAccessibilityLabel":"sort {direction} by"},"Loading":{"label":"Page loading bar"},"Modal":{"iFrameTitle":"body markup","modalWarning":"These required properties are missing from Modal: {missingProps}"},"Page":{"Header":{"rollupActionsLabel":"View actions for {title}","pageReadyAccessibilityLabel":"{title}. This page is ready"}},"Pagination":{"previous":"Previous","next":"Next","pagination":"Pagination"},"ProgressBar":{"negativeWarningMessage":"Values passed to the progress prop shouldn’t be negative. Resetting {progress} to 0.","exceedWarningMessage":"Values passed to the progress prop shouldn’t exceed 100. Setting {progress} to 100."},"ResourceList":{"sortingLabel":"Sort by","defaultItemSingular":"item","defaultItemPlural":"items","showing":"Showing {itemsCount} {resource}","showingTotalCount":"Showing {itemsCount} of {totalItemsCount} {resource}","loading":"Loading {resource}","selected":"{selectedItemsCount} selected","allItemsSelected":"All {itemsLength}+ {resourceNamePlural} in your store are selected","allFilteredItemsSelected":"All {itemsLength}+ {resourceNamePlural} in this filter are selected","selectAllItems":"Select all {itemsLength}+ {resourceNamePlural} in your store","selectAllFilteredItems":"Select all {itemsLength}+ {resourceNamePlural} in this filter","emptySearchResultTitle":"No {resourceNamePlural} found","emptySearchResultDescription":"Try changing the filters or search term","selectButtonText":"Select","a11yCheckboxDeselectAllSingle":"Deselect {resourceNameSingular}","a11yCheckboxSelectAllSingle":"Select {resourceNameSingular}","a11yCheckboxDeselectAllMultiple":"Deselect all {itemsLength} {resourceNamePlural}","a11yCheckboxSelectAllMultiple":"Select all {itemsLength} {resourceNamePlural}","Item":{"actionsDropdownLabel":"Actions for {accessibilityLabel}","actionsDropdown":"Actions dropdown","viewItem":"View details for {itemName}"},"BulkActions":{"actionsActivatorLabel":"Actions","moreActionsActivatorLabel":"More actions"}},"SkeletonPage":{"loadingLabel":"Page loading"},"Tabs":{"newViewAccessibilityLabel":"Create new view","newViewTooltip":"Create view","toggleTabsLabel":"More views","Tab":{"rename":"Rename view","duplicate":"Duplicate view","edit":"Edit view","editColumns":"Edit columns","delete":"Delete view","copy":"Copy of {name}","deleteModal":{"title":"Delete view?","description":"This can’t be undone. {viewName} view will no longer be available in your admin.","cancel":"Cancel","delete":"Delete view"}},"RenameModal":{"title":"Rename view","label":"Name","cancel":"Cancel","create":"Save","errors":{"sameName":"A view with this name already exists. Please choose a different name."}},"DuplicateModal":{"title":"Duplicate view","label":"Name","cancel":"Cancel","create":"Create view","errors":{"sameName":"A view with this name already exists. Please choose a different name."}},"CreateViewModal":{"title":"Create new view","label":"Name","cancel":"Cancel","create":"Create view","errors":{"sameName":"A view with this name already exists. Please choose a different name."}}},"Tag":{"ariaLabel":"Remove {children}"},"TextField":{"characterCount":"{count} characters","characterCountWithMaxLength":"{count} of {limit} characters used"},"TooltipOverlay":{"accessibilityLabel":"Tooltip: {label}"},"TopBar":{"toggleMenuLabel":"Toggle menu","SearchField":{"clearButtonLabel":"Clear","search":"Search"}},"MediaCard":{"dismissButton":"Dismiss","popoverButton":"Actions"},"VideoThumbnail":{"playButtonA11yLabel":{"default":"Play video","defaultWithDuration":"Play video of length {duration}","duration":{"hours":{"other":{"only":"{hourCount} hours","andMinutes":"{hourCount} hours and {minuteCount} minutes","andMinute":"{hourCount} hours and {minuteCount} minute","minutesAndSeconds":"{hourCount} hours, {minuteCount} minutes, and {secondCount} seconds","minutesAndSecond":"{hourCount} hours, {minuteCount} minutes, and {secondCount} second","minuteAndSeconds":"{hourCount} hours, {minuteCount} minute, and {secondCount} seconds","minuteAndSecond":"{hourCount} hours, {minuteCount} minute, and {secondCount} second","andSeconds":"{hourCount} hours and {secondCount} seconds","andSecond":"{hourCount} hours and {secondCount} second"},"one":{"only":"{hourCount} hour","andMinutes":"{hourCount} hour and {minuteCount} minutes","andMinute":"{hourCount} hour and {minuteCount} minute","minutesAndSeconds":"{hourCount} hour, {minuteCount} minutes, and {secondCount} seconds","minutesAndSecond":"{hourCount} hour, {minuteCount} minutes, and {secondCount} second","minuteAndSeconds":"{hourCount} hour, {minuteCount} minute, and {secondCount} seconds","minuteAndSecond":"{hourCount} hour, {minuteCount} minute, and {secondCount} second","andSeconds":"{hourCount} hour and {secondCount} seconds","andSecond":"{hourCount} hour and {secondCount} second"}},"minutes":{"other":{"only":"{minuteCount} minutes","andSeconds":"{minuteCount} minutes and {secondCount} seconds","andSecond":"{minuteCount} minutes and {secondCount} second"},"one":{"only":"{minuteCount} minute","andSeconds":"{minuteCount} minute and {secondCount} seconds","andSecond":"{minuteCount} minute and {secondCount} second"}},"seconds":{"other":"{secondCount} seconds","one":"{secondCount} second"}}}}}');
const polarisTranslations = {
  Polaris
};
const polarisStyles = "/assets/styles-x1cbIzLV.css";
const links = () => [{
  rel: "stylesheet",
  href: polarisStyles
}];
const loader$e = async ({
  request
}) => {
  const {
    session
  } = await authenticate.admin(request);
  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    shop: (session == null ? void 0 : session.shop) || ""
  };
};
const app = UNSAFE_withComponentProps(function App3() {
  const {
    apiKey,
    shop
  } = useLoaderData();
  return /* @__PURE__ */ jsx(AppProvider, {
    embedded: true,
    apiKey,
    children: /* @__PURE__ */ jsxs(AppProvider$1, {
      i18n: polarisTranslations,
      children: [/* @__PURE__ */ jsxs("ui-nav-menu", {
        children: [/* @__PURE__ */ jsx(Link, {
          rel: "home",
          to: "/app",
          children: "Home"
        }), /* @__PURE__ */ jsx(Link, {
          to: "/app/preset-donation",
          children: "Donation Preferences"
        }), /* @__PURE__ */ jsx(Link, {
          to: "/app/roundup",
          children: "Round Up Donation"
        }), /* @__PURE__ */ jsx(Link, {
          to: "/app/pos-donation",
          children: "Portion of Sale"
        }), /* @__PURE__ */ jsx(Link, {
          to: "/app/email-settings",
          children: "Email Settings"
        }), /* @__PURE__ */ jsx(Link, {
          to: "/app/donation-activity",
          children: "Donation Activity"
        }), /* @__PURE__ */ jsx(Link, {
          to: "/app/track-donation",
          children: "Track Donation"
        }), /* @__PURE__ */ jsx(Link, {
          to: "/app/recurring-subscriptions",
          children: "Subscription Management"
        }), /* @__PURE__ */ jsx(Link, {
          to: "/app/pricing",
          children: "Pricing Plans"
        }), /* @__PURE__ */ jsx(Link, {
          to: "/app/help",
          children: "Help"
        })]
      }), /* @__PURE__ */ jsx(Outlet, {})]
    })
  });
});
const headers$6 = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const ErrorBoundary = UNSAFE_withErrorBoundaryProps(function ErrorBoundary2() {
  return boundary.error(useRouteError());
});
const route23 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  default: app,
  headers: headers$6,
  links,
  loader: loader$e
}, Symbol.toStringTag, { value: "Module" }));
const action$9 = async ({
  request,
  params
}) => {
  var _a2, _b, _c;
  const {
    admin
  } = await authenticate.admin(request);
  const id = params.id;
  if (!id) {
    return data({
      error: "Missing ID"
    }, {
      status: 400
    });
  }
  const campaign = await prisma.campaign.findUnique({
    where: {
      id
    }
  });
  if (!campaign) {
    return data({
      error: "Campaign not found"
    }, {
      status: 404
    });
  }
  if (campaign.shopifyProductId) {
    try {
      const response = await admin.graphql(`#graphql
        mutation productDelete($input: ProductDeleteInput!) {
          productDelete(input: $input) {
            deletedProductId
            userErrors {
              field
              message
            }
          }
        }`, {
        variables: {
          input: {
            id: campaign.shopifyProductId
          }
        }
      });
      const json = await response.json();
      if (((_c = (_b = (_a2 = json.data) == null ? void 0 : _a2.productDelete) == null ? void 0 : _b.userErrors) == null ? void 0 : _c.length) > 0) {
        console.error("Failed to delete product from Shopify:", json.data.productDelete.userErrors);
      }
    } catch (e) {
      console.error("Error communicating with Shopify Admin API:", e);
    }
  }
  await prisma.campaign.delete({
    where: {
      id
    }
  });
  return data({
    success: true
  });
};
const route24 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$9
}, Symbol.toStringTag, { value: "Module" }));
async function setupSellingPlans(admin, shop, productId, retryCount = 0) {
  var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
  const PRODUCT_GID = productId.startsWith("gid://") ? productId : `gid://shopify/Product/${productId}`;
  const existingConfig = await prisma.recurringDonationConfig.findUnique({
    where: { shop }
  });
  let sellingPlanGroupId = existingConfig == null ? void 0 : existingConfig.sellingPlanGroupId;
  let monthlyPlanId = existingConfig == null ? void 0 : existingConfig.monthlyPlanId;
  let weeklyPlanId = existingConfig == null ? void 0 : existingConfig.weeklyPlanId;
  const productResponse = await admin.graphql(
    `#graphql
        query getProductVariants($id: ID!) {
            product(id: $id) {
                id
                title
                variants(first: 50) {
                    edges {
                        node {
                            id
                        }
                    }
                }
            }
        }`,
    { variables: { id: PRODUCT_GID } }
  );
  const productData = await productResponse.json();
  const product = (_a2 = productData.data) == null ? void 0 : _a2.product;
  if (!product) {
    throw new Error(`Donation product not found for ID: ${PRODUCT_GID}`);
  }
  const variantIds = product.variants.edges.map((e) => e.node.id);
  if (!sellingPlanGroupId) {
    console.log(`[Recurring] No selling plan group found for ${shop}, creating one...`);
    const createGroupResponse = await admin.graphql(
      `#graphql
            mutation sellingPlanGroupCreate($input: SellingPlanGroupInput!) {
                sellingPlanGroupCreate(input: $input) {
                    sellingPlanGroup {
                        id
                        name
                        sellingPlans(first: 10) {
                            edges {
                                node {
                                    id
                                    name
                                }
                            }
                        }
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }`,
      {
        variables: {
          input: {
            name: "Recurring Donations",
            merchantCode: "recurring-donations",
            options: ["Frequency"],
            position: 1,
            sellingPlansToCreate: [
              {
                name: "Monthly Donation",
                options: ["Monthly"],
                position: 1,
                category: "SUBSCRIPTION",
                billingPolicy: {
                  recurring: {
                    interval: "MONTH",
                    intervalCount: 1
                  }
                },
                deliveryPolicy: {
                  recurring: {
                    interval: "MONTH",
                    intervalCount: 1
                  }
                },
                pricingPolicies: [
                  {
                    fixed: {
                      adjustmentType: "PERCENTAGE",
                      adjustmentValue: { percentage: 0 }
                    }
                  }
                ]
              },
              {
                name: "Weekly Donation",
                options: ["Weekly"],
                position: 2,
                category: "SUBSCRIPTION",
                billingPolicy: {
                  recurring: {
                    interval: "WEEK",
                    intervalCount: 1
                  }
                },
                deliveryPolicy: {
                  recurring: {
                    interval: "WEEK",
                    intervalCount: 1
                  }
                },
                pricingPolicies: [
                  {
                    fixed: {
                      adjustmentType: "PERCENTAGE",
                      adjustmentValue: { percentage: 0 }
                    }
                  }
                ]
              }
            ]
          }
        }
      }
    );
    const createGroupData = await createGroupResponse.json();
    const userErrors = ((_c = (_b = createGroupData.data) == null ? void 0 : _b.sellingPlanGroupCreate) == null ? void 0 : _c.userErrors) || [];
    if (userErrors.length > 0) {
      throw new Error(userErrors.map((e) => e.message).join(", "));
    }
    const group = (_e = (_d = createGroupData.data) == null ? void 0 : _d.sellingPlanGroupCreate) == null ? void 0 : _e.sellingPlanGroup;
    sellingPlanGroupId = group.id;
    const plans = group.sellingPlans.edges.map((e) => e.node);
    monthlyPlanId = ((_f = plans.find((p) => p.name.toLowerCase().includes("monthly"))) == null ? void 0 : _f.id) || null;
    weeklyPlanId = ((_g = plans.find((p) => p.name.toLowerCase().includes("weekly"))) == null ? void 0 : _g.id) || null;
  }
  const attachResponse = await admin.graphql(
    `#graphql
        mutation sellingPlanGroupAddProducts($id: ID!, $productIds: [ID!]!) {
            sellingPlanGroupAddProducts(id: $id, productIds: $productIds) {
                sellingPlanGroup { id }
                userErrors { field message }
            }
        }`,
    {
      variables: {
        id: sellingPlanGroupId,
        productIds: [PRODUCT_GID]
      }
    }
  );
  const attachData = await attachResponse.json();
  const attachErrors = ((_i = (_h = attachData.data) == null ? void 0 : _h.sellingPlanGroupAddProducts) == null ? void 0 : _i.userErrors) || [];
  if (attachErrors.some((e) => e.message.includes("does not exist")) && retryCount < 1) {
    console.warn(`[Recurring] Group ${sellingPlanGroupId} does not exist in Shopify. Clearing from DB and retrying...`);
    await prisma.recurringDonationConfig.update({
      where: { shop },
      data: { sellingPlanGroupId: null, monthlyPlanId: null, weeklyPlanId: null }
    });
    return setupSellingPlans(admin, shop, productId, retryCount + 1);
  }
  if (attachErrors.length > 0) {
    console.warn("sellingPlanGroupAddProducts warnings:", attachErrors);
  }
  if (variantIds.length > 0 && sellingPlanGroupId) {
    const attachVariantsResponse = await admin.graphql(
      `#graphql
            mutation sellingPlanGroupAddProductVariants($id: ID!, $productVariantIds: [ID!]!) {
                sellingPlanGroupAddProductVariants(id: $id, productVariantIds: $productVariantIds) {
                    sellingPlanGroup { id }
                    userErrors { field message }
                }
            }`,
      {
        variables: {
          id: sellingPlanGroupId,
          productVariantIds: variantIds
        }
      }
    );
    const attachVariantsData = await attachVariantsResponse.json();
    const variantErrors = ((_k = (_j = attachVariantsData.data) == null ? void 0 : _j.sellingPlanGroupAddProductVariants) == null ? void 0 : _k.userErrors) || [];
    if (variantErrors.length > 0) {
      console.warn("sellingPlanGroupAddProductVariants warnings:", variantErrors);
    }
  }
  await prisma.recurringDonationConfig.upsert({
    where: { shop },
    update: {
      sellingPlanGroupId,
      monthlyPlanId,
      weeklyPlanId,
      isActive: true,
      productGid: PRODUCT_GID,
      productId: PRODUCT_GID.split("/").pop()
    },
    create: {
      shop,
      productId: PRODUCT_GID.split("/").pop(),
      productGid: PRODUCT_GID,
      sellingPlanGroupId,
      monthlyPlanId,
      weeklyPlanId,
      isActive: true
    }
  });
  console.log(`[Recurring] Setup complete for ${shop}. Group: ${sellingPlanGroupId}`);
  return {
    sellingPlanGroupId,
    monthlyPlanId,
    weeklyPlanId,
    variantCount: variantIds.length
  };
}
function CampaignPreview({ formData }) {
  const renderDonationOptions = () => {
    const amounts = formData.donationAmounts;
    switch (formData.displayStyle) {
      case "tabs":
        return /* @__PURE__ */ jsxs("div", { className: "preview-tabs", children: [
          amounts.map((amount, index2) => /* @__PURE__ */ jsxs(
            "button",
            {
              className: `preview-tab ${index2 === 0 ? "active" : ""}`,
              children: [
                "$",
                amount
              ]
            },
            amount
          )),
          formData.allowOtherAmount && /* @__PURE__ */ jsx("button", { className: "preview-tab", children: formData.otherAmountTitle })
        ] });
      case "dropdown":
        return /* @__PURE__ */ jsxs("select", { className: "preview-dropdown", children: [
          /* @__PURE__ */ jsx("option", { value: "", children: "Select amount" }),
          amounts.map((amount) => /* @__PURE__ */ jsxs("option", { value: amount, children: [
            "$",
            amount
          ] }, amount)),
          formData.allowOtherAmount && /* @__PURE__ */ jsx("option", { value: "other", children: formData.otherAmountTitle })
        ] });
      case "radio_button":
        return /* @__PURE__ */ jsxs("div", { className: "preview-radio-group", children: [
          amounts.map((amount) => /* @__PURE__ */ jsxs("label", { className: "preview-radio-label", children: [
            /* @__PURE__ */ jsx("input", { type: "radio", name: "donation", value: amount }),
            /* @__PURE__ */ jsxs("span", { children: [
              "$",
              amount
            ] })
          ] }, amount)),
          formData.allowOtherAmount && /* @__PURE__ */ jsxs("label", { className: "preview-radio-label", children: [
            /* @__PURE__ */ jsx("input", { type: "radio", name: "donation", value: "other" }),
            /* @__PURE__ */ jsx("span", { children: formData.otherAmountTitle })
          ] })
        ] });
      case "price_bar":
        return /* @__PURE__ */ jsxs("div", { className: "preview-price-bar", children: [
          amounts.map((amount) => /* @__PURE__ */ jsxs("button", { className: "preview-price-btn", children: [
            "$",
            amount
          ] }, amount)),
          formData.allowOtherAmount && /* @__PURE__ */ jsx("button", { className: "preview-price-btn", children: formData.otherAmountTitle })
        ] });
      case "text_box":
        return /* @__PURE__ */ jsx("div", { className: "preview-text-box", children: /* @__PURE__ */ jsx(
          "input",
          {
            type: "number",
            placeholder: "Enter amount",
            className: "preview-input"
          }
        ) });
      default:
        return null;
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "campaign-preview", children: [
    /* @__PURE__ */ jsxs(
      "s-box",
      {
        padding: "base",
        borderWidth: "base",
        borderRadius: "base",
        background: "subdued",
        children: [
          /* @__PURE__ */ jsx("s-paragraph", { children: /* @__PURE__ */ jsx("strong", { children: "Live Preview" }) }),
          /* @__PURE__ */ jsx("s-divider", {}),
          /* @__PURE__ */ jsxs("s-stack", { direction: "block", gap: "base", children: [
            /* @__PURE__ */ jsx("div", { style: { overflowWrap: "break-word", wordBreak: "break-word" }, children: /* @__PURE__ */ jsx("s-heading", { children: formData.name || "Campaign Title" }) }),
            formData.imageUrl ? /* @__PURE__ */ jsx(
              "img",
              {
                src: formData.imageUrl,
                alt: "Campaign",
                className: "preview-image"
              }
            ) : /* @__PURE__ */ jsx("div", { className: "preview-image-placeholder", children: "No Image" }),
            /* @__PURE__ */ jsx("div", { style: { overflowWrap: "break-word", wordBreak: "break-word" }, children: /* @__PURE__ */ jsx("s-paragraph", { children: formData.description || "Campaign description will appear here..." }) }),
            /* @__PURE__ */ jsx("s-divider", {}),
            /* @__PURE__ */ jsx("s-paragraph", { children: /* @__PURE__ */ jsx("strong", { children: "Select Donation Amount:" }) }),
            renderDonationOptions(),
            /* @__PURE__ */ jsx("s-button", { variant: "primary", disabled: true, children: "Donate" }),
            /* @__PURE__ */ jsx("s-paragraph", { children: /* @__PURE__ */ jsx("s-text", { tone: "neutral", children: "Thank you for your support!" }) })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsx("style", { children: `
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
      ` })
  ] });
}
function AddCampaign({
  formData,
  onFormChange
}) {
  const [newAmount, setNewAmount] = useState("");
  const fileInputRef = useRef(null);
  const choiceListRef = useRef(null);
  useEffect(() => {
    const el = choiceListRef.current;
    if (!el) return;
    const handleChange = (e) => {
      var _a2, _b, _c, _d, _e, _f;
      const val = ((_b = (_a2 = e.detail) == null ? void 0 : _a2.selected) == null ? void 0 : _b[0]) || ((_c = e.detail) == null ? void 0 : _c.value) || ((_d = e.target) == null ? void 0 : _d.value) || ((_f = (_e = e.target) == null ? void 0 : _e.values) == null ? void 0 : _f[0]);
      if (val) onFormChange({ displayStyle: String(val) });
    };
    el.addEventListener("change", handleChange);
    el.addEventListener("input", handleChange);
    return () => {
      el.removeEventListener("change", handleChange);
      el.removeEventListener("input", handleChange);
    };
  }, [onFormChange]);
  const handleFileChange = (e) => {
    var _a2;
    const file = (_a2 = e.target.files) == null ? void 0 : _a2[0];
    console.log("[AddCampaign] File selected:", file == null ? void 0 : file.name, file == null ? void 0 : file.size);
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        var _a3;
        const base64 = (_a3 = event.target) == null ? void 0 : _a3.result;
        console.log(
          "[AddCampaign] File read to base64, length:",
          base64.length
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
        donationAmounts: [...formData.donationAmounts, newAmount]
      });
      setNewAmount("");
    }
  };
  const removeDonationAmount = (amount) => {
    onFormChange({
      donationAmounts: formData.donationAmounts.filter((a) => a !== amount)
    });
  };
  return /* @__PURE__ */ jsxs("s-grid", { gridTemplateColumns: "repeat(12, 1fr)", gap: "base", children: [
    /* @__PURE__ */ jsx("s-grid-item", { gridColumn: "span 8", children: /* @__PURE__ */ jsxs("s-stack", { gap: "base", children: [
      /* @__PURE__ */ jsxs("s-section", { children: [
        /* @__PURE__ */ jsx("s-heading", { children: "Campaign Status" }),
        /* @__PURE__ */ jsx("s-badge", { tone: formData.enabled ? "success" : "caution", children: formData.enabled ? "Enabled" : "Disabled" }),
        /* @__PURE__ */ jsx("s-paragraph", { children: "Enable or disable the Campaign" }),
        /* @__PURE__ */ jsx(
          "s-button",
          {
            onClick: () => onFormChange({ enabled: !formData.enabled }),
            children: formData.enabled ? "Disable" : "Enable"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("s-section", { children: [
        /* @__PURE__ */ jsx(
          "s-text-field",
          {
            label: "Donation campaign title",
            value: formData.name,
            onChange: (e) => onFormChange({ name: e.currentTarget.value }),
            autocomplete: "off",
            placeholder: "Donation for better society"
          }
        ),
        /* @__PURE__ */ jsx(
          "s-text-area",
          {
            label: "Donation Description",
            value: formData.description,
            onChange: (e) => onFormChange({ description: e.currentTarget.value }),
            autocomplete: "off",
            placeholder: "Your donation contributes to a better society and makes a significant impact in the world.",
            rows: 3
          }
        ),
        /* @__PURE__ */ jsx(
          "input",
          {
            ref: fileInputRef,
            type: "file",
            accept: "image/*",
            style: { display: "none" },
            onChange: handleFileChange
          }
        ),
        /* @__PURE__ */ jsx("div", { style: { marginBottom: "12px" }, children: /* @__PURE__ */ jsxs("s-stack", { direction: "inline", gap: "base", children: [
          /* @__PURE__ */ jsx(
            "s-button",
            {
              variant: "primary",
              onClick: () => {
                var _a2;
                return (_a2 = fileInputRef.current) == null ? void 0 : _a2.click();
              },
              children: formData.imageUrl ? "Change Image" : "Upload Image"
            }
          ),
          formData.imageUrl && /* @__PURE__ */ jsx(
            "s-button",
            {
              variant: "secondary",
              onClick: () => onFormChange({ imageUrl: "" }),
              children: "Remove"
            }
          )
        ] }) }),
        formData.imageUrl && /* @__PURE__ */ jsx(
          "div",
          {
            style: {
              position: "relative",
              display: "inline-block",
              width: "100%"
            },
            children: /* @__PURE__ */ jsx(
              "img",
              {
                src: formData.imageUrl,
                alt: "Campaign",
                style: {
                  width: "100%",
                  maxHeight: "200px",
                  objectFit: "cover",
                  borderRadius: "8px",
                  marginTop: "8px"
                }
              }
            )
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("s-section", { children: [
        /* @__PURE__ */ jsx("s-heading", { children: "Donation Amount Settings" }),
        /* @__PURE__ */ jsxs(
          "s-choice-list",
          {
            ref: choiceListRef,
            label: "Select the display style for the donation amount",
            values: [formData.displayStyle],
            children: [
              /* @__PURE__ */ jsx("s-choice", { value: "tabs", selected: formData.displayStyle === "tabs", children: "Tabs" }),
              /* @__PURE__ */ jsx("s-choice", { value: "dropdown", selected: formData.displayStyle === "dropdown", children: "Dropdown" }),
              /* @__PURE__ */ jsx("s-choice", { value: "radio_button", selected: formData.displayStyle === "radio_button", children: "Radio Button" }),
              /* @__PURE__ */ jsx("s-choice", { value: "price_bar", selected: formData.displayStyle === "price_bar", children: "Price Bar" }),
              /* @__PURE__ */ jsx("s-choice", { value: "text_box", selected: formData.displayStyle === "text_box", children: "Text Box" })
            ]
          }
        ),
        /* @__PURE__ */ jsxs("s-stack", { direction: "block", gap: "base", children: [
          /* @__PURE__ */ jsx("s-paragraph", { children: "Donation amounts:" }),
          /* @__PURE__ */ jsx("s-stack", { direction: "inline", gap: "base", children: formData.donationAmounts.map((amount) => /* @__PURE__ */ jsxs(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                background: "#E7F0FF",
                color: "#2C6ECB",
                padding: "6px 12px",
                borderRadius: "20px",
                gap: "8px",
                border: "1px solid #D1E1FF",
                fontSize: "14px",
                fontWeight: 600
              },
              children: [
                /* @__PURE__ */ jsxs("span", { children: [
                  "$",
                  amount
                ] }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => removeDonationAmount(amount),
                    style: {
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
                      transition: "background 0.2s"
                    },
                    onMouseOver: (e) => e.currentTarget.style.background = "rgba(44, 110, 203, 0.2)",
                    onMouseOut: (e) => e.currentTarget.style.background = "rgba(44, 110, 203, 0.1)",
                    children: /* @__PURE__ */ jsx("svg", { viewBox: "0 0 20 20", style: { width: "12px", fill: "currentColor" }, children: /* @__PURE__ */ jsx("path", { d: "M13.97 15.03a.75.75 0 1 0 1.06-1.06l-3.97-3.97 3.97-3.97a.75.75 0 0 0-1.06-1.06l-3.97 3.97-3.97-3.97a.75.75 0 0 0-1.06 1.06l3.97 3.97-3.97 3.97a.75.75 0 1 0 1.06 1.06l3.97-3.97 3.97 3.97Z" }) })
                  }
                )
              ]
            },
            amount
          )) }),
          /* @__PURE__ */ jsxs("s-stack", { direction: "inline", gap: "base", children: [
            /* @__PURE__ */ jsx(
              "s-text-field",
              {
                label: "Add amount",
                value: newAmount,
                onChange: (e) => setNewAmount(e.currentTarget.value || ""),
                autocomplete: "off",
                placeholder: "e.g. 50"
              }
            ),
            /* @__PURE__ */ jsx("s-button", { variant: "primary", onClick: addDonationAmount, children: "+ Add Amount" })
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          "s-checkbox",
          {
            checked: formData.allowOtherAmount,
            onChange: (e) => onFormChange({
              allowOtherAmount: e.target.checked
            }),
            label: "Allow donors to enter a custom donation amount"
          }
        ),
        formData.allowOtherAmount && /* @__PURE__ */ jsx(
          "s-text-field",
          {
            label: "Title for the 'Other Amount' field",
            value: formData.otherAmountTitle,
            onChange: (e) => onFormChange({ otherAmountTitle: e.currentTarget.value }),
            autocomplete: "off",
            placeholder: "Other"
          }
        ),
        /* @__PURE__ */ jsx(
          "s-checkbox",
          {
            checked: formData.isRecurringEnabled,
            onChange: (e) => onFormChange({
              isRecurringEnabled: e.target.checked
            }),
            label: "Enable Recurring Donation"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("s-grid-item", { gridColumn: "span 4", children: /* @__PURE__ */ jsx(CampaignPreview, { formData }) })
  ] });
}
async function replaceProductImage(admin, productId, base64DataUrl) {
  var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s;
  try {
    const mediaQueryRes = await admin.graphql(`#graphql
      query getProductMedia($id: ID!) {
        product(id: $id) {
          media(first: 20) {
            edges { node { id } }
          }
        }
      }`, {
      variables: {
        id: productId
      }
    });
    const mediaQueryJson = await mediaQueryRes.json();
    const existingMediaIds = ((_d = (_c = (_b = (_a2 = mediaQueryJson.data) == null ? void 0 : _a2.product) == null ? void 0 : _b.media) == null ? void 0 : _c.edges) == null ? void 0 : _d.map((e) => e.node.id)) ?? [];
    console.log(`Found ${existingMediaIds.length} existing media item(s) on product ${productId}.`);
    if (existingMediaIds.length > 0) {
      const deleteRes = await admin.graphql(`#graphql
        mutation productDeleteMedia($productId: ID!, $mediaIds: [ID!]!) {
          productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
            deletedMediaIds
            product { id }
            mediaUserErrors { field message }
          }
        }`, {
        variables: {
          productId,
          mediaIds: existingMediaIds
        }
      });
      const deleteJson = await deleteRes.json();
      const deleteErrors = ((_f = (_e = deleteJson.data) == null ? void 0 : _e.productDeleteMedia) == null ? void 0 : _f.mediaUserErrors) ?? [];
      if (deleteErrors.length > 0) {
        console.warn("productDeleteMedia errors (non-fatal):", deleteErrors);
      } else {
        console.log(`Deleted ${existingMediaIds.length} old media item(s) from product.`);
      }
    }
    const match = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      console.warn("Image replace skipped: invalid data URL format.");
      return null;
    }
    const mimeType = match[1];
    const base64Data = match[2];
    const imageBuffer = Buffer.from(base64Data, "base64");
    const fileSize = imageBuffer.byteLength;
    const fileName = `campaign-image.${mimeType.split("/")[1] || "jpg"}`;
    console.log(`Uploading new image: ${fileName} (${fileSize} bytes, ${mimeType})`);
    const stageRes = await admin.graphql(`#graphql
      mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets {
            url
            resourceUrl
            parameters { name value }
          }
          userErrors { field message }
        }
      }`, {
      variables: {
        input: [{
          resource: "PRODUCT_IMAGE",
          filename: fileName,
          mimeType,
          fileSize: String(fileSize),
          httpMethod: "POST"
        }]
      }
    });
    const stageJson = await stageRes.json();
    const stageErrors = ((_h = (_g = stageJson.data) == null ? void 0 : _g.stagedUploadsCreate) == null ? void 0 : _h.userErrors) ?? [];
    if (stageErrors.length > 0 || !((_k = (_j = (_i = stageJson.data) == null ? void 0 : _i.stagedUploadsCreate) == null ? void 0 : _j.stagedTargets) == null ? void 0 : _k.length)) {
      console.warn("Staged upload creation failed:", stageErrors);
      return null;
    }
    const target = stageJson.data.stagedUploadsCreate.stagedTargets[0];
    const uploadUrl = target.url;
    const resourceUrl = target.resourceUrl;
    const params = target.parameters ?? [];
    const formPayload = new FormData();
    params.forEach(({
      name,
      value
    }) => formPayload.append(name, value));
    formPayload.append("file", new Blob([imageBuffer], {
      type: mimeType
    }), fileName);
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      body: formPayload
    });
    if (!uploadRes.ok) {
      console.warn("Staged image upload failed:", uploadRes.status, await uploadRes.text());
      return null;
    }
    console.log("New image bytes uploaded successfully.");
    const mediaRes = await admin.graphql(`#graphql
      mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
        productCreateMedia(productId: $productId, media: $media) {
          media {
            ... on MediaImage {
              id
              image { url }
            }
          }
          mediaUserErrors { field message }
          product { id }
        }
      }`, {
      variables: {
        productId,
        media: [{
          originalSource: resourceUrl,
          mediaContentType: "IMAGE",
          alt: "Campaign image"
        }]
      }
    });
    const mediaJson = await mediaRes.json();
    const mediaErrors = ((_m = (_l = mediaJson.data) == null ? void 0 : _l.productCreateMedia) == null ? void 0 : _m.mediaUserErrors) ?? [];
    if (mediaErrors.length > 0) {
      console.warn("productCreateMedia errors:", mediaErrors);
      return null;
    }
    const newMedia = (_p = (_o = (_n = mediaJson.data) == null ? void 0 : _n.productCreateMedia) == null ? void 0 : _o.media) == null ? void 0 : _p[0];
    const newMediaId = (newMedia == null ? void 0 : newMedia.id) ?? null;
    const cdnUrl = ((_q = newMedia == null ? void 0 : newMedia.image) == null ? void 0 : _q.url) ?? null;
    console.log("New product image attached, CDN URL:", cdnUrl);
    if (newMediaId) {
      const featuredRes = await admin.graphql(`#graphql
        mutation productUpdate($input: ProductInput!) {
          productUpdate(input: $input) {
            product {
              id
              featuredMedia {
                id
              }
            }
            userErrors { field message }
          }
        }`, {
        variables: {
          input: {
            id: productId,
            featuredMediaId: newMediaId
          }
        }
      });
      const featuredJson = await featuredRes.json();
      const featuredErrors = ((_s = (_r = featuredJson.data) == null ? void 0 : _r.productUpdate) == null ? void 0 : _s.userErrors) ?? [];
      if (featuredErrors.length > 0) {
        console.warn("productUpdate (featuredMedia) errors (non-fatal):", featuredErrors);
      } else {
        console.log("Set new image as product featured media successfully.");
      }
    }
    return cdnUrl;
  } catch (err) {
    console.warn("replaceProductImage threw (non-fatal):", err);
    return null;
  }
}
const loader$d = async ({
  request,
  params
}) => {
  const {
    session
  } = await authenticate.admin(request);
  const id = params.id;
  if (!id) throw new Response("Missing id parameter", {
    status: 400
  });
  const campaign = await prisma.campaign.findUnique({
    where: {
      id
    }
  });
  if (!campaign) throw new Response("Campaign Not Found", {
    status: 404
  });
  if (campaign.shop !== session.shop) throw new Response("Forbidden", {
    status: 403
  });
  let donationAmounts = ["5", "10", "25"];
  if (campaign.donationAmounts) {
    try {
      donationAmounts = JSON.parse(campaign.donationAmounts);
    } catch {
      donationAmounts = ["5", "10", "25"];
    }
  }
  const initialFormData2 = {
    name: campaign.name,
    description: campaign.description,
    imageUrl: campaign.imageUrl || "",
    enabled: campaign.enabled,
    displayStyle: campaign.displayStyle,
    donationAmounts,
    allowOtherAmount: campaign.allowOtherAmount,
    otherAmountTitle: campaign.otherAmountTitle,
    isRecurringEnabled: campaign.isRecurringEnabled
  };
  return {
    campaign,
    initialFormData: initialFormData2
  };
};
const action$8 = async ({
  request,
  params
}) => {
  var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
  try {
    const {
      admin,
      session
    } = await authenticate.admin(request);
    const id = params.id;
    if (!id) return data({
      error: "Missing ID"
    }, {
      status: 400
    });
    const formData = await request.formData();
    const name = formData.get("name");
    const description = formData.get("description");
    const imageUrl = formData.get("imageUrl") || "";
    const enabled = formData.get("enabled") === "true";
    const displayStyle = formData.get("displayStyle") || "tabs";
    const donationAmounts = formData.get("donationAmounts") || "[]";
    const allowOtherAmount = formData.get("allowOtherAmount") === "true";
    const otherAmountTitle = formData.get("otherAmountTitle") || "Other";
    const isRecurringEnabled = formData.get("isRecurringEnabled") === "true";
    if (!name || !description) {
      return data({
        error: "Name and description are required"
      }, {
        status: 400
      });
    }
    const existing = await prisma.campaign.findUnique({
      where: {
        id
      }
    });
    if (!existing) return data({
      error: "Campaign not found"
    }, {
      status: 404
    });
    if (existing.shop !== session.shop) return data({
      error: "Forbidden"
    }, {
      status: 403
    });
    console.log("[ACTION] === Starting campaign update ===");
    console.log("[ACTION] Campaign ID:", id);
    console.log("[ACTION] Submitted imageUrl:", imageUrl ? `length=${imageUrl.length}` : "empty");
    console.log("[ACTION] Existing imageUrl:", existing.imageUrl ?? "null");
    console.log("[ACTION] ShopifyProductId:", existing.shopifyProductId ?? "null");
    const existingUrl = existing.imageUrl ?? "";
    const imageIsDifferent = imageUrl !== existingUrl;
    let newImageUrl = existingUrl;
    let imageNeedsDbUpdate = false;
    console.log("[ACTION] imageUrl submitted:", imageUrl ? `length=${imageUrl.length}` : "empty");
    console.log("[ACTION] existingUrl:", existingUrl);
    console.log("[ACTION] imageIsDifferent:", imageIsDifferent);
    if (imageIsDifferent) {
      imageNeedsDbUpdate = true;
      if (imageUrl.startsWith("data:")) {
        console.log("[ACTION] Processing new image upload to Shopify...");
        if (existing.shopifyProductId) {
          const cdnUrl = await replaceProductImage(admin, existing.shopifyProductId, imageUrl);
          if (cdnUrl) {
            newImageUrl = cdnUrl;
            console.log("[ACTION] Shopify upload SUCCESS, new URL:", cdnUrl);
          } else {
            console.warn("[ACTION] Shopify upload failed, storing base64 in DB as fallback");
            newImageUrl = imageUrl;
          }
        } else {
          newImageUrl = imageUrl;
        }
      } else {
        console.log("[ACTION] Image removed or set to non-base64 string");
        newImageUrl = imageUrl;
      }
    }
    const dbPatch = {};
    if (name !== existing.name) dbPatch.name = name;
    if (description !== existing.description) dbPatch.description = description;
    if (imageNeedsDbUpdate) dbPatch.imageUrl = newImageUrl;
    if (enabled !== existing.enabled) dbPatch.enabled = enabled;
    if (displayStyle !== existing.displayStyle) dbPatch.displayStyle = displayStyle;
    if (donationAmounts !== existing.donationAmounts) dbPatch.donationAmounts = donationAmounts;
    if (allowOtherAmount !== existing.allowOtherAmount) dbPatch.allowOtherAmount = allowOtherAmount;
    if (otherAmountTitle !== existing.otherAmountTitle) dbPatch.otherAmountTitle = otherAmountTitle;
    if (isRecurringEnabled !== existing.isRecurringEnabled) dbPatch.isRecurringEnabled = isRecurringEnabled;
    console.log("[ACTION] DB patch:", JSON.stringify(dbPatch));
    const campaign = Object.keys(dbPatch).length > 0 ? await prisma.campaign.update({
      where: {
        id
      },
      data: dbPatch
    }) : existing;
    console.log("[ACTION] Database updated, new imageUrl:", campaign.imageUrl ?? "null");
    let newVariantIdsStr = campaign.shopifyVariantIds;
    if (existing.shopifyProductId) {
      console.log("[ACTION] Syncing variants to Shopify...");
      try {
        let parsedAmounts = JSON.parse(donationAmounts);
        const formattedSet = /* @__PURE__ */ new Set();
        parsedAmounts = parsedAmounts.filter((amount) => {
          const val = parseFloat(String(amount).replace(/[^0-9.]/g, ""));
          if (isNaN(val)) return false;
          const formatted = `$${val.toFixed(2)}`;
          if (formattedSet.has(formatted)) return false;
          formattedSet.add(formatted);
          return true;
        });
        const currentVResponse = await admin.graphql(`#graphql
          query getProductVariants($id: ID!) {
            product(id: $id) {
              variants(first: 20) {
                nodes { id }
              }
            }
          }`, {
          variables: {
            id: existing.shopifyProductId
          }
        });
        const currentVJson = await currentVResponse.json();
        const existingVids = ((_c = (_b = (_a2 = currentVJson.data) == null ? void 0 : _a2.product) == null ? void 0 : _b.variants) == null ? void 0 : _c.nodes.map((v) => v.id)) || [];
        if (existingVids.length > 0) {
          await admin.graphql(`#graphql
            mutation productVariantsBulkDelete($productId: ID!, $variantsIds: [ID!]!) {
              productVariantsBulkDelete(productId: $productId, variantsIds: $variantsIds) {
                userErrors { field message }
              }
            }`, {
            variables: {
              productId: existing.shopifyProductId,
              variantsIds: existingVids
            }
          });
        }
        const finalAmounts = [.../* @__PURE__ */ new Set([...parsedAmounts, "1.00"])];
        const variantsInput = finalAmounts.map((amount) => {
          const val = parseFloat(String(amount).replace(/[^0-9.]/g, ""));
          return {
            price: val.toFixed(2),
            inventoryPolicy: "CONTINUE",
            inventoryItem: {
              tracked: false,
              requiresShipping: false
            },
            optionValues: [{
              optionName: "Title",
              name: `$${val.toFixed(2)}`
            }]
          };
        });
        const variantResponse = await admin.graphql(`#graphql
          mutation ProductVariantsBulkCreate($productId: ID!, $strategy: ProductVariantsBulkCreateStrategy, $variants: [ProductVariantsBulkInput!]!) {
            productVariantsBulkCreate(productId: $productId, strategy: $strategy, variants: $variants) {
              productVariants { id }
              userErrors { field message }
            }
          }`, {
          variables: {
            productId: existing.shopifyProductId,
            strategy: "REMOVE_STANDALONE_VARIANT",
            variants: variantsInput
          }
        });
        const variantJson = await variantResponse.json();
        const variantUserErrors = ((_e = (_d = variantJson.data) == null ? void 0 : _d.productVariantsBulkCreate) == null ? void 0 : _e.userErrors) || [];
        if (variantUserErrors.length > 0) {
          console.error("Variant Errors:", variantUserErrors);
        } else {
          console.log("Variants synced successfully (raw order):", (_h = (_g = (_f = variantJson.data) == null ? void 0 : _f.productVariantsBulkCreate) == null ? void 0 : _g.productVariants) == null ? void 0 : _h.length);
          const refetchRes = await admin.graphql(`#graphql
            query getVariantPrices($id: ID!) {
              product(id: $id) {
                variants(first: 50) {
                  nodes { id price }
                }
              }
            }`, {
            variables: {
              id: existing.shopifyProductId
            }
          });
          const refetchJson = await refetchRes.json();
          const fetchedVariants = ((_k = (_j = (_i = refetchJson.data) == null ? void 0 : _i.product) == null ? void 0 : _j.variants) == null ? void 0 : _k.nodes) || [];
          const priceToVariantId = {};
          fetchedVariants.forEach((v) => {
            priceToVariantId[parseFloat(v.price).toFixed(2)] = v.id;
          });
          const orderedVariantIds = finalAmounts.map((amt) => {
            const key = parseFloat(String(amt).replace(/[^0-9.]/g, "")).toFixed(2);
            return priceToVariantId[key] || "";
          }).filter(Boolean);
          newVariantIdsStr = JSON.stringify(orderedVariantIds);
          console.log("Variants ordered by amount:", orderedVariantIds.length);
          await prisma.campaign.update({
            where: {
              id: existing.id
            },
            data: {
              shopifyVariantIds: newVariantIdsStr,
              donationAmounts: JSON.stringify(finalAmounts)
            }
          });
          try {
            await admin.graphql(`#graphql
              mutation productUpdate($input: ProductInput!) {
                productUpdate(input: $input) {
                  product { id status }
                }
              }`, {
              variables: {
                input: {
                  id: existing.shopifyProductId,
                  status: "ACTIVE"
                }
              }
            });
            console.log("[ACTION] Reactivated product to ACTIVE status.");
          } catch (reactivateErr) {
            console.warn("[ACTION] Non-fatal: could not reactivate product:", reactivateErr);
          }
        }
      } catch (e) {
        console.error("Failed to sync variants:", e);
      }
    }
    if (existing.shopifyProductId) {
      console.log("[ACTION] Syncing campaign data to Shopify product...");
      const shopifyInput = {
        id: existing.shopifyProductId,
        metafields: [{
          namespace: "$app",
          key: "campaign_data",
          value: JSON.stringify({
            displayStyle: campaign.displayStyle,
            allowOtherAmount: campaign.allowOtherAmount,
            otherAmountTitle: campaign.otherAmountTitle,
            // Omit imageUrl from metafield if it is base64 (too large)
            imageUrl: ((_l = campaign.imageUrl) == null ? void 0 : _l.startsWith("data:")) ? null : campaign.imageUrl,
            isRecurringEnabled: campaign.isRecurringEnabled
          }),
          type: "json"
        }]
      };
      const productResponse = await admin.graphql(`#graphql
        mutation UpdateDonationProduct($input: ProductInput!) {
          productUpdate(input: $input) {
            product { id }
            userErrors { field message }
          }
        }`, {
        variables: {
          input: shopifyInput
        }
      });
      const productJson = await productResponse.json();
      if (((_o = (_n = (_m = productJson.data) == null ? void 0 : _m.productUpdate) == null ? void 0 : _n.userErrors) == null ? void 0 : _o.length) > 0) {
        console.error("[ACTION] Shopify errors:", productJson.data.productUpdate.userErrors);
      } else {
        console.log("[ACTION] Shopify product updated successfully");
      }
    }
    if (isRecurringEnabled) {
      console.log("[ACTION] Recurring enabled, ensuring selling plans are synced...");
      try {
        await setupSellingPlans(admin, session.shop, existing.shopifyProductId);
        console.log("[ACTION] Selling plans setup successfully.");
      } catch (e) {
        console.warn("[ACTION] Error setting up recurring (non-fatal):", e);
      }
    } else if (existing.isRecurringEnabled) {
      console.log("[ACTION] Recurring disabled, removing selling plans...");
      try {
        const config = await prisma.recurringDonationConfig.findUnique({
          where: {
            shop: existing.shop
          }
        });
        if ((config == null ? void 0 : config.sellingPlanGroupId) && existing.shopifyProductId) {
          await admin.graphql(`#graphql
            mutation sellingPlanGroupRemoveProducts($id: ID!, $productIds: [ID!]!) {
              sellingPlanGroupRemoveProducts(id: $id, productIds: $productIds) {
                removedProductIds
                userErrors { field message }
              }
            }`, {
            variables: {
              id: config.sellingPlanGroupId,
              productIds: [existing.shopifyProductId]
            }
          });
        }
      } catch (e) {
        console.warn("[ACTION] Error removing recurring (non-fatal):", e);
      }
    }
    console.log("[ACTION] === Campaign update complete ===");
    return data({
      success: true,
      campaignId: campaign.id
    });
  } catch (error) {
    console.error("Error updating campaign:", error);
    return data({
      error: "Failed to update campaign: " + error.message
    }, {
      status: 500
    });
  }
};
const app_presetDonation__edit_$id = UNSAFE_withComponentProps(function EditCampaignPage() {
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const {
    initialFormData: initialFormData2
  } = useLoaderData();
  const [formData, setFormData] = useState(initialFormData2);
  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData2);
  }, [formData, initialFormData2]);
  const isSubmitting = fetcher.state === "submitting";
  const handleFormChange = (changes) => {
    setFormData((prev) => ({
      ...prev,
      ...changes
    }));
  };
  const handleSave = () => {
    console.log("[Edit Page] handleSave called");
    console.log("[Edit Page] formData.imageUrl:", formData.imageUrl ? `(${formData.imageUrl.length} chars, ${formData.imageUrl.substring(0, 50)}...)` : "empty");
    const fd = new FormData();
    fd.append("name", formData.name);
    fd.append("description", formData.description);
    fd.append("imageUrl", formData.imageUrl);
    fd.append("enabled", String(formData.enabled));
    fd.append("displayStyle", formData.displayStyle);
    fd.append("donationAmounts", JSON.stringify(formData.donationAmounts));
    fd.append("allowOtherAmount", String(formData.allowOtherAmount));
    fd.append("otherAmountTitle", formData.otherAmountTitle);
    fd.append("isRecurringEnabled", String(formData.isRecurringEnabled));
    console.log("[Edit Page] FormData created, submitting...");
    fetcher.submit(fd, {
      method: "post"
    });
  };
  useEffect(() => {
    var _a2;
    if (fetcher.state === "idle" && ((_a2 = fetcher.data) == null ? void 0 : _a2.success)) {
      navigate("/app/preset-donation");
    }
  }, [fetcher.state, fetcher.data, navigate]);
  const handleCancel = () => navigate("/app/preset-donation");
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "Edit Campaign",
    children: [/* @__PURE__ */ jsx("s-button", {
      slot: "primary-action",
      variant: "primary",
      onClick: handleSave,
      disabled: isSubmitting || !isDirty,
      children: isSubmitting ? "Saving..." : isDirty ? "Save Changes" : "No Changes"
    }), /* @__PURE__ */ jsx("s-button", {
      slot: "secondary-action",
      onClick: handleCancel,
      disabled: isSubmitting,
      children: "Cancel"
    }), /* @__PURE__ */ jsx("div", {
      style: {
        marginTop: "24px"
      },
      children: /* @__PURE__ */ jsx(AddCampaign, {
        formData,
        onFormChange: handleFormChange
      })
    })]
  });
});
const route25 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$8,
  default: app_presetDonation__edit_$id,
  loader: loader$d
}, Symbol.toStringTag, { value: "Module" }));
async function performSubscriptionAction({
  admin,
  shop,
  subscriptionId,
  actionType
}) {
  var _a2, _b, _c, _d, _e, _f, _g, _h, _i;
  const fullGid = subscriptionId.startsWith("gid://shopify/SubscriptionContract/") ? subscriptionId : `gid://shopify/SubscriptionContract/${subscriptionId}`;
  let mutation = "";
  let successMessage = "";
  switch (actionType) {
    case "pause":
      mutation = `#graphql
        mutation subscriptionContractPause($id: ID!) {
          subscriptionContractPause(subscriptionContractId: $id) {
            contract { id status }
            userErrors { field message }
          }
        }`;
      successMessage = "Subscription paused successfully";
      break;
    case "activate":
      mutation = `#graphql
        mutation subscriptionContractActivate($id: ID!) {
          subscriptionContractActivate(subscriptionContractId: $id) {
            contract { id status }
            userErrors { field message }
          }
        }`;
      successMessage = "Subscription resumed successfully";
      break;
    case "cancel":
      mutation = `#graphql
        mutation subscriptionContractCancel($id: ID!) {
          subscriptionContractCancel(subscriptionContractId: $id) {
            contract { id status }
            userErrors { field message }
          }
        }`;
      successMessage = "Subscription cancelled successfully";
      break;
  }
  const response = await admin.graphql(mutation, { variables: { id: fullGid } });
  const json = await response.json();
  let result;
  if (actionType === "pause") result = (_a2 = json == null ? void 0 : json.data) == null ? void 0 : _a2.subscriptionContractPause;
  else if (actionType === "activate") result = (_b = json == null ? void 0 : json.data) == null ? void 0 : _b.subscriptionContractActivate;
  else if (actionType === "cancel") result = (_c = json == null ? void 0 : json.data) == null ? void 0 : _c.subscriptionContractCancel;
  if ((result == null ? void 0 : result.userErrors) && result.userErrors.length > 0) {
    throw new Error(result.userErrors[0].message);
  }
  try {
    const detailsResp = await admin.graphql(
      `#graphql
            query getSubscriptionDetails($id: ID!) {
              subscriptionContract(id: $id) {
                id
                status
                nextBillingDate
                currencyCode
                lines(first: 1) {
                  edges {
                    node {
                      title
                      variantId
                      variantImage { url }
                      currentPrice { amount }
                    }
                  }
                }
                customer { email firstName lastName }
                originOrder {
                  id
                  name
                  billingAddress { name address1 address2 city provinceCode zip country }
                  shippingAddress { name address1 address2 city provinceCode zip country }
                }
              }
            }`,
      { variables: { id: fullGid } }
    );
    const detailsJson = await detailsResp.json();
    const contract = (_d = detailsJson == null ? void 0 : detailsJson.data) == null ? void 0 : _d.subscriptionContract;
    if (contract) {
      const line = (_g = (_f = (_e = contract.lines) == null ? void 0 : _e.edges) == null ? void 0 : _f[0]) == null ? void 0 : _g.node;
      const customer = contract.customer;
      const originOrder = contract.originOrder;
      const newStatus = actionType === "pause" ? "paused" : actionType === "activate" ? "active" : "cancelled";
      console.log(`[SubscriptionAction] Syncing Activity. OrderID: ${originOrder == null ? void 0 : originOrder.id}, ContractID: ${fullGid}, Name: ${originOrder == null ? void 0 : originOrder.name}`);
      let log = null;
      if (originOrder == null ? void 0 : originOrder.id) {
        log = await prisma.recurringDonationLog.findFirst({
          where: { orderId: originOrder.id, shop }
        });
      }
      if (!log) {
        log = await prisma.recurringDonationLog.findFirst({
          where: { subscriptionContractId: fullGid, shop }
        });
      }
      if (!log && (originOrder == null ? void 0 : originOrder.name)) {
        const cleanName = originOrder.name.replace("#", "");
        log = await prisma.recurringDonationLog.findFirst({
          where: {
            shop,
            OR: [
              { orderNumber: originOrder.name },
              { orderNumber: cleanName },
              { orderNumber: `#${cleanName}` }
            ]
          }
        });
      }
      if (log) {
        console.log(`[SubscriptionAction] Updating log ${log.id} to ${newStatus}`);
        await prisma.recurringDonationLog.update({
          where: { id: log.id },
          data: {
            status: newStatus,
            subscriptionContractId: fullGid
          }
        });
      } else {
        console.warn(`[SubscriptionAction] FAILED sync for ${(originOrder == null ? void 0 : originOrder.name) || fullGid}. No matching record in RecurringDonationLog.`);
      }
      const fmtAddr = (addr) => addr ? `${addr.name}
${addr.address1}${addr.address2 ? ` ${addr.address2}` : ""}
${addr.city}, ${addr.provinceCode || ""} ${addr.zip}
${addr.country}` : "N/A";
      const emailType = actionType === "pause" ? "pause" : actionType === "activate" ? "resume" : "cancellation";
      const emailResult = await sendDonationReceipt({
        email: (customer == null ? void 0 : customer.email) || (log == null ? void 0 : log.customerEmail) || "",
        name: `${(customer == null ? void 0 : customer.firstName) || ""} ${(customer == null ? void 0 : customer.lastName) || ""}`.trim() || (log == null ? void 0 : log.customerName) || "Customer",
        amount: `${(contract == null ? void 0 : contract.currencyCode) || "USD"} ${((_h = line == null ? void 0 : line.currentPrice) == null ? void 0 : _h.amount) || "0.00"}`,
        orderNumber: (originOrder == null ? void 0 : originOrder.name) || (log == null ? void 0 : log.orderNumber) || "N/A",
        type: emailType,
        shop,
        frequency: (log == null ? void 0 : log.frequency) === "monthly" ? "Monthly" : (log == null ? void 0 : log.frequency) === "weekly" ? "Weekly" : "One-time",
        nextBillingDate: contract.nextBillingDate ? new Date(contract.nextBillingDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        }) : "N/A",
        donationName: (line == null ? void 0 : line.title) || "Charity Donation",
        productImage: (_i = line == null ? void 0 : line.variantImage) == null ? void 0 : _i.url,
        productTitle: line == null ? void 0 : line.title,
        manageUrl: `https://${shop}/account/subscriptions`,
        shippingAddress: fmtAddr(originOrder == null ? void 0 : originOrder.shippingAddress),
        billingAddress: fmtAddr(originOrder == null ? void 0 : originOrder.billingAddress)
      });
      if (!emailResult.success) {
        console.error(`[SubscriptionAction] Email sending failed: ${emailResult.error}`);
        if (log) {
          await prisma.recurringDonationLog.update({
            where: { id: log.id },
            data: { receiptStatus: "failed" }
          });
        }
      } else {
        if (log) {
          await prisma.recurringDonationLog.update({
            where: { id: log.id },
            data: { receiptStatus: "sent", receiptSentAt: /* @__PURE__ */ new Date() }
          });
        }
      }
    }
  } catch (galaxyErr) {
    console.error("Galaxy Donation Status Sync Error:", galaxyErr);
  }
  return { success: true, message: successMessage };
}
const subscriptionActions_server = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  performSubscriptionAction
}, Symbol.toStringTag, { value: "Module" }));
const loader$c = async ({
  request
}) => {
  var _a2, _b, _c;
  const {
    admin,
    session
  } = await authenticate.admin(request);
  const response = await admin.graphql(`#graphql
    query getSubscriptionContracts($first: Int!) {
      subscriptionContracts(first: $first, reverse: true) {
        edges {
          node {
            id
            status
            createdAt
            nextBillingDate
            currencyCode
            customer {
              firstName
              lastName
              email
            }
            lines(first: 10) {
              edges {
                node {
                  title
                  quantity
                  sellingPlanName
                  currentPrice {
                    amount
                    currencyCode
                  }
                }
              }
            }
            originOrder {
              id
              name
            }
          }
        }
      }
    }`, {
    variables: {
      first: 50
    }
  });
  const json = await response.json();
  const contracts = ((_c = (_b = (_a2 = json.data) == null ? void 0 : _a2.subscriptionContracts) == null ? void 0 : _b.edges) == null ? void 0 : _c.map((e) => {
    var _a3, _b2, _c2, _d, _e, _f, _g, _h, _i;
    const node = e.node;
    const lines = ((_b2 = (_a3 = node.lines) == null ? void 0 : _a3.edges) == null ? void 0 : _b2.map((l) => l.node)) ?? [];
    const totalAmount = lines.reduce((sum, line) => {
      var _a4;
      return sum + parseFloat(((_a4 = line.currentPrice) == null ? void 0 : _a4.amount) ?? "0") * (line.quantity ?? 1);
    }, 0);
    return {
      id: node.id,
      numericId: node.id.split("/").pop(),
      status: node.status,
      createdAt: node.createdAt,
      nextBillingDate: node.nextBillingDate,
      currency: node.currencyCode || ((_d = (_c2 = lines[0]) == null ? void 0 : _c2.currentPrice) == null ? void 0 : _d.currencyCode) || "USD",
      customerName: `${((_e = node.customer) == null ? void 0 : _e.firstName) ?? ""} ${((_f = node.customer) == null ? void 0 : _f.lastName) ?? ""}`.trim() || "N/A",
      customerEmail: ((_g = node.customer) == null ? void 0 : _g.email) ?? "N/A",
      orderNumber: ((_h = node.originOrder) == null ? void 0 : _h.name) ?? "N/A",
      planType: ((_i = lines[0]) == null ? void 0 : _i.sellingPlanName) ?? "Subscription",
      totalAmount
    };
  })) ?? [];
  return {
    contracts,
    shop: session.shop
  };
};
const action$7 = async ({
  request
}) => {
  const {
    admin,
    session
  } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("_action");
  const subscriptionId = formData.get("subscriptionId");
  try {
    const result = await performSubscriptionAction({
      admin,
      shop: session.shop,
      subscriptionId,
      actionType
    });
    return {
      success: true,
      message: result.message
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Action failed"
    };
  }
};
const app_recurringSubscriptions = UNSAFE_withComponentProps(function RecurringSubscriptionsPage() {
  const {
    contracts
  } = useLoaderData();
  const fetcher = useFetcher();
  const resourceName = {
    singular: "subscription",
    plural: "subscriptions"
  };
  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange
  } = useIndexResourceState(contracts);
  const getStatusBadge = (status) => {
    switch (status.toUpperCase()) {
      case "ACTIVE":
        return /* @__PURE__ */ jsx(Badge, {
          tone: "success",
          children: "Active"
        });
      case "PAUSED":
        return /* @__PURE__ */ jsx(Badge, {
          tone: "attention",
          children: "Paused"
        });
      case "CANCELLED":
      case "EXPIRED":
      case "FAILED":
        return /* @__PURE__ */ jsx(Badge, {
          tone: "critical",
          children: status.charAt(0) + status.slice(1).toLowerCase()
        });
      default:
        return /* @__PURE__ */ jsx(Badge, {
          children: status
        });
    }
  };
  const fmtDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  const rowMarkup = contracts.map(({
    id,
    numericId,
    customerName,
    customerEmail,
    planType,
    orderNumber,
    createdAt,
    nextBillingDate,
    totalAmount,
    currency,
    status
  }, index2) => {
    var _a2, _b, _c, _d, _e, _f;
    return /* @__PURE__ */ jsxs(IndexTable.Row, {
      id,
      selected: selectedResources.includes(id),
      position: index2,
      children: [/* @__PURE__ */ jsx(IndexTable.Cell, {
        children: /* @__PURE__ */ jsxs(Text, {
          variant: "bodyMd",
          fontWeight: "bold",
          as: "span",
          children: ["#", numericId]
        })
      }), /* @__PURE__ */ jsx(IndexTable.Cell, {
        children: /* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            flexDirection: "column"
          },
          children: [/* @__PURE__ */ jsx(Text, {
            variant: "bodyMd",
            fontWeight: "bold",
            as: "span",
            children: customerName
          }), /* @__PURE__ */ jsx(Text, {
            variant: "bodySm",
            tone: "subdued",
            as: "span",
            children: customerEmail
          })]
        })
      }), /* @__PURE__ */ jsx(IndexTable.Cell, {
        children: planType.toLowerCase().includes("month") ? "Monthly" : planType.toLowerCase().includes("week") ? "Weekly" : "Recurring"
      }), /* @__PURE__ */ jsx(IndexTable.Cell, {
        children: /* @__PURE__ */ jsx(Text, {
          variant: "bodyMd",
          fontWeight: "bold",
          as: "span",
          children: orderNumber
        })
      }), /* @__PURE__ */ jsx(IndexTable.Cell, {
        children: fmtDate(createdAt)
      }), /* @__PURE__ */ jsx(IndexTable.Cell, {
        children: fmtDate(nextBillingDate)
      }), /* @__PURE__ */ jsxs(IndexTable.Cell, {
        children: [currency, " ", totalAmount.toFixed(2)]
      }), /* @__PURE__ */ jsx(IndexTable.Cell, {
        children: getStatusBadge(status)
      }), /* @__PURE__ */ jsx(IndexTable.Cell, {
        children: /* @__PURE__ */ jsxs(InlineStack, {
          gap: "200",
          align: "end",
          children: [status === "ACTIVE" && /* @__PURE__ */ jsx(Button, {
            size: "slim",
            onClick: () => fetcher.submit({
              _action: "pause",
              subscriptionId: id
            }, {
              method: "POST"
            }),
            loading: fetcher.state === "submitting" && ((_a2 = fetcher.formData) == null ? void 0 : _a2.get("subscriptionId")) === id && ((_b = fetcher.formData) == null ? void 0 : _b.get("_action")) === "pause",
            children: "Pause"
          }), status === "PAUSED" && /* @__PURE__ */ jsx(Button, {
            size: "slim",
            variant: "primary",
            onClick: () => fetcher.submit({
              _action: "activate",
              subscriptionId: id
            }, {
              method: "POST"
            }),
            loading: fetcher.state === "submitting" && ((_c = fetcher.formData) == null ? void 0 : _c.get("subscriptionId")) === id && ((_d = fetcher.formData) == null ? void 0 : _d.get("_action")) === "activate",
            children: "Resume"
          }), (status === "ACTIVE" || status === "PAUSED") && /* @__PURE__ */ jsx(Button, {
            size: "slim",
            tone: "critical",
            onClick: () => {
              if (confirm("Are you sure you want to cancel this subscription?")) {
                fetcher.submit({
                  _action: "cancel",
                  subscriptionId: id
                }, {
                  method: "POST"
                });
              }
            },
            loading: fetcher.state === "submitting" && ((_e = fetcher.formData) == null ? void 0 : _e.get("subscriptionId")) === id && ((_f = fetcher.formData) == null ? void 0 : _f.get("_action")) === "cancel",
            children: "Cancel"
          })]
        })
      })]
    }, id);
  });
  return /* @__PURE__ */ jsx(Page, {
    fullWidth: true,
    title: "Recurring Donation Management",
    children: /* @__PURE__ */ jsx(Layout, {
      children: /* @__PURE__ */ jsx(Layout.Section, {
        children: /* @__PURE__ */ jsx(Card, {
          padding: "0",
          children: contracts.length > 0 ? /* @__PURE__ */ jsx(IndexTable, {
            resourceName,
            itemCount: contracts.length,
            selectedItemsCount: allResourcesSelected ? "All" : selectedResources.length,
            onSelectionChange: handleSelectionChange,
            headings: [{
              title: "Subscription Id"
            }, {
              title: "Customer"
            }, {
              title: "Frequency"
            }, {
              title: "First Order No"
            }, {
              title: "Create Date"
            }, {
              title: "Next Billing Date"
            }, {
              title: "Total Amount"
            }, {
              title: "Status"
            }, {
              title: "Actions",
              alignment: "end"
            }],
            selectable: false,
            children: rowMarkup
          }) : /* @__PURE__ */ jsx(EmptyState, {
            heading: "No recurring donations found",
            action: {
              content: "Setup Selling Plans",
              url: "/app/recurring-donation"
            },
            image: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
            children: /* @__PURE__ */ jsx("p", {
              children: "When customers start recurring donations, they will appear here."
            })
          })
        })
      })
    })
  });
});
const route26 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$7,
  default: app_recurringSubscriptions,
  loader: loader$c
}, Symbol.toStringTag, { value: "Module" }));
async function uploadImageToShopifyProduct(admin, productId, base64DataUrl) {
  var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
  try {
    const match = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      console.warn("Image upload skipped: invalid data URL format");
      return null;
    }
    const mimeType = match[1];
    const base64Data = match[2];
    const imageBuffer = Buffer.from(base64Data, "base64");
    const fileSize = imageBuffer.byteLength;
    const fileName = `campaign-image.${mimeType.split("/")[1] || "jpg"}`;
    console.log(`  Image: ${fileName}, size: ${fileSize} bytes, type: ${mimeType}`);
    const stageRes = await admin.graphql(`#graphql
      mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets {
            url
            resourceUrl
            parameters { name value }
          }
          userErrors { field message }
        }
      }`, {
      variables: {
        input: [{
          resource: "PRODUCT_IMAGE",
          filename: fileName,
          mimeType,
          fileSize: String(fileSize),
          httpMethod: "POST"
        }]
      }
    });
    const stageJson = await stageRes.json();
    const stageErrors = ((_b = (_a2 = stageJson.data) == null ? void 0 : _a2.stagedUploadsCreate) == null ? void 0 : _b.userErrors) || [];
    if (stageErrors.length > 0 || !((_e = (_d = (_c = stageJson.data) == null ? void 0 : _c.stagedUploadsCreate) == null ? void 0 : _d.stagedTargets) == null ? void 0 : _e.length)) {
      console.warn("Staged upload creation failed:", stageErrors);
      return null;
    }
    const target = stageJson.data.stagedUploadsCreate.stagedTargets[0];
    const uploadUrl = target.url;
    const resourceUrl = target.resourceUrl;
    const params = target.parameters || [];
    console.log("  Staged upload URL obtained, uploading image bytes...");
    const formPayload = new FormData();
    params.forEach(({
      name,
      value
    }) => formPayload.append(name, value));
    formPayload.append("file", new Blob([imageBuffer], {
      type: mimeType
    }), fileName);
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      body: formPayload
    });
    if (!uploadRes.ok) {
      const uploadErr = await uploadRes.text();
      console.warn("Staged upload PUT failed:", uploadRes.status, uploadErr);
      return null;
    }
    console.log("  Image bytes uploaded successfully.");
    const mediaRes = await admin.graphql(`#graphql
      mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
        productCreateMedia(productId: $productId, media: $media) {
          media { ... on MediaImage { id image { url } } }
          mediaUserErrors { field message }
          product { id }
        }
      }`, {
      variables: {
        productId,
        media: [{
          originalSource: resourceUrl,
          mediaContentType: "IMAGE",
          alt: "Campaign image"
        }]
      }
    });
    const mediaJson = await mediaRes.json();
    const mediaErrors = ((_g = (_f = mediaJson.data) == null ? void 0 : _f.productCreateMedia) == null ? void 0 : _g.mediaUserErrors) || [];
    if (mediaErrors.length > 0) {
      console.warn("productCreateMedia errors:", mediaErrors);
      return null;
    }
    const cdnUrl = ((_l = (_k = (_j = (_i = (_h = mediaJson.data) == null ? void 0 : _h.productCreateMedia) == null ? void 0 : _i.media) == null ? void 0 : _j[0]) == null ? void 0 : _k.image) == null ? void 0 : _l.url) ?? null;
    console.log("  Product media attached, CDN URL:", cdnUrl);
    return cdnUrl;
  } catch (err) {
    console.warn("uploadImageToShopifyProduct threw (non-fatal):", err);
    return null;
  }
}
const initialFormData = {
  name: "",
  description: "",
  imageUrl: "",
  enabled: true,
  displayStyle: "tabs",
  donationAmounts: ["0.01", "0.10", "1.00", "10.00", "100.00", "1000.00", "10", "20", "30", "40"],
  allowOtherAmount: true,
  otherAmountTitle: "Other",
  isRecurringEnabled: false
};
const loader$b = async ({
  request
}) => {
  await authenticate.admin(request);
  return null;
};
const action$6 = async ({
  request
}) => {
  var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
  console.log("=== STARTING CAMPAIGN CREATION ===");
  try {
    console.log("Step 1: Authenticating...");
    const {
      session,
      admin
    } = await authenticate.admin(request);
    console.log("Authentication successful, shop:", session == null ? void 0 : session.shop);
    console.log("Step 2: Parsing form data...");
    const formData = await request.formData();
    const name = formData.get("name") || "";
    const description = formData.get("description") || "";
    const imageUrl = formData.get("imageUrl") || "";
    const enabled = formData.get("enabled") === "true";
    const displayStyle = formData.get("displayStyle") || "tabs";
    const donationAmountsRaw = formData.get("donationAmounts") || "[]";
    const allowOtherAmount = formData.get("allowOtherAmount") === "true";
    const otherAmountTitle = formData.get("otherAmountTitle") || "Other";
    const isRecurringEnabled = formData.get("isRecurringEnabled") === "true";
    console.log("Form parsing complete. Version: 1.0.2");
    if (!name || !description) {
      return data({
        success: false,
        error: "Name and description are required"
      }, {
        status: 400
      });
    }
    console.log("Step 3: Processing donation amounts...");
    let parsedAmounts = [];
    try {
      parsedAmounts = JSON.parse(donationAmountsRaw);
    } catch (e) {
      console.error("JSON parsing failed for donationAmounts:", donationAmountsRaw);
      return data({
        success: false,
        error: "Invalid donation amounts format"
      }, {
        status: 400
      });
    }
    const formattedSet = /* @__PURE__ */ new Set();
    parsedAmounts = parsedAmounts.filter((amount) => {
      const val = parseFloat(amount);
      if (isNaN(val)) return false;
      const formatted = `$${val.toFixed(2)}`;
      if (formattedSet.has(formatted)) return false;
      formattedSet.add(formatted);
      return true;
    });
    if (parsedAmounts.length === 0) {
      return data({
        success: false,
        error: "At least one donation amount is required"
      }, {
        status: 400
      });
    }
    const shop = (session == null ? void 0 : session.shop) || "demo-shop";
    console.log("Step 4: Persisting campaign to local database...");
    let campaign;
    try {
      campaign = await prisma.campaign.create({
        data: {
          name,
          description,
          imageUrl,
          enabled,
          category: "Uncategorized",
          displayStyle,
          donationAmounts: donationAmountsRaw,
          allowOtherAmount,
          otherAmountTitle,
          shop,
          shopifyVariantIds: "[]",
          isRecurringEnabled
        }
      });
      console.log("Prisma DB Record Created:", campaign.id);
    } catch (dmError) {
      console.error("CRITICAL PRISMA FAILURE:", dmError);
      return data({
        success: false,
        error: `Database save failed: ${dmError.message}`
      }, {
        status: 500
      });
    }
    console.log("Step 5: Initialising Shopify Product Create...");
    const productResponse = await admin.graphql(`#graphql
      mutation CreateProduct($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
          }
          userErrors {
            field
            message
          }
        }
      }`, {
      variables: {
        input: {
          title: name,
          descriptionHtml: `<p>${description}</p>`,
          status: enabled ? "ACTIVE" : "DRAFT",
          productType: "donation",
          // Omitting 'category' intentionally — Shopify treats omitted/null
          // category as "Uncategorized", which is the desired behaviour.
          tags: ["donation", "preset-donation"],
          vendor: "Donation App"
        }
      }
    });
    const productJson = await productResponse.json();
    console.log("Shopify Product Result:", JSON.stringify(productJson, null, 2));
    if (productJson.errors || (((_b = (_a2 = productJson.data) == null ? void 0 : _a2.productCreate) == null ? void 0 : _b.userErrors) || []).length > 0) {
      const errorMsg = ((_d = (_c = productJson.errors) == null ? void 0 : _c[0]) == null ? void 0 : _d.message) || ((_h = (_g = (_f = (_e = productJson.data) == null ? void 0 : _e.productCreate) == null ? void 0 : _f.userErrors) == null ? void 0 : _g[0]) == null ? void 0 : _h.message) || "Shopify product create failed";
      console.error("Shopify Creation Error:", errorMsg);
      await prisma.campaign.delete({
        where: {
          id: campaign.id
        }
      });
      return data({
        success: false,
        error: errorMsg
      }, {
        status: 500
      });
    }
    const shopifyProductId = productJson.data.productCreate.product.id;
    console.log("Step 6: Forcing product category to Uncategorized...");
    try {
      const uncatResponse = await admin.graphql(`#graphql
        mutation productUpdate($input: ProductInput!) {
          productUpdate(input: $input) {
            product { id category { id name } }
            userErrors { field message }
          }
        }`, {
        variables: {
          input: {
            id: shopifyProductId,
            category: null
          }
        }
      });
      const uncatJson = await uncatResponse.json();
      const uncatErrors = ((_j = (_i = uncatJson.data) == null ? void 0 : _i.productUpdate) == null ? void 0 : _j.userErrors) || [];
      if (uncatErrors.length > 0) {
        console.warn("Could not unset category (non-fatal):", uncatErrors);
      } else {
        const catName = ((_n = (_m = (_l = (_k = uncatJson.data) == null ? void 0 : _k.productUpdate) == null ? void 0 : _l.product) == null ? void 0 : _m.category) == null ? void 0 : _n.name) ?? "Uncategorized";
        console.log("Product category confirmed:", catName);
      }
    } catch (uncatErr) {
      console.warn("Category update failed (non-fatal):", uncatErr);
    }
    console.log("Step 6.5: Uploading campaign image to Shopify product media...");
    if (imageUrl && imageUrl.startsWith("data:")) {
      const cdnUrl = await uploadImageToShopifyProduct(admin, shopifyProductId, imageUrl);
      if (cdnUrl) {
        console.log("Campaign image successfully attached to Shopify product:", cdnUrl);
        await prisma.campaign.update({
          where: {
            id: campaign.id
          },
          data: {
            imageUrl: cdnUrl
          }
        });
        console.log("Campaign imageUrl in DB updated to CDN URL.");
      } else {
        console.warn("Campaign image upload failed (non-fatal) — product created without image.");
      }
    } else {
      console.log("No image provided for this campaign, skipping media upload.");
    }
    console.log("Step 7: Generation of Product Variants...");
    const finalAmounts = [.../* @__PURE__ */ new Set([...parsedAmounts, "1.00"])];
    const variantsInput = finalAmounts.map((amount) => ({
      price: parseFloat(amount).toFixed(2),
      inventoryPolicy: "CONTINUE",
      inventoryItem: {
        tracked: false,
        requiresShipping: false
      },
      optionValues: [{
        optionName: "Title",
        name: `$${parseFloat(amount).toFixed(2)}`
      }]
    }));
    const variantResponse = await admin.graphql(`#graphql
      mutation ProductVariantsBulkCreate($productId: ID!, $strategy: ProductVariantsBulkCreateStrategy, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkCreate(productId: $productId, strategy: $strategy, variants: $variants) {
          productVariants { id }
          userErrors { field message }
        }
      }`, {
      variables: {
        productId: shopifyProductId,
        strategy: "REMOVE_STANDALONE_VARIANT",
        variants: variantsInput
      }
    });
    const variantJson = await variantResponse.json();
    const variantUserErrors = ((_p = (_o = variantJson.data) == null ? void 0 : _o.productVariantsBulkCreate) == null ? void 0 : _p.userErrors) || [];
    if (variantUserErrors.length > 0) {
      console.error("Variant Errors:", variantUserErrors);
      return data({
        success: false,
        error: variantUserErrors[0].message
      }, {
        status: 500
      });
    }
    const createdVariantGids = (((_r = (_q = variantJson.data) == null ? void 0 : _q.productVariantsBulkCreate) == null ? void 0 : _r.productVariants) || []).map((v) => v.id);
    console.log("Variants created (raw order):", createdVariantGids.length);
    const refetchRes = await admin.graphql(`#graphql
      query getVariantPrices($id: ID!) {
        product(id: $id) {
          variants(first: 50) {
            nodes { id price }
          }
        }
      }`, {
      variables: {
        id: shopifyProductId
      }
    });
    const refetchJson = await refetchRes.json();
    const fetchedVariants = ((_u = (_t = (_s = refetchJson.data) == null ? void 0 : _s.product) == null ? void 0 : _t.variants) == null ? void 0 : _u.nodes) || [];
    const priceToVariantId = {};
    fetchedVariants.forEach((v) => {
      priceToVariantId[parseFloat(v.price).toFixed(2)] = v.id;
    });
    const variantIds = finalAmounts.map((amt) => {
      const key = parseFloat(String(amt)).toFixed(2);
      return priceToVariantId[key] || "";
    }).filter(Boolean);
    console.log("Variants ordered by amount:", variantIds.length);
    console.log("Step 7.5: Publishing product to Online Store...");
    try {
      const pubResponse = await admin.graphql(`#graphql
        query getPublications {
          publications(first: 50) {
            edges {
              node {
                id
                name
              }
            }
          }
        }`);
      const pubJson = await pubResponse.json();
      const allPubs = ((_w = (_v = pubJson.data) == null ? void 0 : _v.publications) == null ? void 0 : _w.edges) || [];
      const onlineStorePub = (_x = allPubs.find((edge) => edge.node.name === "Online Store")) == null ? void 0 : _x.node;
      if (onlineStorePub == null ? void 0 : onlineStorePub.id) {
        console.log("Found Online Store publication:", onlineStorePub.id);
        const publishResponse = await admin.graphql(`#graphql
          mutation publishProduct($id: ID!, $input: [PublicationInput!]!) {
            publishablePublish(id: $id, input: $input) {
              publishable {
                availablePublicationsCount {
                  count
                }
              }
              userErrors {
                field
                message
              }
            }
          }`, {
          variables: {
            id: shopifyProductId,
            input: [{
              publicationId: onlineStorePub.id
            }]
          }
        });
        const publishJson = await publishResponse.json();
        const publishErrors = ((_z = (_y = publishJson.data) == null ? void 0 : _y.publishablePublish) == null ? void 0 : _z.userErrors) || [];
        if (publishJson.errors || publishErrors.length > 0) {
          console.error("Errors publishing product:", publishJson.errors || publishErrors);
        } else {
          console.log("Product published to Online Store successfully!");
        }
      } else {
        console.error("Could not find Online Store publication channel in: ", JSON.stringify(allPubs));
      }
    } catch (err) {
      console.error("Failed to publish product:", err);
    }
    console.log("Step 8: Updating campaign with Shopify IDs...");
    await prisma.campaign.update({
      where: {
        id: campaign.id
      },
      data: {
        shopifyProductId,
        shopifyVariantIds: JSON.stringify(variantIds),
        donationAmounts: JSON.stringify(finalAmounts)
      }
    });
    if (isRecurringEnabled) {
      console.log("Step 9: Setting up recurring selling plans...");
      try {
        await setupSellingPlans(admin, session.shop, shopifyProductId);
        console.log("Recurring selling plans attached successfully.");
      } catch (setupErr) {
        console.warn("Error setting up recurring plans (non-fatal):", setupErr);
      }
    }
    console.log("=== CAMPAIGN CREATION SUCCESS ===");
    console.log({
      campaignId: campaign.id,
      shopifyProductId,
      variantIds
    });
    return data({
      success: true,
      campaignId: campaign.id,
      shopifyProductId,
      variantCount: variantIds.length
    });
  } catch (error) {
    console.error("=== ERROR IN CAMPAIGN CREATION ===");
    console.error("Error type:", typeof error);
    console.error("Error:", error);
    let errorMessage = "An error occurred. Please try again.";
    if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else if (typeof error === "string") {
      errorMessage = error || errorMessage;
    } else if (error && typeof error === "object") {
      console.error("Error object:", JSON.stringify(error, null, 2));
    }
    return data({
      success: false,
      error: errorMessage
    }, {
      status: 500
    });
  }
};
const app_presetDonation__add = UNSAFE_withComponentProps(function AddCampaignPage() {
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const [formData, setFormData] = useState(initialFormData);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const isSubmitting = fetcher.state === "submitting";
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (fetcher.data.success) {
        setSubmitSuccess(true);
        setSubmitError(null);
        setIsDirty(false);
        setHasSaved(true);
        navigate("/app/preset-donation");
      } else {
        setSubmitError(fetcher.data.error || "An error occurred. Please try again.");
        setSubmitSuccess(false);
      }
    }
  }, [fetcher.state, fetcher.data, navigate]);
  const handleFormChange = (changes) => {
    setFormData((prev) => ({
      ...prev,
      ...changes
    }));
    setIsDirty(true);
    setHasSaved(false);
    if (submitError) setSubmitError(null);
  };
  const handleSave = () => {
    if (!formData.name.trim()) {
      setSubmitError("Please enter a campaign title");
      return;
    }
    if (!formData.description.trim()) {
      setSubmitError("Please enter a campaign description");
      return;
    }
    if (formData.donationAmounts.length === 0) {
      setSubmitError("Please add at least one donation amount");
      return;
    }
    setSubmitError(null);
    setSubmitSuccess(false);
    const formDataToSubmit = new FormData();
    formDataToSubmit.append("name", formData.name);
    formDataToSubmit.append("description", formData.description);
    formDataToSubmit.append("imageUrl", formData.imageUrl);
    formDataToSubmit.append("enabled", String(formData.enabled));
    formDataToSubmit.append("displayStyle", formData.displayStyle);
    formDataToSubmit.append("donationAmounts", JSON.stringify(formData.donationAmounts));
    formDataToSubmit.append("allowOtherAmount", String(formData.allowOtherAmount));
    formDataToSubmit.append("otherAmountTitle", formData.otherAmountTitle);
    formDataToSubmit.append("isRecurringEnabled", String(formData.isRecurringEnabled));
    fetcher.submit(formDataToSubmit, {
      method: "post"
    });
  };
  const handleCancel = () => {
    navigate("/app/preset-donation");
  };
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "Add Campaign",
    children: [/* @__PURE__ */ jsx("s-button", {
      slot: "primary-action",
      variant: "primary",
      onClick: handleSave,
      disabled: isSubmitting || !isDirty,
      children: isSubmitting ? "Saving..." : isDirty ? "Save Changes" : "No Changes"
    }), /* @__PURE__ */ jsx("s-button", {
      slot: "secondary-action",
      onClick: handleCancel,
      disabled: isSubmitting,
      children: "Cancel"
    }), submitSuccess && /* @__PURE__ */ jsx("s-banner", {
      tone: "success",
      children: /* @__PURE__ */ jsx("s-paragraph", {
        children: "Campaign created successfully! Redirecting..."
      })
    }), submitError && /* @__PURE__ */ jsx("s-banner", {
      tone: "critical",
      children: /* @__PURE__ */ jsx("s-paragraph", {
        children: submitError
      })
    }), /* @__PURE__ */ jsx("div", {
      style: {
        marginTop: "24px"
      },
      children: /* @__PURE__ */ jsx(AddCampaign, {
        formData,
        onFormChange: handleFormChange
      })
    })]
  });
});
const route27 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$6,
  default: app_presetDonation__add,
  loader: loader$b
}, Symbol.toStringTag, { value: "Module" }));
const loader$a = async ({
  request
}) => {
  var _a2, _b;
  const {
    session,
    admin
  } = await authenticate.admin(request);
  const shop = session.shop;
  const logs = await prisma.posDonationLog.findMany({
    where: {
      shop
    },
    orderBy: {
      createdAt: "desc"
    }
  });
  const recurringLogs = await prisma.recurringDonationLog.findMany({
    where: {
      shop
    },
    orderBy: {
      createdAt: "desc"
    }
  });
  const roundupLogs = await prisma.roundUpDonationLog.findMany({
    where: {
      shop
    },
    orderBy: {
      createdAt: "desc"
    }
  });
  const presetDonations = await prisma.donation.findMany({
    where: {
      campaign: {
        shop
      }
    },
    include: {
      campaign: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
  const response = await admin.graphql(`
      query {
        shop {
          currencyCode
        }
      }
    `);
  const shopData = await response.json();
  const currency = ((_b = (_a2 = shopData.data) == null ? void 0 : _a2.shop) == null ? void 0 : _b.currencyCode) || "USD";
  const subscription = await prisma.planSubscription.findUnique({
    where: {
      shop
    }
  });
  const config = await prisma.recurringDonationConfig.findUnique({
    where: {
      shop
    }
  });
  return {
    logs,
    recurringLogs,
    roundupLogs,
    presetDonations,
    config,
    currency,
    plan: (subscription == null ? void 0 : subscription.plan) ?? "basic"
  };
};
const app_donationActivity = UNSAFE_withComponentProps(function DonationActivity() {
  const loaderData = useLoaderData();
  const resendFetcher = useFetcher();
  const shopify2 = useAppBridge();
  const {
    logs,
    recurringLogs,
    roundupLogs,
    presetDonations,
    config,
    currency: currencyCode,
    plan
  } = loaderData;
  const moneyFormatter = new Intl.NumberFormat(void 0, {
    style: "currency",
    currency: currencyCode
  });
  const [selectedTab, setSelectedTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const handleTabChange = useCallback((id) => {
    setSelectedTab(id);
    setCurrentPage(1);
  }, []);
  const handleResend = useCallback((logId) => {
    resendFetcher.submit({
      logId
    }, {
      method: "POST",
      action: "/api/resend-donation-email"
    });
    shopify2.toast.show("Attempting to resend receipt...");
  }, [resendFetcher, shopify2]);
  const getFrequencyLabel = (freq) => {
    if (freq === "monthly") return "Monthly";
    if (freq === "weekly") return "Weekly";
    if (freq === "one_time") return "One-time";
    return "Donation";
  };
  let filteredLogs = [];
  const normalizedLogs = [...logs.map((l) => ({
    ...l,
    visualType: "POS",
    source: "pos"
  })), ...roundupLogs.map((l) => ({
    ...l,
    visualType: "Round Up",
    source: "roundup"
  })), ...recurringLogs.map((l) => ({
    ...l,
    visualType: getFrequencyLabel(l.frequency),
    source: "recurring"
  })), ...presetDonations.map((d) => ({
    id: d.id,
    createdAt: d.createdAt,
    orderNumber: d.orderNumber || (d.orderId ? `#${d.orderId.split("-").pop()}` : "Preset"),
    donationAmount: d.amount,
    orderTotal: 0,
    currency: d.currency,
    status: "active",
    receiptStatus: "sent",
    visualType: "Preset",
    source: "preset"
  }))].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (selectedTab === "all") {
    filteredLogs = normalizedLogs;
  } else if (selectedTab === "pos") {
    filteredLogs = normalizedLogs.filter((l) => l.source === "pos");
  } else if (selectedTab === "recurring") {
    filteredLogs = normalizedLogs.filter((l) => l.source === "recurring");
  } else if (selectedTab === "roundup") {
    filteredLogs = normalizedLogs.filter((l) => l.source === "roundup");
  } else if (selectedTab === "preset") {
    filteredLogs = normalizedLogs.filter((l) => l.source === "preset");
  }
  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleLogs = filteredLogs.slice(startIndex, startIndex + pageSize);
  return /* @__PURE__ */ jsx("div", {
    style: {
      paddingBottom: "40px"
    },
    children: /* @__PURE__ */ jsxs("s-page", {
      heading: "Donation Activity",
      children: [/* @__PURE__ */ jsx("div", {
        className: "polaris-tabs",
        children: /* @__PURE__ */ jsx("div", {
          className: "polaris-tabs-list",
          role: "tablist",
          children: [{
            id: "all",
            label: "All"
          }, {
            id: "pos",
            label: "POS Donation"
          }, {
            id: "recurring",
            label: "Recurring"
          }, {
            id: "roundup",
            label: "Round Up Donation"
          }, {
            id: "preset",
            label: "Preset Donation"
          }].map((tab) => {
            const isSelected = selectedTab === tab.id;
            const hasAccess = tab.id === "all" || tab.id === "pos" || tab.id === "recurring" || checkFeatureAccess(plan, "canUseFilters");
            return /* @__PURE__ */ jsxs("button", {
              role: "tab",
              "aria-selected": isSelected,
              className: `polaris-tab ${isSelected ? "active" : ""}`,
              style: {
                cursor: hasAccess ? "pointer" : "not-allowed",
                opacity: hasAccess ? 1 : 0.6
              },
              onClick: () => {
                if (!hasAccess) {
                  shopify2.toast.show("Upgrade to Advanced to use filters");
                  return;
                }
                handleTabChange(tab.id);
              },
              children: [tab.label, !hasAccess && /* @__PURE__ */ jsx("span", {
                style: {
                  marginLeft: "6px",
                  fontSize: "10px",
                  background: "#f4f4f4",
                  padding: "2px 4px",
                  borderRadius: "4px",
                  color: "#6D7175"
                },
                children: "ADV"
              })]
            }, tab.id);
          })
        })
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          backgroundColor: "#fff",
          border: "1px solid #EBEBEB",
          borderRadius: "0 0 8px 8px",
          padding: "20px"
        },
        children: [/* @__PURE__ */ jsx("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px"
          },
          children: /* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              color: "#202223"
            },
            children: [/* @__PURE__ */ jsx("span", {
              children: "Show"
            }), /* @__PURE__ */ jsxs("select", {
              value: pageSize,
              disabled: !checkFeatureAccess(plan, "canUseFilters"),
              onChange: (e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              },
              style: {
                padding: "4px 8px",
                borderRadius: "4px",
                border: "1px solid #EBEBEB",
                background: checkFeatureAccess(plan, "canUseFilters") ? "white" : "#f4f4f4",
                cursor: checkFeatureAccess(plan, "canUseFilters") ? "pointer" : "not-allowed"
              },
              children: [/* @__PURE__ */ jsx("option", {
                value: 5,
                children: "5"
              }), /* @__PURE__ */ jsx("option", {
                value: 10,
                children: "10"
              }), /* @__PURE__ */ jsx("option", {
                value: 15,
                children: "15"
              }), /* @__PURE__ */ jsx("option", {
                value: 20,
                children: "20"
              }), /* @__PURE__ */ jsx("option", {
                value: 25,
                children: "25"
              }), /* @__PURE__ */ jsx("option", {
                value: 50,
                children: "50"
              })]
            }), /* @__PURE__ */ jsx("span", {
              children: "entries"
            }), !checkFeatureAccess(plan, "canUseFilters") && /* @__PURE__ */ jsx(Link, {
              to: "/app/pricing",
              style: {
                color: "#6C4A79",
                textDecoration: "none",
                fontSize: "12px",
                marginLeft: "12px"
              },
              children: "Upgrade to unlock filters ↗"
            })]
          })
        }), filteredLogs.length === 0 ? /* @__PURE__ */ jsx("div", {
          style: {
            padding: "40px",
            textAlign: "center"
          },
          children: /* @__PURE__ */ jsxs("s-text", {
            color: "subdued",
            children: ["No ", selectedTab === "roundup" ? "Round Up" : selectedTab === "preset" ? "Preset" : selectedTab === "recurring" ? "Recurring" : "", " donation data available."]
          })
        }) : /* @__PURE__ */ jsxs(Fragment, {
          children: [/* @__PURE__ */ jsxs("table", {
            style: {
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              background: "white"
            },
            children: [/* @__PURE__ */ jsx("thead", {
              children: /* @__PURE__ */ jsxs("tr", {
                style: {
                  borderBottom: "1px solid #EBEBEB"
                },
                children: [/* @__PURE__ */ jsx("th", {
                  style: {
                    padding: "12px 10px",
                    fontWeight: "bold",
                    fontSize: "13px"
                  },
                  children: "Date"
                }), /* @__PURE__ */ jsx("th", {
                  style: {
                    padding: "12px 10px",
                    fontWeight: "bold",
                    fontSize: "13px"
                  },
                  children: "Order"
                }), /* @__PURE__ */ jsx("th", {
                  style: {
                    padding: "12px 10px",
                    fontWeight: "bold",
                    fontSize: "13px",
                    textAlign: "center"
                  },
                  children: "Type"
                }), /* @__PURE__ */ jsx("th", {
                  style: {
                    padding: "12px 10px",
                    fontWeight: "bold",
                    fontSize: "13px",
                    textAlign: "right"
                  },
                  children: "Donation Amount"
                }), /* @__PURE__ */ jsx("th", {
                  style: {
                    padding: "12px 10px",
                    fontWeight: "bold",
                    fontSize: "13px",
                    textAlign: "right"
                  },
                  children: "Order Total"
                }), /* @__PURE__ */ jsx("th", {
                  style: {
                    padding: "12px 10px",
                    fontWeight: "bold",
                    fontSize: "13px",
                    textAlign: "center"
                  },
                  children: "Receipt"
                }), /* @__PURE__ */ jsx("th", {
                  style: {
                    padding: "12px 10px",
                    fontWeight: "bold",
                    fontSize: "13px",
                    textAlign: "right"
                  },
                  children: "Action"
                })]
              })
            }), /* @__PURE__ */ jsx("tbody", {
              children: visibleLogs.map((log) => {
                var _a2, _b, _c;
                return /* @__PURE__ */ jsxs("tr", {
                  style: {
                    borderBottom: "1px solid #f0f0f0",
                    opacity: 1,
                    background: "white"
                  },
                  children: [/* @__PURE__ */ jsxs("td", {
                    style: {
                      padding: "12px 10px",
                      fontSize: "13px",
                      background: "white"
                    },
                    children: [new Date(log.createdAt).toLocaleDateString(), log.status && /* @__PURE__ */ jsx("span", {
                      style: {
                        marginLeft: "8px",
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontSize: "11px",
                        fontWeight: "600",
                        textTransform: "capitalize",
                        background: log.status === "active" ? "#e6fff1" : log.status === "paused" ? "#fff4e5" : log.status === "cancelled" ? "#fff0f0" : "#EAEAEA",
                        color: log.status === "active" ? "#008060" : log.status === "paused" ? "#965b00" : log.status === "cancelled" ? "#d72c0d" : "#5C5F62",
                        border: log.status === "active" ? "1px solid #a3e5c0" : log.status === "paused" ? "1px solid #ffcc7e" : log.status === "cancelled" ? "1px solid #ffd5d5" : "none"
                      },
                      children: log.status
                    })]
                  }), /* @__PURE__ */ jsx("td", {
                    style: {
                      padding: "12px 10px",
                      fontSize: "13px",
                      background: "white"
                    },
                    children: log.orderNumber || "Unknown"
                  }), /* @__PURE__ */ jsx("td", {
                    style: {
                      padding: "12px 10px",
                      textAlign: "center",
                      background: "white"
                    },
                    children: /* @__PURE__ */ jsx("span", {
                      style: {
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontSize: "11px",
                        color: log.visualType === "Monthly" || log.visualType === "Weekly" ? "#6C4A79" : log.visualType === "One-time" ? "#2B6CB0" : log.visualType === "Preset" ? "#008060" : log.visualType === "Round Up" ? "#965b00" : "#03080eff",
                        background: log.visualType === "Monthly" || log.visualType === "Weekly" ? "#f4ebf8" : log.visualType === "One-time" ? "#EBF8FF" : log.visualType === "Preset" ? "#e6fff1" : log.visualType === "Round Up" ? "#fff4e5" : "#e4f0f6"
                      },
                      children: log.visualType || "POS"
                    })
                  }), /* @__PURE__ */ jsx("td", {
                    style: {
                      padding: "12px 10px",
                      textAlign: "right",
                      fontWeight: "bold",
                      fontSize: "13px",
                      color: log.status !== "active" ? "#6D7175" : "#6C4A79",
                      textDecoration: log.status !== "active" ? "line-through" : "none",
                      background: "white"
                    },
                    children: moneyFormatter.format(log.donationAmount || 0)
                  }), /* @__PURE__ */ jsx("td", {
                    style: {
                      padding: "12px 10px",
                      textAlign: "right",
                      fontSize: "13px",
                      background: "white"
                    },
                    children: moneyFormatter.format(log.orderTotal || 0)
                  }), /* @__PURE__ */ jsx("td", {
                    style: {
                      padding: "12px 10px",
                      textAlign: "center",
                      background: "white"
                    },
                    children: /* @__PURE__ */ jsx("div", {
                      style: {
                        display: "inline-block",
                        padding: "4px 14px",
                        borderRadius: "25px",
                        fontSize: "11px",
                        fontWeight: "600",
                        background: log.receiptStatus === "sent" ? "#affebf " : log.receiptStatus === "failed" ? "#fbeae5" : "#f1f1f1",
                        color: log.receiptStatus === "sent" ? "#2e5648" : log.receiptStatus === "failed" ? "#8e1f0b" : "#5C5F62"
                      },
                      children: log.receiptStatus === "sent" ? "Sent" : log.receiptStatus === "failed" ? "Failed" : "Pending"
                    })
                  }), /* @__PURE__ */ jsx("td", {
                    style: {
                      padding: "12px 10px",
                      textAlign: "right",
                      background: "white"
                    },
                    children: /* @__PURE__ */ jsx("div", {
                      title: log.isResent ? "Already resent. You can resend only once" : "You can resend only once",
                      style: {
                        display: "inline-block"
                      },
                      children: /* @__PURE__ */ jsx("button", {
                        onClick: () => handleResend(log.id),
                        disabled: resendFetcher.state !== "idle" && ((_a2 = resendFetcher.formData) == null ? void 0 : _a2.get("logId")) === log.id || log.isResent,
                        style: {
                          cursor: log.isResent ? "not-allowed" : "pointer",
                          background: "#202223",
                          color: "white",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: "600",
                          opacity: log.isResent ? 0.4 : resendFetcher.state !== "idle" && ((_b = resendFetcher.formData) == null ? void 0 : _b.get("logId")) === log.id ? 0.7 : 1,
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        },
                        children: resendFetcher.state !== "idle" && ((_c = resendFetcher.formData) == null ? void 0 : _c.get("logId")) === log.id ? "Sending..." : "Resend"
                      })
                    })
                  })]
                }, log.id);
              })
            })]
          }), totalPages > 1 && /* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "10px",
              marginTop: "20px",
              borderTop: "1px solid #f0f0f0",
              paddingTop: "20px"
            },
            children: [/* @__PURE__ */ jsx("button", {
              onClick: () => setCurrentPage((p) => Math.max(1, p - 1)),
              disabled: currentPage === 1,
              style: {
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                padding: "8px 16px",
                borderRadius: "8px",
                border: currentPage === 1 ? "1px solid #8b8585" : "1px solid #202223",
                background: "white",
                color: "#202223",
                fontSize: "13px",
                fontWeight: "500",
                opacity: currentPage === 1 ? 0.6 : 1
              },
              children: "Previous"
            }), /* @__PURE__ */ jsxs("span", {
              style: {
                fontSize: "14px",
                color: "#202223",
                fontWeight: "500"
              },
              children: ["Page ", currentPage, " of ", totalPages]
            }), /* @__PURE__ */ jsx("button", {
              onClick: () => setCurrentPage((p) => Math.min(totalPages, p + 1)),
              disabled: currentPage === totalPages,
              style: {
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                padding: "8px 16px",
                borderRadius: "8px",
                border: currentPage === totalPages ? "1px solid #8b8585" : "1px solid #202223",
                background: "white",
                color: "#202223",
                fontSize: "13px",
                fontWeight: "500",
                opacity: currentPage === totalPages ? 0.6 : 1
              },
              children: "Next"
            })]
          })]
        })]
      }), /* @__PURE__ */ jsx("style", {
        children: `
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
            `
      })]
    })
  });
});
const headers$5 = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route28 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: app_donationActivity,
  headers: headers$5,
  loader: loader$a
}, Symbol.toStringTag, { value: "Module" }));
const loader$9 = async ({
  request
}) => {
  await authenticate.admin(request);
  return null;
};
const app_persetDonation = UNSAFE_withComponentProps(function PresetDonationPage() {
  return /* @__PURE__ */ jsx("s-page", {
    heading: "Preset Donations",
    children: /* @__PURE__ */ jsx("s-layout", {
      children: /* @__PURE__ */ jsx("s-layout-section", {
        children: /* @__PURE__ */ jsx("s-card", {
          children: /* @__PURE__ */ jsx("div", {
            style: {
              padding: "20px",
              textAlign: "center"
            },
            children: /* @__PURE__ */ jsx("div", {
              style: {
                fontSize: "16px",
                color: "#6D7175"
              },
              children: "Preset donation configuration is under development."
            })
          })
        })
      })
    })
  });
});
const route29 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: app_persetDonation,
  loader: loader$9
}, Symbol.toStringTag, { value: "Module" }));
function CampaignList({
  campaigns,
  pagination,
  onPageChange
}) {
  const navigate = useNavigate();
  const fetcher = useFetcher();
  if (!campaigns || campaigns.length === 0) {
    return /* @__PURE__ */ jsxs("s-stack", { gap: "base", children: [
      /* @__PURE__ */ jsx("s-heading", { children: "No Campaigns Added Yet" }),
      /* @__PURE__ */ jsx("s-paragraph", { children: "Add a campaign from the 'Add Campaign' button above." })
    ] });
  }
  const currentPage = (pagination == null ? void 0 : pagination.page) || 1;
  const totalPages = (pagination == null ? void 0 : pagination.totalPages) || 1;
  const totalCount = (pagination == null ? void 0 : pagination.totalCount) || campaigns.length;
  const itemsPerPage = (pagination == null ? void 0 : pagination.itemsPerPage) || 10;
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalCount);
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("div", { style: { overflowX: "auto" }, children: /* @__PURE__ */ jsxs(
      "table",
      {
        style: {
          width: "100%",
          borderCollapse: "collapse",
          textAlign: "left"
        },
        children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { style: { borderBottom: "1px solid #dfe3e8" }, children: [
            /* @__PURE__ */ jsx("th", { style: { padding: "12px 8px" }, children: "Sr. No." }),
            /* @__PURE__ */ jsx("th", { style: { padding: "12px 8px" }, children: "Campaign Title" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "12px 8px" }, children: "Description" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "12px 8px" }, children: "Status" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "12px 8px" }, children: "Action" })
          ] }) }),
          /* @__PURE__ */ jsx("tbody", { children: campaigns.map((campaign, index2) => /* @__PURE__ */ jsxs(
            "tr",
            {
              style: { borderBottom: "1px solid #dfe3e8" },
              children: [
                /* @__PURE__ */ jsx("td", { style: { padding: "12px 8px" }, children: startItem + index2 }),
                /* @__PURE__ */ jsx("td", { style: { padding: "12px 8px" }, children: /* @__PURE__ */ jsxs("s-stack", { direction: "inline", gap: "base", children: [
                  campaign.imageUrl && /* @__PURE__ */ jsx(
                    "img",
                    {
                      src: campaign.imageUrl,
                      alt: campaign.name,
                      style: {
                        width: "40px",
                        height: "40px",
                        objectFit: "cover",
                        borderRadius: "4px"
                      }
                    }
                  ),
                  /* @__PURE__ */ jsx("span", { children: campaign.name })
                ] }) }),
                /* @__PURE__ */ jsx("td", { style: { padding: "12px 8px", maxWidth: "300px" }, children: campaign.description }),
                /* @__PURE__ */ jsx("td", { style: { padding: "12px 8px" }, children: /* @__PURE__ */ jsx("s-badge", { tone: campaign.enabled ? "success" : "caution", children: campaign.enabled ? "Active" : "Disabled" }) }),
                /* @__PURE__ */ jsx("td", { style: { padding: "12px 8px" }, children: /* @__PURE__ */ jsxs("s-stack", { direction: "inline", gap: "base", children: [
                  /* @__PURE__ */ jsx(
                    "s-button",
                    {
                      onClick: () => navigate(`/app/preset-donation/edit/${campaign.id}`),
                      children: "Edit"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "s-button",
                    {
                      onClick: () => {
                        if (confirm(
                          "Are you sure you want to delete this campaign?"
                        )) {
                          fetcher.submit(null, {
                            method: "post",
                            action: `/app/preset-donation/delete/${campaign.id}`
                          });
                        }
                      },
                      children: "Delete"
                    }
                  )
                ] }) })
              ]
            },
            campaign.id
          )) })
        ]
      }
    ) }),
    /* @__PURE__ */ jsxs(
      "div",
      {
        style: {
          marginTop: "20px",
          padding: "16px",
          backgroundColor: "#f6f6f7",
          borderRadius: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        },
        children: [
          /* @__PURE__ */ jsxs("s-paragraph", { children: [
            "Showing ",
            /* @__PURE__ */ jsx("strong", { children: startItem }),
            " to ",
            /* @__PURE__ */ jsx("strong", { children: endItem }),
            " of",
            " ",
            /* @__PURE__ */ jsx("strong", { children: totalCount }),
            " campaigns"
          ] }),
          /* @__PURE__ */ jsxs("s-stack", { direction: "inline", gap: "base", children: [
            /* @__PURE__ */ jsx(
              "s-button",
              {
                disabled: currentPage === 1,
                onClick: () => onPageChange(currentPage - 1),
                children: "Previous"
              }
            ),
            totalPages <= 5 ? Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (pageNum) => /* @__PURE__ */ jsx(
                "s-button",
                {
                  variant: pageNum === currentPage ? "primary" : "tertiary",
                  onClick: () => onPageChange(pageNum),
                  children: pageNum
                },
                pageNum
              )
            ) : /* @__PURE__ */ jsxs(Fragment, { children: [
              currentPage > 2 && /* @__PURE__ */ jsx("s-button", { variant: "tertiary", onClick: () => onPageChange(1), children: "1" }),
              currentPage > 3 && /* @__PURE__ */ jsx("s-paragraph", { children: "..." }),
              currentPage > 1 && /* @__PURE__ */ jsx(
                "s-button",
                {
                  variant: "tertiary",
                  onClick: () => onPageChange(currentPage - 1),
                  children: currentPage - 1
                }
              ),
              /* @__PURE__ */ jsx("s-button", { variant: "primary", children: currentPage }),
              currentPage < totalPages && /* @__PURE__ */ jsx(
                "s-button",
                {
                  variant: "tertiary",
                  onClick: () => onPageChange(currentPage + 1),
                  children: currentPage + 1
                }
              ),
              currentPage < totalPages - 1 && /* @__PURE__ */ jsx("s-paragraph", { children: "..." }),
              currentPage < totalPages - 2 && /* @__PURE__ */ jsx(
                "s-button",
                {
                  variant: "tertiary",
                  onClick: () => onPageChange(totalPages),
                  children: totalPages
                }
              )
            ] }),
            /* @__PURE__ */ jsx(
              "s-button",
              {
                disabled: currentPage === totalPages,
                onClick: () => onPageChange(currentPage + 1),
                children: "Next"
              }
            )
          ] })
        ]
      }
    )
  ] });
}
function BlockCard({
  title,
  description,
  themeEditorUrl,
  buttonLabel,
  previewSvg,
  instructions,
  enabled,
  onToggle,
  isSaving
}) {
  const [internalEnabled, setInternalEnabled] = useState(enabled);
  const handleToggle = async (val) => {
    setInternalEnabled(val);
    await onToggle(val);
  };
  return /* @__PURE__ */ jsxs("div", { className: "config-card", children: [
    /* @__PURE__ */ jsxs("div", { className: "config-card__header", children: [
      /* @__PURE__ */ jsxs("div", { className: "config-card__header-text", children: [
        /* @__PURE__ */ jsx("h3", { className: "config-card__title", children: title }),
        /* @__PURE__ */ jsx("p", { className: "config-card__description", children: description })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "config-card__toggle-wrap", children: /* @__PURE__ */ jsxs("label", { className: "config-toggle", title: internalEnabled ? "Disable block" : "Enable block", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "checkbox",
            checked: internalEnabled,
            disabled: isSaving,
            onChange: (e) => handleToggle(e.target.checked)
          }
        ),
        /* @__PURE__ */ jsx("span", { className: "config-toggle__slider" }),
        /* @__PURE__ */ jsx("span", { className: "config-toggle__label", children: internalEnabled ? "Enabled" : "Disabled" })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "config-card__body", children: [
      /* @__PURE__ */ jsx("div", { className: "config-card__action-col", children: /* @__PURE__ */ jsxs(
        "a",
        {
          href: themeEditorUrl,
          target: "_top",
          rel: "noopener noreferrer",
          className: "config-card__btn",
          children: [
            buttonLabel,
            /* @__PURE__ */ jsxs(
              "svg",
              {
                xmlns: "http://www.w3.org/2000/svg",
                width: "14",
                height: "14",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2.5",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                style: { marginLeft: 6, verticalAlign: "middle" },
                children: [
                  /* @__PURE__ */ jsx("path", { d: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" }),
                  /* @__PURE__ */ jsx("polyline", { points: "15 3 21 3 21 9" }),
                  /* @__PURE__ */ jsx("line", { x1: "10", y1: "14", x2: "21", y2: "3" })
                ]
              }
            )
          ]
        }
      ) }),
      /* @__PURE__ */ jsx(
        "div",
        {
          className: "config-card__preview",
          dangerouslySetInnerHTML: { __html: previewSvg }
        }
      )
    ] }),
    /* @__PURE__ */ jsx("p", { className: "config-card__instructions", children: instructions.map((part, idx) => {
      const isHighlighted = idx % 2 === 1;
      return isHighlighted ? /* @__PURE__ */ jsx("strong", { children: part }, idx) : /* @__PURE__ */ jsx("span", { children: part }, idx);
    }) })
  ] });
}
function ConfigurationTab({
  heading: heading2 = "Add App Block via Theme Customizer",
  subheading = "Set up the donation widget on your store pages using the theme customizer.",
  blocks,
  isSaving = false
}) {
  return /* @__PURE__ */ jsxs("div", { className: "config-tab", children: [
    /* @__PURE__ */ jsxs("div", { className: "config-tab__heading-group", children: [
      /* @__PURE__ */ jsx("h2", { className: "config-tab__heading", children: heading2 }),
      /* @__PURE__ */ jsx("p", { className: "config-tab__subheading", children: subheading })
    ] }),
    blocks.map((block) => /* @__PURE__ */ jsx(BlockCard, { ...block, isSaving }, block.id)),
    /* @__PURE__ */ jsx("style", { children: `
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
      ` })
  ] });
}
const PRODUCT_PREVIEW_SVG = `
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
const CART_PREVIEW_SVG = `
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
function SettingsTab({ initialSettings, shop, onDirtyChange }) {
  const submit = useSubmit();
  const [generalSettings, setGeneralSettings] = useState({
    widgetTitle: (initialSettings == null ? void 0 : initialSettings.widgetTitle) ?? "Donation",
    buttonText: (initialSettings == null ? void 0 : initialSettings.buttonText) ?? "Donate",
    additionalCss: (initialSettings == null ? void 0 : initialSettings.additionalCss) ?? "",
    displayThankYou: (initialSettings == null ? void 0 : initialSettings.displayThankYou) ?? true,
    thankYouMessage: (initialSettings == null ? void 0 : initialSettings.thankYouMessage) ?? "Thanks for Donating!!!!!!!"
  });
  const [savedSnapshot] = useState(() => ({
    widgetTitle: (initialSettings == null ? void 0 : initialSettings.widgetTitle) ?? "Donation",
    buttonText: (initialSettings == null ? void 0 : initialSettings.buttonText) ?? "Donate",
    additionalCss: (initialSettings == null ? void 0 : initialSettings.additionalCss) ?? "",
    displayThankYou: (initialSettings == null ? void 0 : initialSettings.displayThankYou) ?? true,
    thankYouMessage: (initialSettings == null ? void 0 : initialSettings.thankYouMessage) ?? "Thanks for Donating!!!!!!!"
  }));
  const hasChanges = Object.keys(generalSettings).some(
    (key) => generalSettings[key] !== savedSnapshot[key]
  );
  useEffect(() => {
    onDirtyChange == null ? void 0 : onDirtyChange(hasChanges);
  }, [hasChanges, onDirtyChange]);
  const handleSaveSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...generalSettings
    };
    submit(
      { intent: "saveSettings", shop, settings: JSON.stringify(payload) },
      { method: "POST" }
    );
  };
  return /* @__PURE__ */ jsxs("form", { id: "settings-form", onSubmit: handleSaveSubmit, className: "settings-page", children: [
    /* @__PURE__ */ jsxs("div", { className: "settings-section", children: [
      /* @__PURE__ */ jsxs("div", { className: "settings-section__sidebar", children: [
        /* @__PURE__ */ jsx("h2", { className: "settings-section__title", children: "General Settings" }),
        /* @__PURE__ */ jsx("p", { className: "settings-section__description", children: "Please provide the key details for your donation widget." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "settings-section__content", children: /* @__PURE__ */ jsx("div", { className: "polaris-card", style: { background: "#fff", border: "1px solid #c9cccf", borderRadius: "8px", padding: "16px" }, children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: "16px" }, children: [
        /* @__PURE__ */ jsx("div", { className: "settings-field", children: /* @__PURE__ */ jsx(
          "s-text-field",
          {
            label: "Title for Donation Widget ",
            value: generalSettings.widgetTitle,
            onInput: (e) => setGeneralSettings({ ...generalSettings, widgetTitle: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsx("div", { className: "settings-field", children: /* @__PURE__ */ jsx(
          "s-text-field",
          {
            label: "Donation Button Text ",
            value: generalSettings.buttonText,
            onInput: (e) => setGeneralSettings({ ...generalSettings, buttonText: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxs("div", { className: "settings-field", children: [
          /* @__PURE__ */ jsx("label", { className: "polaris-label", style: { display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: 500 }, children: "Additional CSS" }),
          /* @__PURE__ */ jsx(
            "textarea",
            {
              className: "polaris-textarea",
              rows: 4,
              value: generalSettings.additionalCss,
              onChange: (e) => setGeneralSettings({ ...generalSettings, additionalCss: e.target.value }),
              style: { width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px", resize: "vertical", fontFamily: "inherit", fontSize: "14px" }
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "settings-field", children: [
          /* @__PURE__ */ jsx(
            "s-checkbox",
            {
              label: "Display a 'Thank You' note or message for customers who make a donation ⓘ",
              checked: generalSettings.displayThankYou,
              onChange: (e) => setGeneralSettings({ ...generalSettings, displayThankYou: e.target.checked })
            }
          ),
          generalSettings.displayThankYou && /* @__PURE__ */ jsx("div", { style: { marginTop: "8px" }, children: /* @__PURE__ */ jsx(
            "s-text-field",
            {
              value: generalSettings.thankYouMessage,
              onInput: (e) => setGeneralSettings({ ...generalSettings, thankYouMessage: e.target.value })
            }
          ) })
        ] })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsx("style", { children: `
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
      ` })
  ] });
}
const ITEMS_PER_PAGE = 10;
const loader$8 = async ({
  request
}) => {
  let isAuthenticated = false;
  let session = null;
  try {
    const auth = await authenticate.admin(request);
    session = auth.session;
    isAuthenticated = true;
  } catch (authError) {
    console.error("Authentication error:", authError);
    return {
      campaigns: [],
      error: "Authentication failed. Please refresh the page or log in again.",
      pagination: null,
      blockConfig: {
        productBlockEnabled: true,
        cartBlockEnabled: true
      },
      shop: ""
    };
  }
  if (!isAuthenticated || !session) {
    return {
      campaigns: [],
      error: "Please log in to access this page.",
      pagination: null,
      blockConfig: {
        productBlockEnabled: true,
        cartBlockEnabled: true
      },
      shop: ""
    };
  }
  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const skip = (page - 1) * ITEMS_PER_PAGE;
    const [campaigns, totalCount, blockConfig, appSettings] = await Promise.all([prisma.campaign.findMany({
      where: {
        shop: session.shop
      },
      orderBy: {
        createdAt: "desc"
      },
      skip,
      take: ITEMS_PER_PAGE
    }), prisma.campaign.count({
      where: {
        shop: session.shop
      }
    }), prisma.blockConfig.findUnique({
      where: {
        shop: session.shop
      }
    }), prisma.appSettings.findUnique({
      where: {
        shop: session.shop
      }
    })]);
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    return {
      campaigns,
      error: null,
      pagination: {
        page,
        totalPages,
        totalCount,
        itemsPerPage: ITEMS_PER_PAGE
      },
      blockConfig: blockConfig ?? {
        productBlockEnabled: true,
        cartBlockEnabled: true
      },
      shop: session.shop,
      appSettings
    };
  } catch (error) {
    console.error("Loader error:", error);
    return {
      campaigns: [],
      error: "Failed to load data. Please try again.",
      pagination: null,
      blockConfig: {
        productBlockEnabled: true,
        cartBlockEnabled: true
      },
      shop: (session == null ? void 0 : session.shop) ?? "",
      appSettings: null
    };
  }
};
const action$5 = async ({
  request
}) => {
  await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent === "getCampaigns") {
    const {
      session: adminSession
    } = await authenticate.admin(request);
    const campaigns = await prisma.campaign.findMany({
      where: {
        shop: adminSession.shop
      },
      select: {
        id: true,
        name: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    return data({
      success: true,
      campaigns
    });
  }
  if (intent === "saveSettings") {
    const shop = formData.get("shop");
    const settingsPayload = JSON.parse(formData.get("settings"));
    try {
      await prisma.appSettings.upsert({
        where: {
          shop
        },
        create: {
          shop,
          ...settingsPayload
        },
        update: {
          ...settingsPayload
        }
      });
      return data({
        success: true,
        message: "Settings saved successfully"
      });
    } catch (error) {
      console.error(error);
      return data({
        success: false,
        error: "Failed to save settings"
      }, {
        status: 500
      });
    }
  }
  return data({
    success: false,
    error: "Invalid intent"
  }, {
    status: 400
  });
};
const tabs = [{
  id: "campaign",
  label: "Donation Campaigns"
}, {
  id: "settings",
  label: "Settings"
}, {
  id: "config",
  label: "Configuration"
}];
const app_presetDonation = UNSAFE_withComponentProps(function PresetDonation() {
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const shopify2 = useAppBridge();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(initialTabParam === "configuration" ? "config" : initialTabParam === "settings" ? "settings" : "campaign");
  const isSubmitting = fetcher.state === "submitting" && fetcher.formMethod === "POST";
  const [isSettingsDirty, setIsSettingsDirty] = useState(false);
  useEffect(() => {
    var _a2;
    if (((_a2 = fetcher.data) == null ? void 0 : _a2.status) === "success") {
      shopify2.toast.show("Settings saved successfully");
      setIsSettingsDirty(false);
    }
  }, [fetcher.data, shopify2]);
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "configuration") setActiveTab("config");
    else if (tab === "settings") setActiveTab("settings");
    else if (tab === "campaign") setActiveTab("campaign");
  }, [searchParams]);
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const tabParam = tabId === "config" ? "configuration" : tabId;
    setSearchParams({
      tab: tabParam
    });
  };
  const {
    campaigns,
    error,
    pagination,
    blockConfig,
    shop,
    appSettings
  } = useLoaderData();
  const handlePageChange = (newPage) => {
    setSearchParams({
      page: String(newPage)
    });
  };
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "Donation Preferences",
    children: [activeTab === "campaign" && /* @__PURE__ */ jsx("s-button", {
      slot: "primary-action",
      variant: "primary",
      onClick: () => navigate("/app/preset-donation/add"),
      children: "Add Campaign"
    }), activeTab === "settings" && /* @__PURE__ */ jsx("s-button", {
      slot: "primary-action",
      variant: "primary",
      disabled: !isSettingsDirty || isSubmitting,
      onClick: () => {
        const form2 = document.getElementById("settings-form");
        if (form2) form2.dispatchEvent(new Event("submit", {
          cancelable: true,
          bubbles: true
        }));
      },
      ...isSubmitting ? {
        loading: true
      } : {},
      children: isSubmitting ? "Saving..." : isSettingsDirty ? "Save Settings" : "No Changes"
    }), /* @__PURE__ */ jsx("div", {
      className: "polaris-tabs",
      children: /* @__PURE__ */ jsx("div", {
        className: "polaris-tabs-list",
        role: "tablist",
        children: tabs.map((tab) => /* @__PURE__ */ jsx("button", {
          role: "tab",
          "aria-selected": activeTab === tab.id,
          className: `polaris-tab ${activeTab === tab.id ? "active" : ""}`,
          onClick: () => handleTabChange(tab.id),
          children: tab.label
        }, tab.id))
      })
    }), /* @__PURE__ */ jsxs("div", {
      className: "polaris-tab-panel",
      children: [activeTab === "settings" && /* @__PURE__ */ jsx("s-section", {
        children: /* @__PURE__ */ jsx(SettingsTab, {
          initialSettings: appSettings,
          shop,
          onDirtyChange: setIsSettingsDirty
        })
      }), activeTab === "campaign" && /* @__PURE__ */ jsx("s-section", {
        children: error ? /* @__PURE__ */ jsx("s-banner", {
          tone: "critical",
          children: /* @__PURE__ */ jsx("s-paragraph", {
            children: error
          })
        }) : /* @__PURE__ */ jsx(CampaignList, {
          campaigns,
          pagination,
          onPageChange: handlePageChange
        })
      }), activeTab === "config" && /* @__PURE__ */ jsx("s-section", {
        children: /* @__PURE__ */ jsx(ConfigurationTab, {
          blocks: [{
            id: "product",
            title: "Product Page Setup",
            description: "To add the donation section to your product page, click the button below to insert the app block.",
            themeEditorUrl: `https://${shop}/admin/themes/current/editor?template=product&context=apps`,
            buttonLabel: "Donation App Block on Product Page",
            previewSvg: PRODUCT_PREVIEW_SVG,
            enabled: blockConfig.productBlockEnabled,
            instructions: ["Go to ", "Online Store → Themes", " → Click on ", "Customize", " → Select Product Page Template ", "Click Add Block", " → Select ", "Donation Product Page", " → Click ", "Save"],
            onToggle: (enabled) => {
              const formData = new FormData();
              formData.append("productBlockEnabled", String(enabled));
              formData.append("cartBlockEnabled", String(blockConfig.cartBlockEnabled));
              fetcher.submit(formData, {
                method: "POST",
                action: "/api/block-config"
              });
            }
          }, {
            id: "cart",
            title: "Cart Page Setup",
            description: "To add the donation section to your cart page, click the button below to insert the app block.",
            themeEditorUrl: `https://${shop}/admin/themes/current/editor?template=cart&context=apps`,
            buttonLabel: "Donation App Block on Cart Page",
            previewSvg: CART_PREVIEW_SVG,
            enabled: blockConfig.cartBlockEnabled,
            instructions: ["Go to ", "Online Store → Themes", " → Click on ", "Customize", " → Select Cart Page Template ", "Click Add Block", " → Select ", "Donation Cart Widget", " → Click ", "Save"],
            onToggle: (enabled) => {
              const formData = new FormData();
              formData.append("productBlockEnabled", String(blockConfig.productBlockEnabled));
              formData.append("cartBlockEnabled", String(enabled));
              fetcher.submit(formData, {
                method: "POST",
                action: "/api/block-config"
              });
            }
          }]
        })
      })]
    }), /* @__PURE__ */ jsx("style", {
      children: `
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
      `
    })]
  });
});
const route30 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$5,
  default: app_presetDonation,
  loader: loader$8
}, Symbol.toStringTag, { value: "Module" }));
const RichTextEditor = ({ value, onChange, label: label2, disabled }) => {
  const editorRef = useRef(null);
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);
  const execCommand = (command, arg) => {
    if (disabled) return;
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };
  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: "4px", opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? "none" : "auto" }, children: [
    label2 && /* @__PURE__ */ jsx("div", { style: { fontSize: "13px", fontWeight: 500, color: "#202223" }, children: label2 }),
    /* @__PURE__ */ jsxs("div", { style: { border: "1px solid #c9cccf", borderRadius: "4px", overflow: "hidden", background: "#fff" }, children: [
      /* @__PURE__ */ jsxs("div", { style: { borderBottom: "1px solid #c9cccf", padding: "6px 8px", display: "flex", gap: "4px", background: "#fafbfc", alignItems: "center", flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxs(
          "select",
          {
            onChange: (e) => execCommand("formatBlock", e.target.value),
            defaultValue: "p",
            disabled,
            style: { padding: "4px", margin: "0 4px", border: "1px solid #c9cccf", borderRadius: "4px", fontSize: "13px", color: "#202223", background: "#fff", cursor: "pointer" },
            children: [
              /* @__PURE__ */ jsx("option", { value: "p", children: "Paragraph" }),
              /* @__PURE__ */ jsx("option", { value: "h1", children: "Heading 1" }),
              /* @__PURE__ */ jsx("option", { value: "h2", children: "Heading 2" }),
              /* @__PURE__ */ jsx("option", { value: "h3", children: "Heading 3" })
            ]
          }
        ),
        /* @__PURE__ */ jsx("div", { style: { width: "1px", height: "20px", background: "#c9cccf", margin: "0 4px" } }),
        /* @__PURE__ */ jsx("button", { type: "button", onClick: () => execCommand("bold"), disabled, style: { border: "none", background: "transparent", cursor: "pointer", padding: "4px 6px", color: "#202223", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }, title: "Bold", children: /* @__PURE__ */ jsx("svg", { viewBox: "0 0 20 20", style: { width: "16px", height: "16px", fill: "currentColor" }, children: /* @__PURE__ */ jsx("path", { d: "M12.44 9.08c1.37-.62 2.16-1.89 2.16-3.33 0-2.45-2-4.25-4.85-4.25H4.25v15h5.81c3.1 0 5.19-2 5.19-4.5 0-1.83-1.02-3.23-2.81-2.92zM7.25 4.5h2.5c1.34 0 2.22.84 2.22 1.94 0 1.1-.88 1.94-2.22 1.94H7.25V4.5zm0 9.5v-4h2.8c1.55 0 2.62.9 2.62 2.06s-1.07 1.94-2.62 1.94h-2.8z" }) }) }),
        /* @__PURE__ */ jsx("button", { type: "button", onClick: () => execCommand("italic"), disabled, style: { border: "none", background: "transparent", cursor: "pointer", padding: "4px 6px", color: "#202223", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }, title: "Italic", children: /* @__PURE__ */ jsx("svg", { viewBox: "0 0 20 20", style: { width: "16px", height: "16px", fill: "currentColor" }, children: /* @__PURE__ */ jsx("path", { d: "M8 2h6v2h-1.63l-2.74 9H11.5v2h-6v-2h1.63l2.74-9H8V2z" }) }) }),
        /* @__PURE__ */ jsx("button", { type: "button", onClick: () => execCommand("underline"), disabled, style: { border: "none", background: "transparent", cursor: "pointer", padding: "4px 6px", color: "#202223", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }, title: "Underline", children: /* @__PURE__ */ jsx("svg", { viewBox: "0 0 20 20", style: { width: "16px", height: "16px", fill: "currentColor" }, children: /* @__PURE__ */ jsx("path", { d: "M10 14c3.31 0 6-2.69 6-6V3h-2.5v5c0 1.93-1.57 3.5-3.5 3.5S6.5 9.93 6.5 8V3H4v5c0 3.31 2.69 6 6 6zm-6 2h12v2H4v-2z" }) }) }),
        /* @__PURE__ */ jsx("div", { style: { width: "1px", height: "20px", background: "#c9cccf", margin: "0 4px" } }),
        /* @__PURE__ */ jsx("button", { type: "button", onClick: () => execCommand("insertUnorderedList"), disabled, style: { border: "none", background: "transparent", cursor: "pointer", padding: "4px 6px", color: "#202223", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }, title: "Bullet List", children: /* @__PURE__ */ jsx("svg", { viewBox: "0 0 20 20", style: { width: "16px", height: "16px", fill: "currentColor" }, children: /* @__PURE__ */ jsx("path", { d: "M6 5h12v2H6V5zm0 4h12v2H6V9zm0 4h12v2H6v-2zM3 5h2v2H3V5zm0 4h2v2H3V9zm0 4h2v2H3v-2z" }) }) }),
        /* @__PURE__ */ jsx("button", { type: "button", onClick: () => execCommand("insertOrderedList"), disabled, style: { border: "none", background: "transparent", cursor: "pointer", padding: "4px 6px", color: "#202223", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }, title: "Numbered List", children: /* @__PURE__ */ jsx("svg", { viewBox: "0 0 20 20", style: { width: "16px", height: "16px", fill: "currentColor" }, children: /* @__PURE__ */ jsx("path", { d: "M7 5h11v2H7V5zm0 4h11v2H7V9zm0 4h11v2H7v-2zM3.5 5H5v2H3.5V5zm0 4H5v2H3.5V9zm0 4H5v2H3.5v-2z" }) }) }),
        /* @__PURE__ */ jsx("div", { style: { width: "1px", height: "20px", background: "#c9cccf", margin: "0 4px" } }),
        /* @__PURE__ */ jsx("button", { type: "button", onClick: () => {
          const url = prompt("Enter URL:");
          if (url) execCommand("createLink", url);
        }, disabled, style: { border: "none", background: "transparent", cursor: "pointer", padding: "4px 6px", color: "#202223", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }, title: "Link", children: /* @__PURE__ */ jsx("svg", { viewBox: "0 0 20 20", style: { width: "16px", height: "16px", fill: "currentColor" }, children: /* @__PURE__ */ jsx("path", { d: "M14.6 7.42a1.5 1.5 0 0 0-2.12-2.12l-1.42 1.41a1.5 1.5 0 0 0 2.12 2.13l.71-.71.71.71a.5.5 0 0 1 0 .71l-2.12 2.12a.5.5 0 0 1-.71 0 .5.5 0 0 1 0-.71l.71-.71-.71-.71a1.5 1.5 0 0 0-2.12 0l-2.12 2.12a1.5 1.5 0 0 0 2.12 2.12l1.42-1.41a1.5 1.5 0 0 0-2.12-2.13l-.71.71-.71-.71a.5.5 0 0 1 0-.71l2.12-2.12a.5.5 0 0 1 .71 0 .5.5 0 0 1 0 .71l-.71.71.71.71a1.5 1.5 0 0 0 2.12 0l2.12-2.12z" }) }) }),
        /* @__PURE__ */ jsx("div", { style: { width: "1px", height: "20px", background: "#c9cccf", margin: "0 4px" } }),
        /* @__PURE__ */ jsx("button", { type: "button", onClick: () => execCommand("undo"), disabled, style: { border: "none", background: "transparent", cursor: "pointer", padding: "4px 6px", color: "#202223", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }, title: "Undo", children: /* @__PURE__ */ jsx("svg", { viewBox: "0 0 20 20", style: { width: "16px", height: "16px", fill: "currentColor" }, children: /* @__PURE__ */ jsx("path", { d: "M8 14.5a.5.5 0 0 1 0 1C4.13 15.5 1 12.37 1 8.5S4.13 1.5 8 1.5A6.47 6.47 0 0 1 12.6 3.4L14.5 1.5a.5.5 0 0 1 .85.35v6a.5.5 0 0 1-.5.5h-6A.5.5 0 0 1 8.5 7.5v-.5a.5.5 0 0 1 .15-.35l1.9-1.9A5.47 5.47 0 0 0 8 2.5c-3.31 0-6 2.69-6 6s2.69 6 6 6z" }) }) }),
        /* @__PURE__ */ jsx("button", { type: "button", onClick: () => execCommand("redo"), disabled, style: { border: "none", background: "transparent", cursor: "pointer", padding: "4px 6px", color: "#202223", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }, title: "Redo", children: /* @__PURE__ */ jsx("svg", { viewBox: "0 0 20 20", style: { width: "16px", height: "16px", fill: "currentColor" }, children: /* @__PURE__ */ jsx("path", { d: "M12 14.5a.5.5 0 0 0 0 1c3.87 0 7-3.13 7-7s-3.13-7-7-7a6.47 6.47 0 0 0-4.6 1.9L5.5 1.5a.5.5 0 0 0-.85.35v6A.5.5 0 0 0 5.15 8.35h6a.5.5 0 0 0 .35-.85L9.6 5.6A5.47 5.47 0 0 1 12 2.5c3.31 0 6 2.69 6 6s-2.69 6-6 6z" }) }) })
      ] }),
      /* @__PURE__ */ jsx(
        "div",
        {
          ref: editorRef,
          contentEditable: !disabled,
          onInput: handleInput,
          onBlur: handleInput,
          style: { minHeight: "150px", padding: "12px", outline: "none", fontSize: "14px", lineHeight: "1.5", cursor: "text", background: "#fff" }
        }
      )
    ] })
  ] });
};
const DEFAULT_SETTINGS$1 = {
  contactEmail: "donations@yourstore.com",
  ccEmail: "",
  logoUrl: "",
  receiptSubject: "Thank you for your donation",
  receiptBody: `<h2 style="color:#008060;">Thank You for Your Donation ❤️</h2>

<p>Hello <strong>{{first_name}}</strong>,</p>

<p>We truly appreciate your generous contribution. Here are your donation details:</p>

<hr />

<p><strong>Donation Name:</strong> {{donation_name}}</p>
<p><strong>Order Number:</strong> {{orderNumber}}</p>
<p><strong>Date:</strong> {{date}}</p>
<p><strong>Amount:</strong> {{currency}}{{amount}}</p>

<hr />

<p>Your support helps us make a meaningful impact.</p>

<p>Thank you for your kindness ❤️</p>`,
  refundSubject: "Donation Refund Confirmation",
  refundBody: `<h2 style="color:#d82c0d;">Donation Refund Processed</h2>

<p>Hello <strong>{{first_name}}</strong>,</p>

<p>Your donation has been successfully refunded.</p>

<hr />

<p><strong>Donation Name:</strong> {{donation_name}}</p>
<p><strong>Order Number:</strong> {{orderNumber}}</p>
<p><strong>Refund Amount:</strong> {{currency}}{{amount}}</p>
<p><strong>Date:</strong> {{date}}</p>

<hr />

<p>The amount will reflect in your account within a few business days.</p>

<p>If you have any questions, feel free to contact us.</p>`,
  cancelSubject: "Donation Cancellation",
  cancelBody: `<h2 style="color:#6d7175;">Donation Cancelled</h2>

<p>Hello <strong>{{first_name}}</strong>,</p>

<p>Your donation has been cancelled successfully.</p>

<hr />

<p><strong>Donation Name:</strong> {{donation_name}}</p>
<p><strong>Order Number:</strong> {{orderNumber}}</p>
<p><strong>Amount:</strong> {{currency}}{{amount}}</p>
<p><strong>Date:</strong> {{date}}</p>

<hr />

<p>If this was not intended, please reach out to us.</p>

<p>We appreciate your support 🙏</p>`,
  pauseSubject: "Subscription Paused",
  pauseBody: `<h2 style="color:#92400e;">Subscription Paused</h2>

<p>Hello <strong>{{first_name}}</strong>,</p>

<p>Your subscription for <strong>{{donation_name}}</strong> has been paused.</p>

<hr />

<p><strong>Order Number:</strong> {{orderNumber}}</p>
<p><strong>Amount:</strong> {{currency}}{{amount}}</p>
<p><strong>Frequency:</strong> {{frequency}}</p>

<hr />

<p>You can resume your subscription at any time from your account management page.</p>

<p>Thank you for your support ❤️</p>`,
  resumeSubject: "Subscription Resumed",
  resumeBody: `<h2 style="color:#008060;">Subscription Resumed</h2>

<p>Hello <strong>{{first_name}}</strong>,</p>

<p>Your subscription for <strong>{{donation_name}}</strong> has been successfully resumed.</p>

<hr />

<p><strong>Order Number:</strong> {{orderNumber}}</p>
<p><strong>Amount:</strong> {{currency}}{{amount}}</p>
<p><strong>Frequency:</strong> {{frequency}}</p>
<p><strong>Next Billing Date:</strong> {{nextBillingDate}}</p>

<hr />

<p>We are glad to have you back!</p>

<p>Thank you for your continued support ❤️</p>`
};
const loader$7 = async ({
  request
}) => {
  const {
    session
  } = await authenticate.admin(request);
  const shop = session.shop;
  const settings = await prisma.emailSettings.findUnique({
    where: {
      shop
    }
  });
  const subscription = await prisma.planSubscription.findUnique({
    where: {
      shop
    }
  });
  return {
    settings: settings ?? {
      ...DEFAULT_SETTINGS$1
    },
    plan: (subscription == null ? void 0 : subscription.plan) ?? "basic",
    shop
  };
};
const action$4 = async ({
  request
}) => {
  const {
    session
  } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const data2 = {
    contactEmail: formData.get("contactEmail") || DEFAULT_SETTINGS$1.contactEmail,
    ccEmail: formData.get("ccEmail") || "",
    logoUrl: formData.get("logoUrl") || "",
    receiptSubject: formData.get("receiptSubject") || DEFAULT_SETTINGS$1.receiptSubject,
    receiptBody: formData.get("receiptBody") || DEFAULT_SETTINGS$1.receiptBody,
    refundSubject: formData.get("refundSubject") || DEFAULT_SETTINGS$1.refundSubject,
    refundBody: formData.get("refundBody") || DEFAULT_SETTINGS$1.refundBody,
    cancelSubject: formData.get("cancelSubject") || DEFAULT_SETTINGS$1.cancelSubject,
    cancelBody: formData.get("cancelBody") || DEFAULT_SETTINGS$1.cancelBody,
    pauseSubject: formData.get("pauseSubject") || DEFAULT_SETTINGS$1.pauseSubject,
    pauseBody: formData.get("pauseBody") || DEFAULT_SETTINGS$1.pauseBody,
    resumeSubject: formData.get("resumeSubject") || DEFAULT_SETTINGS$1.resumeSubject,
    resumeBody: formData.get("resumeBody") || DEFAULT_SETTINGS$1.resumeBody
  };
  await prisma.emailSettings.upsert({
    where: {
      shop
    },
    update: data2,
    create: {
      shop,
      ...data2
    }
  });
  return {
    status: "success"
  };
};
const app_emailSettings = UNSAFE_withComponentProps(function EmailSettingsPage() {
  const {
    settings: savedSettings,
    plan
  } = useLoaderData();
  const fetcher = useFetcher();
  const shopify2 = useAppBridge();
  const [settings, setSettings] = useState({
    contactEmail: savedSettings.contactEmail,
    ccEmail: savedSettings.ccEmail || "",
    logoUrl: savedSettings.logoUrl || "",
    receiptSubject: savedSettings.receiptSubject,
    receiptBody: savedSettings.receiptBody,
    refundSubject: savedSettings.refundSubject,
    refundBody: savedSettings.refundBody,
    cancelSubject: savedSettings.cancelSubject,
    cancelBody: savedSettings.cancelBody,
    pauseSubject: savedSettings.pauseSubject || DEFAULT_SETTINGS$1.pauseSubject,
    pauseBody: savedSettings.pauseBody || DEFAULT_SETTINGS$1.pauseBody,
    resumeSubject: savedSettings.resumeSubject || DEFAULT_SETTINGS$1.resumeSubject,
    resumeBody: savedSettings.resumeBody || DEFAULT_SETTINGS$1.resumeBody
  });
  const [initialSettings] = useState(() => ({
    ...settings
  }));
  const hasChanges = Object.keys(settings).some((key) => settings[key] !== initialSettings[key]);
  const [selectedTab, setSelectedTab] = useState("receipt");
  const isSaving = fetcher.state === "submitting" && fetcher.formMethod === "POST";
  useEffect(() => {
    var _a2;
    if (((_a2 = fetcher.data) == null ? void 0 : _a2.status) === "success") {
      shopify2.toast.show("Email settings saved successfully");
    }
  }, [fetcher.data, shopify2]);
  const handleSettingChange = useCallback((field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value
    }));
  }, []);
  const handleSave = useCallback(() => {
    const formData = new FormData();
    Object.entries(settings).forEach(([key, value]) => {
      formData.append(key, value);
    });
    fetcher.submit(formData, {
      method: "POST"
    });
  }, [settings, fetcher]);
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "Email Configuration Settings",
    children: [/* @__PURE__ */ jsx("s-button", {
      slot: "primary-action",
      variant: "primary",
      onClick: handleSave,
      disabled: isSaving || !hasChanges,
      ...isSaving ? {
        loading: true
      } : {},
      children: isSaving ? "Saving..." : hasChanges ? "Save" : "No Changes"
    }), /* @__PURE__ */ jsxs("div", {
      style: {
        display: "flex",
        gap: "24px",
        marginTop: "16px"
      },
      children: [/* @__PURE__ */ jsx("div", {
        style: {
          flex: "0 0 250px"
        },
        children: /* @__PURE__ */ jsx("s-text", {
          color: "subdued",
          children: "Configure the email settings for the donation section. Ensure all fields are filled out correctly for proper functioning."
        })
      }), /* @__PURE__ */ jsx("div", {
        style: {
          flex: 1
        },
        children: /* @__PURE__ */ jsx("s-box", {
          padding: "large-200",
          borderWidth: "base",
          borderRadius: "large-100",
          background: "subdued",
          children: /* @__PURE__ */ jsxs("s-stack", {
            direction: "block",
            gap: "large-200",
            children: [/* @__PURE__ */ jsxs("s-box", {
              children: [/* @__PURE__ */ jsxs("div", {
                style: {
                  marginBottom: "16px"
                },
                children: [/* @__PURE__ */ jsx("s-text-field", {
                  label: "Your Contact Email",
                  value: settings.contactEmail,
                  onChange: (e) => handleSettingChange("contactEmail", e.target.value)
                }), /* @__PURE__ */ jsx("div", {
                  style: {
                    marginTop: "4px"
                  },
                  children: /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "Customers who reply to the email will reach you at this address."
                  })
                })]
              }), /* @__PURE__ */ jsx("div", {
                style: {
                  marginBottom: "16px"
                },
                children: /* @__PURE__ */ jsx("s-text-field", {
                  label: "Additional/CC Email ID (Optional)",
                  value: settings.ccEmail,
                  onChange: (e) => handleSettingChange("ccEmail", e.target.value)
                })
              }), /* @__PURE__ */ jsxs("div", {
                style: {
                  marginBottom: "16px"
                },
                children: [/* @__PURE__ */ jsx("div", {
                  style: {
                    marginBottom: "8px"
                  },
                  children: /* @__PURE__ */ jsx("strong", {
                    children: "Email Logo (Optional)"
                  })
                }), /* @__PURE__ */ jsxs("div", {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "12px"
                  },
                  children: [/* @__PURE__ */ jsx("s-button", {
                    onClick: () => {
                      var _a2;
                      return (_a2 = document.getElementById("logo-upload")) == null ? void 0 : _a2.click();
                    },
                    children: "Upload Logo"
                  }), /* @__PURE__ */ jsx("input", {
                    id: "logo-upload",
                    type: "file",
                    accept: "image/*",
                    style: {
                      display: "none"
                    },
                    onChange: (e) => {
                      var _a2;
                      const file = (_a2 = e.target.files) == null ? void 0 : _a2[0];
                      if (file) {
                        if (file.size > 1024 * 1024) {
                          shopify2.toast.show("File too large. Please use an image under 1MB.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          handleSettingChange("logoUrl", event.target.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }
                  }), settings.logoUrl && /* @__PURE__ */ jsx("s-button", {
                    variant: "tertiary",
                    tone: "critical",
                    onClick: () => handleSettingChange("logoUrl", ""),
                    children: "Remove"
                  })]
                }), settings.logoUrl && /* @__PURE__ */ jsx("div", {
                  style: {
                    marginTop: "12px",
                    padding: "12px",
                    background: "#fff",
                    borderRadius: "4px",
                    border: "1px solid #eee",
                    display: "inline-block"
                  },
                  children: /* @__PURE__ */ jsx("img", {
                    src: settings.logoUrl,
                    alt: "Logo Preview",
                    style: {
                      maxHeight: "60px",
                      display: "block"
                    }
                  })
                })]
              })]
            }), /* @__PURE__ */ jsxs("s-box", {
              children: [/* @__PURE__ */ jsx("div", {
                className: "polaris-tabs",
                children: /* @__PURE__ */ jsx("div", {
                  className: "polaris-tabs-list",
                  role: "tablist",
                  children: [{
                    id: "receipt",
                    label: "Receipt Template"
                  }, {
                    id: "refund",
                    label: "Refund Template"
                  }, {
                    id: "cancel",
                    label: "Cancellation Template"
                  }].map((tab) => /* @__PURE__ */ jsx("button", {
                    role: "tab",
                    "aria-selected": selectedTab === tab.id,
                    className: `polaris-tab ${selectedTab === tab.id ? "active" : ""}`,
                    onClick: () => setSelectedTab(tab.id),
                    children: tab.label
                  }, tab.id))
                })
              }), /* @__PURE__ */ jsx("s-stack", {
                direction: "block",
                gap: "base",
                children: selectedTab === "refund" && !checkFeatureAccess(plan, "canSendRefundEmail") || selectedTab === "cancel" && !checkFeatureAccess(plan, "canSendCancelEmail") ? /* @__PURE__ */ jsx("s-box", {
                  padding: "large-200",
                  background: "subdued",
                  borderRadius: "base",
                  borderWidth: "base",
                  children: /* @__PURE__ */ jsx("s-stack", {
                    direction: "block",
                    gap: "base",
                    children: /* @__PURE__ */ jsxs("div", {
                      style: {
                        textAlign: "center",
                        width: "100%"
                      },
                      children: [/* @__PURE__ */ jsx("s-text", {
                        type: "strong",
                        children: "Plan Upgrade Required"
                      }), /* @__PURE__ */ jsx("s-box", {
                        "padding-block-start": "base",
                        children: /* @__PURE__ */ jsxs("s-text", {
                          color: "subdued",
                          children: ["The ", selectedTab, " email feature is available on the", /* @__PURE__ */ jsxs("strong", {
                            children: [" ", selectedTab === "refund" ? "Advanced" : "Pro"]
                          }), " plan and above."]
                        })
                      }), /* @__PURE__ */ jsx("s-box", {
                        "padding-block-start": "base",
                        children: /* @__PURE__ */ jsx(Link, {
                          to: "/app/pricing",
                          style: {
                            textDecoration: "none"
                          },
                          children: /* @__PURE__ */ jsx("s-button", {
                            variant: "primary",
                            children: "View Pricing Plans"
                          })
                        })
                      })]
                    })
                  })
                }) : /* @__PURE__ */ jsxs(Fragment, {
                  children: [/* @__PURE__ */ jsx("s-text-field", {
                    label: "Email Subject Line",
                    disabled: !checkFeatureAccess(plan, "canEditTemplates"),
                    value: selectedTab === "receipt" ? settings.receiptSubject : selectedTab === "refund" ? settings.refundSubject : settings.cancelSubject,
                    onInput: (e) => handleSettingChange(selectedTab === "receipt" ? "receiptSubject" : selectedTab === "refund" ? "refundSubject" : "cancelSubject", e.target.value)
                  }), /* @__PURE__ */ jsxs("div", {
                    children: [/* @__PURE__ */ jsxs("div", {
                      style: {
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "8px"
                      },
                      children: [/* @__PURE__ */ jsx("span", {
                        style: {
                          fontWeight: 500
                        },
                        children: "Email Template"
                      }), !checkFeatureAccess(plan, "canEditTemplates") && /* @__PURE__ */ jsx("s-badge", {
                        tone: "caution",
                        children: "View Only"
                      })]
                    }), /* @__PURE__ */ jsxs("div", {
                      style: {
                        padding: "12px",
                        background: "#f4f6f8",
                        borderRadius: "4px",
                        fontSize: "13px",
                        marginBottom: "12px",
                        color: "#5c5f62"
                      },
                      children: [/* @__PURE__ */ jsx("strong", {
                        children: "Available Variables:"
                      }), " ", /* @__PURE__ */ jsx("code", {
                        children: `{{first_name}}`
                      }), ", ", /* @__PURE__ */ jsx("code", {
                        children: `{{last_name}}`
                      }), ", ", /* @__PURE__ */ jsx("code", {
                        children: `{{email}}`
                      }), ", ", /* @__PURE__ */ jsx("code", {
                        children: `{{currency}}`
                      }), ", ", /* @__PURE__ */ jsx("code", {
                        children: `{{amount}}`
                      }), ", ", /* @__PURE__ */ jsx("code", {
                        children: `{{orderNumber}}`
                      }), ", ", /* @__PURE__ */ jsx("code", {
                        children: `{{date}}`
                      }), ", ", /* @__PURE__ */ jsx("code", {
                        children: `{{donation_name}}`
                      }), ", ", /* @__PURE__ */ jsx("code", {
                        children: `{{frequency}}`
                      }), ", ", /* @__PURE__ */ jsx("code", {
                        children: `{{nextBillingDate}}`
                      })]
                    }), !checkFeatureAccess(plan, "canEditTemplates") && /* @__PURE__ */ jsx("div", {
                      style: {
                        marginBottom: "12px"
                      },
                      children: /* @__PURE__ */ jsxs("s-banner", {
                        tone: "info",
                        children: [/* @__PURE__ */ jsx("div", {
                          slot: "title",
                          children: "Custom Templates Locked"
                        }), /* @__PURE__ */ jsxs("p", {
                          children: ["Upgrade to the ", /* @__PURE__ */ jsx("strong", {
                            children: "Pro"
                          }), " plan to customize your email templates with dynamic variables."]
                        })]
                      })
                    }), /* @__PURE__ */ jsx(RichTextEditor, {
                      disabled: !checkFeatureAccess(plan, "canEditTemplates"),
                      value: selectedTab === "receipt" ? settings.receiptBody : selectedTab === "refund" ? settings.refundBody : settings.cancelBody,
                      onChange: (value) => handleSettingChange(selectedTab === "receipt" ? "receiptBody" : selectedTab === "refund" ? "refundBody" : "cancelBody", value)
                    })]
                  })]
                })
              })]
            })]
          })
        })
      })]
    }), /* @__PURE__ */ jsx("style", {
      children: `
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
            `
    })]
  });
});
const headers$4 = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route31 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$4,
  default: app_emailSettings,
  headers: headers$4,
  loader: loader$7
}, Symbol.toStringTag, { value: "Module" }));
Chart.register(...registerables);
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const loader$6 = async ({
  request
}) => {
  const {
    session
  } = await authenticate.admin(request);
  const shop = session.shop;
  const campaigns = await prisma.campaign.findMany({
    where: {
      shop
    },
    select: {
      id: true,
      name: true
    },
    orderBy: {
      name: "asc"
    }
  });
  const START_YEAR = 2020;
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  const years = Array.from({
    length: currentYear - START_YEAR + 1
  }, (_, i) => (START_YEAR + i).toString());
  const url = new URL(request.url);
  const typeFilter = url.searchParams.get("type") || "all";
  const campaign_name = url.searchParams.get("campaign_name");
  const requestYear = url.searchParams.get("year") || currentYear.toString();
  let chartData = [];
  try {
    const startDate = new Date(parseInt(requestYear), 0, 1);
    const endDate = new Date(parseInt(requestYear) + 1, 0, 1);
    const where = {
      createdAt: {
        gte: startDate,
        lt: endDate
      }
    };
    let allDonations = [];
    if (typeFilter === "all" || typeFilter === "preset") {
      const campaignWhere = {
        ...where
      };
      if (campaign_name && campaign_name !== "all") {
        campaignWhere.campaign = {
          name: campaign_name
        };
      }
      const presetDonations = await prisma.donation.findMany({
        where: {
          ...campaignWhere,
          campaign: {
            shop
          }
        },
        select: {
          amount: true,
          createdAt: true
        }
      });
      allDonations = [...allDonations, ...presetDonations];
    }
    if (typeFilter === "all" || typeFilter === "pos" || typeFilter === "roundup") {
      const rawLogs = await prisma.posDonationLog.findMany({
        where: {
          shop
        }
      });
      const filteredPos = rawLogs.filter((l) => {
        const dDate = new Date(l.createdAt);
        if (dDate < startDate || dDate >= endDate) return false;
        if (typeFilter === "all") return true;
        return l.type === typeFilter;
      });
      allDonations = [...allDonations, ...filteredPos.map((d) => ({
        amount: d.donationAmount,
        createdAt: new Date(d.createdAt)
      }))];
    }
    if (typeFilter === "all" || typeFilter === "recurring") {
      const rawRecurring = await prisma.recurringDonationLog.findMany({
        where: {
          shop
        }
      });
      const filteredRecurring = rawRecurring.filter((l) => {
        const dDate = new Date(l.createdAt);
        return dDate >= startDate && dDate < endDate;
      });
      allDonations = [...allDonations, ...filteredRecurring.map((d) => ({
        amount: d.donationAmount,
        createdAt: new Date(d.createdAt)
      }))];
    }
    chartData = MONTHS.map((month, index2) => {
      const monthDonations = allDonations.filter((d) => d.createdAt.getMonth() === index2);
      const totalAmount = monthDonations.reduce((sum, d) => sum + d.amount, 0);
      return {
        month,
        amount: totalAmount
      };
    });
  } catch (error) {
    console.error("Error fetching donation filter metrics:", error);
  }
  return data({
    campaigns,
    years,
    chartData,
    query: {
      campaign_name,
      requestYear,
      typeFilter
    }
  });
};
const app_trackDonation = UNSAFE_withComponentProps(function TrackDonationPage() {
  const {
    campaigns: trackCampaigns,
    years,
    chartData,
    query
  } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [selectedType, setSelectedType] = useState(query.typeFilter || "all");
  const [selectedDonationName, setSelectedDonationName] = useState(query.campaign_name || "all");
  const [selectedYear, setSelectedYear] = useState(query.requestYear || "all");
  const chartInstance = useRef(null);
  const isLoading = navigation.state === "loading" || navigation.state === "submitting";
  useEffect(() => {
    const canvas = document.getElementById("donation-chart");
    if (canvas && chartData.length > 0) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      const ctx = canvas.getContext("2d");
      if (ctx) {
        chartInstance.current = new Chart(ctx, {
          type: "line",
          data: {
            labels: chartData.map((d) => d.month),
            datasets: [{
              label: "Donation Amount ($)",
              data: chartData.map((d) => d.amount),
              borderColor: "#6C4A79",
              backgroundColor: "rgba(108, 74, 121, 0.1)",
              borderWidth: 2,
              fill: true,
              tension: 0.3,
              pointBackgroundColor: "#6C4A79",
              pointBorderColor: "#ffffff",
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: "top",
                labels: {
                  usePointStyle: true,
                  padding: 20
                }
              },
              tooltip: {
                backgroundColor: "#202223",
                titleColor: "#ffffff",
                bodyColor: "#ffffff",
                padding: 12,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                  label: (context) => `$${context.parsed.y.toFixed(2)}`
                }
              }
            },
            scales: {
              x: {
                grid: {
                  display: false
                },
                ticks: {
                  color: "#6d7175"
                }
              },
              y: {
                beginAtZero: true,
                grid: {
                  color: "#e3e3e3"
                },
                ticks: {
                  color: "#6d7175",
                  callback: (value) => `$${value}`
                }
              }
            },
            interaction: {
              intersect: false,
              mode: "index"
            }
          }
        });
      }
    }
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [chartData]);
  const handleTrack = useCallback(() => {
    const formData = new FormData();
    formData.append("type", selectedType);
    formData.append("campaign_name", selectedDonationName);
    formData.append("year", selectedYear);
    submit(formData, {
      method: "get"
    });
  }, [selectedType, selectedDonationName, selectedYear, submit]);
  return /* @__PURE__ */ jsx("s-page", {
    heading: "Track Donation",
    children: /* @__PURE__ */ jsxs("s-block-stack", {
      gap: "base",
      children: [/* @__PURE__ */ jsx("div", {
        style: {
          background: "white",
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid #e1e3e5",
          marginBottom: "20px"
        },
        children: /* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            gap: "16px",
            alignItems: "flex-end",
            flexWrap: "wrap"
          },
          children: [/* @__PURE__ */ jsxs("div", {
            style: {
              flex: 1,
              minWidth: "200px"
            },
            children: [/* @__PURE__ */ jsx("label", {
              style: {
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px"
              },
              children: "Donation Type"
            }), /* @__PURE__ */ jsxs("select", {
              value: selectedType,
              onChange: (e) => setSelectedType(e.target.value),
              style: {
                width: "100%",
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid #e1e3e5"
              },
              children: [/* @__PURE__ */ jsx("option", {
                value: "all",
                children: "All Donations"
              }), /* @__PURE__ */ jsx("option", {
                value: "preset",
                children: "Preset Donations"
              }), /* @__PURE__ */ jsx("option", {
                value: "pos",
                children: "POS Donations"
              }), /* @__PURE__ */ jsx("option", {
                value: "roundup",
                children: "Round Up Donations"
              }), /* @__PURE__ */ jsx("option", {
                value: "recurring",
                children: "Recurring Donations"
              })]
            })]
          }), selectedType === "preset" && /* @__PURE__ */ jsxs("div", {
            style: {
              flex: 1,
              minWidth: "200px"
            },
            children: [/* @__PURE__ */ jsx("label", {
              style: {
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px"
              },
              children: "Campaign Name"
            }), /* @__PURE__ */ jsxs("select", {
              value: selectedDonationName,
              onChange: (e) => setSelectedDonationName(e.target.value),
              style: {
                width: "100%",
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid #e1e3e5"
              },
              children: [/* @__PURE__ */ jsx("option", {
                value: "all",
                children: "All Campaigns"
              }), trackCampaigns.map((c) => /* @__PURE__ */ jsx("option", {
                value: c.name,
                children: c.name
              }, c.id))]
            })]
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              flex: 1,
              minWidth: "200px"
            },
            children: [/* @__PURE__ */ jsx("label", {
              style: {
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px"
              },
              children: "Year"
            }), /* @__PURE__ */ jsx("select", {
              value: selectedYear,
              onChange: (e) => setSelectedYear(e.target.value),
              style: {
                width: "100%",
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid #e1e3e5"
              },
              children: years.map((y) => /* @__PURE__ */ jsx("option", {
                value: y,
                children: y
              }, y))
            })]
          }), /* @__PURE__ */ jsx("button", {
            onClick: handleTrack,
            disabled: isLoading,
            style: {
              background: "#6C4A79",
              color: "white",
              border: "none",
              padding: "10px 24px",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.7 : 1,
              height: "40px"
            },
            children: isLoading ? "Loading..." : "Track"
          })]
        })
      }), /* @__PURE__ */ jsx("div", {
        style: {
          background: "white",
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid #e1e3e5",
          height: "400px"
        },
        children: /* @__PURE__ */ jsx("canvas", {
          id: "donation-chart"
        })
      })]
    })
  });
});
const route32 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: app_trackDonation,
  loader: loader$6
}, Symbol.toStringTag, { value: "Module" }));
const DEFAULT_SETTINGS = {
  enabled: false,
  donationBasis: "order",
  donationType: "percentage",
  donationValue: 5,
  minimumValue: 0,
  donationMessage: "{donationAmount} of {totalOrderValue} will be donated to charity.\n\nThank you for making a difference with your purchase!",
  tooltipMessage: "A portion of your purchase supports charity",
  orderTag: "galaxy_pos_donation"
};
const loader$5 = async ({
  request
}) => {
  var _a2, _b;
  const {
    session,
    admin
  } = await authenticate.admin(request);
  const shop = session.shop;
  const settings = await prisma.posDonationSettings.findUnique({
    where: {
      shop
    }
  });
  const logs = await prisma.posDonationLog.findMany({
    where: {
      shop
    },
    orderBy: {
      createdAt: "desc"
    }
  });
  const activeLogs = logs.filter((log) => log.status === "active");
  const totalDonations = activeLogs.reduce((sum, log) => sum + (log.donationAmount || 0), 0);
  const ordersWithDonations = activeLogs.length;
  const avgDonation = ordersWithDonations > 0 ? totalDonations / ordersWithDonations : 0;
  const response = await admin.graphql(`
      query {
        shop {
          currencyCode
        }
      }
    `);
  const shopData = await response.json();
  const currency = ((_b = (_a2 = shopData.data) == null ? void 0 : _a2.shop) == null ? void 0 : _b.currencyCode) || "USD";
  const extensionId = process.env.SHOPIFY_POS_DONATION_ID;
  const subscription = await prisma.planSubscription.findUnique({
    where: {
      shop
    }
  });
  return {
    settings: settings ?? {
      ...DEFAULT_SETTINGS,
      shop
    },
    extensionId: extensionId || "MISSING_UUID",
    currency,
    analytics: {
      totalDonations,
      ordersWithDonations,
      avgDonation
    },
    logs,
    plan: (subscription == null ? void 0 : subscription.plan) ?? "basic"
  };
};
const action$3 = async ({
  request
}) => {
  var _a2, _b, _c;
  const {
    session,
    admin
  } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const data2 = {
    enabled: formData.get("enabled") === "true",
    donationBasis: formData.get("donationBasis") || "order",
    donationType: formData.get("donationType") || "percentage",
    donationValue: parseFloat(formData.get("donationValue")) || 5,
    minimumValue: parseFloat(formData.get("minimumValue")) || 0,
    donationMessage: formData.get("donationMessage") || DEFAULT_SETTINGS.donationMessage,
    tooltipMessage: formData.get("tooltipMessage") || DEFAULT_SETTINGS.tooltipMessage,
    orderTag: formData.get("orderTag") || DEFAULT_SETTINGS.orderTag
  };
  await prisma.posDonationSettings.upsert({
    where: {
      shop
    },
    update: data2,
    create: {
      shop,
      ...data2
    }
  });
  try {
    const appResponse = await admin.graphql(`query { currentAppInstallation { id } }`);
    const appData = await appResponse.json();
    const appId = appData.data.currentAppInstallation.id;
    const response = await admin.graphql(`
            mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
                metafieldsSet(metafields: $metafields) {
                    metafields { id }
                    userErrors { field message }
                }
            }
        `, {
      variables: {
        metafields: [{
          ownerId: appId,
          namespace: "pos_donation",
          key: "settings",
          type: "json",
          value: JSON.stringify(data2)
        }]
      }
    });
    const debugObj = await response.json();
    if ((_c = (_b = (_a2 = debugObj.data) == null ? void 0 : _a2.metafieldsSet) == null ? void 0 : _b.userErrors) == null ? void 0 : _c.length) {
      console.error("MetafieldsSet UserErrors:", JSON.stringify(debugObj.data.metafieldsSet.userErrors, null, 2));
    } else {
      console.log("Successfully synced POS settings to App Metafields!");
    }
  } catch (e) {
    console.error("Error syncing POS settings to Metafields:", e);
  }
  return {
    status: "success"
  };
};
const app_posDonation = UNSAFE_withComponentProps(function PosDonation() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const resendFetcher = useFetcher();
  const shopify2 = useAppBridge();
  const {
    settings: savedSettings,
    currency: currencyCode,
    logs,
    analytics,
    plan
  } = loaderData;
  const moneyFormatter = new Intl.NumberFormat(void 0, {
    style: "currency",
    currency: currencyCode
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTabParam = searchParams.get("tab");
  let initialTabIndex = 0;
  if (initialTabParam === "configuration") initialTabIndex = 1;
  const [selectedTab, setSelectedTab] = useState(initialTabIndex);
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "configuration") setSelectedTab(1);
    else setSelectedTab(0);
  }, [searchParams]);
  const handleTabChange = (index2) => {
    setSelectedTab(index2);
    const tabId = index2 === 1 ? "configuration" : "settings";
    setSearchParams({
      tab: tabId
    });
  };
  const [settings, setSettings] = useState({
    enabled: savedSettings.enabled,
    donationBasis: savedSettings.donationBasis,
    donationType: savedSettings.donationType,
    donationValue: savedSettings.donationValue,
    minimumValue: savedSettings.minimumValue,
    donationMessage: savedSettings.donationMessage,
    tooltipMessage: savedSettings.tooltipMessage,
    orderTag: savedSettings.orderTag
  });
  const isSaving = fetcher.state === "submitting" && fetcher.formMethod === "POST";
  const hasChanges = settings.enabled !== (savedSettings.enabled ?? false) || settings.donationBasis !== (savedSettings.donationBasis ?? "order") || settings.donationType !== (savedSettings.donationType ?? "percentage") || Number(settings.donationValue) !== Number(savedSettings.donationValue ?? 0) || Number(settings.minimumValue) !== Number(savedSettings.minimumValue ?? 0) || settings.donationMessage !== (savedSettings.donationMessage ?? "") || settings.tooltipMessage !== (savedSettings.tooltipMessage ?? "") || settings.orderTag !== (savedSettings.orderTag ?? "");
  useEffect(() => {
    var _a2;
    if (((_a2 = fetcher.data) == null ? void 0 : _a2.status) === "success") {
      shopify2.toast.show("Settings saved successfully");
    }
  }, [fetcher.data, shopify2]);
  const handleSettingChange = useCallback((field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value
    }));
  }, []);
  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.append("enabled", String(settings.enabled));
    formData.append("donationBasis", settings.donationBasis);
    formData.append("donationType", settings.donationType);
    formData.append("donationValue", String(settings.donationValue));
    formData.append("minimumValue", String(settings.minimumValue));
    formData.append("donationMessage", settings.donationMessage);
    formData.append("tooltipMessage", settings.tooltipMessage);
    formData.append("orderTag", settings.orderTag);
    fetcher.submit(formData, {
      method: "POST"
    });
  }, [settings, fetcher]);
  useCallback((logId) => {
    resendFetcher.submit({
      logId
    }, {
      method: "POST",
      action: "/api/resend-donation-email"
    });
    shopify2.toast.show("Attempting to resend receipt...");
  }, [resendFetcher, shopify2]);
  const getPreviewMessage = useCallback((samplePrice) => {
    let donationAmt;
    if (settings.donationType === "percentage") {
      donationAmt = settings.donationValue / 100 * samplePrice;
    } else {
      donationAmt = settings.donationValue;
    }
    const smartReplace = (html, variable, value) => {
      const regex = new RegExp("\\{(\\s*<[^>]*>\\s*)*" + variable + "(\\s*<[^>]*>\\s*)*\\}", "gi");
      return html.replace(regex, value);
    };
    let msg = settings.donationMessage;
    msg = smartReplace(msg, "Percentage", `${settings.donationValue}%`);
    msg = smartReplace(msg, "FixedAmount", moneyFormatter.format(settings.donationValue));
    msg = smartReplace(msg, "donationAmount", moneyFormatter.format(donationAmt));
    msg = smartReplace(msg, "totalOrderValue", moneyFormatter.format(samplePrice));
    return msg;
  }, [settings, moneyFormatter]);
  const handleModeSwitch = (mode) => {
    let newMessage = settings.donationMessage;
    if (mode === "order") {
      if (settings.donationType === "percentage") {
        newMessage = "{Percentage} of your total order value - {donationAmount} from {totalOrderValue} - will be donated to help provide meals to those in need.\n\nThank you for making a difference with your purchase!";
      } else {
        newMessage = "{FixedAmount} of your total order value - {donationAmount} from {totalOrderValue} - will be donated to help provide meals to those in need.\n\nThank you for making a difference with your purchase!";
      }
    } else {
      if (settings.donationType === "percentage") {
        newMessage = "{Percentage} of your product value - {donationAmount} from {totalOrderValue} - will be donated to help provide meals to those in need.\n\nThank you for making a difference with your purchase!";
      } else {
        newMessage = "{FixedAmount} of your product value - {donationAmount} from {totalOrderValue} - will be donated to help provide meals to those in need.\n\nThank you for making a difference with your purchase!";
      }
    }
    setSettings((prev) => ({
      ...prev,
      donationBasis: mode,
      donationMessage: newMessage,
      tooltipMessage: "With your order, you are helping the Feed India Mission provide meals."
    }));
  };
  const handleTypeSwitch = (type) => {
    let newMessage = settings.donationMessage;
    if (settings.donationBasis === "order") {
      if (type === "percentage") {
        newMessage = "{Percentage} of your total order value - {donationAmount} from {totalOrderValue} - will be donated to help provide meals to those in need.\n\nThank you for making a difference with your purchase!";
      } else {
        newMessage = "{FixedAmount} of your total order value - {donationAmount} from {totalOrderValue} - will be donated to help provide meals to those in need.\n\nThank you for making a difference with your purchase!";
      }
    } else {
      if (type === "percentage") {
        newMessage = "{Percentage} of your product value - {donationAmount} from {totalOrderValue} - will be donated to help provide meals to those in need.\n\nThank you for making a difference with your purchase!";
      } else {
        newMessage = "{FixedAmount} of your product value - {donationAmount} from {totalOrderValue} - will be donated to help provide meals to those in need.\n\nThank you for making a difference with your purchase!";
      }
    }
    setSettings((prev) => ({
      ...prev,
      donationType: type,
      donationMessage: newMessage
    }));
  };
  const renderSettings = () => /* @__PURE__ */ jsxs("div", {
    style: {
      display: "flex",
      gap: "24px",
      alignItems: "flex-start"
    },
    children: [/* @__PURE__ */ jsxs("div", {
      style: {
        flex: 1,
        backgroundColor: "#fff",
        border: "1px solid #EBEBEB",
        borderRadius: "8px",
        padding: "24px"
      },
      children: [/* @__PURE__ */ jsxs("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px"
        },
        children: [/* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsxs("div", {
            style: {
              fontSize: "16px",
              fontWeight: "bold",
              marginBottom: "4px"
            },
            children: ["General Status ", /* @__PURE__ */ jsx("span", {
              style: {
                padding: "2px 10px",
                background: settings.enabled ? "#eafff0" : "#fff4e5",
                color: settings.enabled ? "#1a512e" : "#8e4b0b",
                borderRadius: "20px",
                fontSize: "11px",
                marginLeft: "10px",
                fontWeight: "600"
              },
              children: settings.enabled ? "Active" : "Inactive"
            })]
          }), /* @__PURE__ */ jsx("div", {
            style: {
              fontSize: "13px",
              color: "#6D7175"
            },
            children: "Enable or disable the Portion Of Sale widget completely"
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            gap: "10px"
          },
          children: [/* @__PURE__ */ jsx("button", {
            onClick: handleSave,
            disabled: isSaving || !hasChanges,
            style: {
              background: !hasChanges ? "#f4f4f4" : "#202223",
              color: !hasChanges ? "#8e8e8e" : "white",
              border: !hasChanges ? "1px solid #dcdcdc" : "none",
              padding: "8px 24px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: isSaving || !hasChanges ? "not-allowed" : "pointer",
              opacity: isSaving ? 0.7 : 1
            },
            children: isSaving ? "Saving..." : "Save"
          }), /* @__PURE__ */ jsx("button", {
            onClick: () => handleSettingChange("enabled", !settings.enabled),
            style: {
              background: settings.enabled ? "#fbeae5" : "#202223",
              color: settings.enabled ? "#8e1f0b" : "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer"
            },
            children: settings.enabled ? "Disable" : "Enable"
          })]
        })]
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "24px"
        },
        children: [/* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            borderBottom: "1px solid #EBEBEB"
          },
          children: [/* @__PURE__ */ jsx("div", {
            onClick: () => handleModeSwitch("order"),
            style: {
              padding: "10px 24px",
              cursor: "pointer",
              fontWeight: settings.donationBasis === "order" ? "600" : "400",
              borderBottom: settings.donationBasis === "order" ? `2px solid #6C4A79` : "none",
              marginBottom: "-1px",
              color: settings.donationBasis === "order" ? "#202223" : "#6D7175",
              fontSize: "14px"
            },
            children: "Order-Based Donations"
          }), /* @__PURE__ */ jsx("div", {
            onClick: () => handleModeSwitch("product"),
            style: {
              padding: "10px 24px",
              cursor: "pointer",
              fontWeight: settings.donationBasis === "product" ? "600" : "400",
              borderBottom: settings.donationBasis === "product" ? `2px solid #6C4A79` : "none",
              marginBottom: "-1px",
              color: settings.donationBasis === "product" ? "#202223" : "#6D7175",
              fontSize: "14px"
            },
            children: "Product Based Donations"
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            padding: "12px 16px",
            background: "#f4f4f7",
            borderRadius: "8px",
            color: "#6C4A79",
            fontSize: "13px",
            border: "1px solid #e2e2e7"
          },
          children: ["Apply a percentage or fixed amount from ", settings.donationBasis === "order" ? "the order total" : "each product", " as a donation."]
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          },
          children: [/* @__PURE__ */ jsx("div", {
            style: {
              fontSize: "14px",
              fontWeight: "600"
            },
            children: "Donation Type"
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "10px"
            },
            children: [/* @__PURE__ */ jsxs("div", {
              style: {
                display: "flex",
                gap: "20px",
                alignItems: "center"
              },
              children: [/* @__PURE__ */ jsxs("label", {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: checkFeatureAccess(plan, "canUsePercentageDonation") ? "pointer" : "not-allowed",
                  fontSize: "14px",
                  opacity: checkFeatureAccess(plan, "canUsePercentageDonation") ? 1 : 0.6
                },
                children: [/* @__PURE__ */ jsx("input", {
                  type: "radio",
                  disabled: !checkFeatureAccess(plan, "canUsePercentageDonation"),
                  checked: settings.donationType === "percentage",
                  onChange: () => handleTypeSwitch("percentage"),
                  style: {
                    accentColor: "#6C4A79"
                  }
                }), "Percentage (%)", !checkFeatureAccess(plan, "canUsePercentageDonation") && /* @__PURE__ */ jsx("s-badge", {
                  tone: "caution",
                  children: "Advanced"
                })]
              }), /* @__PURE__ */ jsxs("label", {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  fontSize: "14px"
                },
                children: [/* @__PURE__ */ jsx("input", {
                  type: "radio",
                  checked: settings.donationType === "fixed",
                  onChange: () => handleTypeSwitch("fixed"),
                  style: {
                    accentColor: "#6C4A79"
                  }
                }), "Fixed Amount (", currencyCode, ")"]
              })]
            }), !checkFeatureAccess(plan, "canUsePercentageDonation") && /* @__PURE__ */ jsxs("s-banner", {
              tone: "info",
              children: [/* @__PURE__ */ jsx("div", {
                slot: "title",
                children: "Percentage Donations Locked"
              }), /* @__PURE__ */ jsxs("p", {
                children: ["Percentage-based donations are available on the ", /* @__PURE__ */ jsx("strong", {
                  children: "Advanced"
                }), " plan."]
              }), /* @__PURE__ */ jsx(Link, {
                to: "/app/pricing",
                style: {
                  color: "inherit",
                  textDecoration: "none"
                },
                children: /* @__PURE__ */ jsx("div", {
                  style: {
                    marginTop: "4px",
                    fontSize: "13px",
                    color: "#6D7175"
                  },
                  children: "Upgrade your plan to unlock ↗"
                })
              })]
            })]
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            gap: "16px"
          },
          children: [/* @__PURE__ */ jsx("div", {
            style: {
              flex: 1
            },
            children: /* @__PURE__ */ jsx("s-text-field", {
              label: settings.donationType === "percentage" ? "Donation Percentage" : "Donation Amount",
              value: String(settings.donationValue),
              onInput: (e) => handleSettingChange("donationValue", parseFloat(e.target.value) || 0)
            })
          }), settings.donationType === "fixed" && /* @__PURE__ */ jsx("div", {
            style: {
              flex: 1
            },
            children: /* @__PURE__ */ jsx("s-text-field", {
              label: settings.donationBasis === "order" ? "Minimum Order Value" : "Minimum Product Value",
              value: String(settings.minimumValue),
              onInput: (e) => handleSettingChange("minimumValue", parseFloat(e.target.value) || 0)
            })
          })]
        }), /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("div", {
            style: {
              fontSize: "14px",
              fontWeight: "600",
              marginBottom: "8px"
            },
            children: "Custom Message"
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              fontSize: "12px",
              color: "#6D7175",
              marginBottom: "12px"
            },
            children: ["Use: ", settings.donationType === "percentage" ? "{Percentage}" : "{FixedAmount}", ", ", "{totalOrderValue}", ", ", "{donationAmount}"]
          }), /* @__PURE__ */ jsx(RichTextEditor, {
            value: settings.donationMessage,
            onChange: (value) => handleSettingChange("donationMessage", value)
          })]
        }), /* @__PURE__ */ jsx("div", {
          children: /* @__PURE__ */ jsx("s-text-field", {
            label: "Tooltip (Small Text)",
            value: settings.tooltipMessage,
            onInput: (e) => handleSettingChange("tooltipMessage", e.target.value)
          })
        }), /* @__PURE__ */ jsx("div", {
          children: /* @__PURE__ */ jsx("s-text-field", {
            label: "Order Internal Tag",
            value: settings.orderTag,
            onInput: (e) => handleSettingChange("orderTag", e.target.value)
          })
        })]
      })]
    }), /* @__PURE__ */ jsxs("div", {
      style: {
        width: "350px",
        backgroundColor: "#fff",
        border: "1px solid #EBEBEB",
        borderRadius: "8px",
        padding: "24px",
        position: "sticky",
        top: "20px"
      },
      children: [/* @__PURE__ */ jsx("div", {
        style: {
          fontSize: "16px",
          fontWeight: "bold",
          marginBottom: "20px"
        },
        children: "Widget Preview"
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          borderRadius: "8px",
          border: "1px solid #EBEBEB",
          overflow: "hidden"
        },
        children: [/* @__PURE__ */ jsx("div", {
          style: {
            padding: "12px 16px",
            background: "#f9f9f9",
            borderBottom: "1px solid #EBEBEB",
            fontSize: "12px",
            fontWeight: "bold",
            color: "#6D7175"
          },
          children: "STOREFRONT PREVIEW"
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            padding: "20px",
            background: "white"
          },
          children: [/* @__PURE__ */ jsx("div", {
            style: {
              fontSize: "14px",
              fontWeight: "bold",
              color: "#202223",
              marginBottom: "12px"
            },
            children: "Helping Feed India Mission"
          }), /* @__PURE__ */ jsx("div", {
            style: {
              fontSize: "13px",
              color: "#202223",
              lineHeight: "1.5"
            },
            children: settings.minimumValue > 599 ? "(Donation badge hidden: Value below minimum)" : /* @__PURE__ */ jsx("div", {
              dangerouslySetInnerHTML: {
                __html: getPreviewMessage(599)
              }
            })
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              gap: "8px",
              alignItems: "flex-start",
              marginTop: "12px",
              paddingTop: "12px",
              borderTop: "1px solid #F0F0F0"
            },
            children: [/* @__PURE__ */ jsx("div", {
              style: {
                background: "#007ace",
                color: "white",
                width: "16px",
                height: "16px",
                borderRadius: "3px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: "bold",
                flexShrink: 0
              },
              children: "i"
            }), /* @__PURE__ */ jsx("div", {
              style: {
                fontSize: "12px",
                color: "#6D7175",
                lineHeight: "1.4"
              },
              children: settings.tooltipMessage
            })]
          })]
        })]
      }), /* @__PURE__ */ jsx("div", {
        style: {
          marginTop: "20px",
          padding: "12px",
          background: "#e8f5e9",
          borderRadius: "8px",
          fontSize: "12px",
          color: "#2e7d32"
        },
        children: "This is how the donation information will appear to your customers on the storefront."
      })]
    })]
  });
  const renderConfiguration = () => {
    var _a2, _b, _c, _d;
    return /* @__PURE__ */ jsx(ConfigurationTab, {
      blocks: [{
        id: "pos-product",
        title: "Product Page Setup",
        description: "To add the donation section to your product page, click the button below to insert the app block.",
        themeEditorUrl: `https://admin.shopify.com/store/${((_b = (_a2 = shopify2.config) == null ? void 0 : _a2.shop) == null ? void 0 : _b.replace(".myshopify.com", "")) || ""}/themes/current/editor?template=product`,
        buttonLabel: "Open Product Editor ↗",
        previewSvg: PRODUCT_PREVIEW_SVG,
        enabled: settings.enabled,
        instructions: ["Go to ", "Online Store", " ➺ ", "Themes", " ➺ Click on ", "Customize", " ➺ Select ", "Product Page", " Template ➺ Click ", "Add Block", " ➺ Select ", "POS Donation"],
        onToggle: (val) => handleSettingChange("enabled", val)
      }, {
        id: "pos-cart",
        title: "Cart Page Setup",
        description: "To add the donation section to your cart page, click the button below to insert the app block.",
        themeEditorUrl: `https://admin.shopify.com/store/${((_d = (_c = shopify2.config) == null ? void 0 : _c.shop) == null ? void 0 : _d.replace(".myshopify.com", "")) || ""}/themes/current/editor?template=cart`,
        buttonLabel: "Open Cart Editor ↗",
        previewSvg: CART_PREVIEW_SVG,
        enabled: settings.enabled,
        instructions: ["Go to ", "Online Store", " ➺ ", "Themes", " ➺ Click on ", "Customize", " ➺ Select ", "Cart Page", " Template ➺ Click ", "Add Block", " ➺ Select ", "POS Donation"],
        onToggle: (val) => handleSettingChange("enabled", val)
      }]
    });
  };
  const tabs2 = [{
    id: "settings",
    label: "Settings"
  }, {
    id: "configuration",
    label: "Configuration"
  }];
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "Portion of Sale Donation",
    children: [/* @__PURE__ */ jsx("div", {
      className: "polaris-tabs",
      children: /* @__PURE__ */ jsx("div", {
        className: "polaris-tabs-list",
        role: "tablist",
        children: tabs2.map((tab, index2) => /* @__PURE__ */ jsx("button", {
          role: "tab",
          "aria-selected": selectedTab === index2,
          className: `polaris-tab ${selectedTab === index2 ? "active" : ""}`,
          onClick: () => handleTabChange(index2),
          children: tab.label
        }, tab.id))
      })
    }), /* @__PURE__ */ jsxs("div", {
      style: {
        marginTop: "20px"
      },
      children: [selectedTab === 0 && /* @__PURE__ */ jsx(Form, {
        method: "post",
        id: "pos-form",
        children: renderSettings()
      }), selectedTab === 1 && renderConfiguration()]
    }), /* @__PURE__ */ jsx("style", {
      children: `
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
            `
    })]
  });
});
const headers$3 = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route33 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$3,
  default: app_posDonation,
  headers: headers$3,
  loader: loader$5
}, Symbol.toStringTag, { value: "Module" }));
const loader$4 = async ({
  request
}) => {
  const url = new URL(request.url);
  if (url.protocol === "http:" && !url.hostname.includes("localhost")) {
    url.protocol = "https:";
  }
  const secureRequest = new Request(url.toString(), request);
  const {
    session
  } = await authenticate.admin(secureRequest);
  const shop = session.shop;
  const host = url.searchParams.get("host");
  const plan = url.searchParams.get("plan");
  console.log(`Billing Callback: Shop=${shop}, Plan=${plan}, Host=${host}`);
  if (plan) {
    const subscription = await prisma.planSubscription.findUnique({
      where: {
        shop
      }
    });
    const finalPlan = plan || (subscription == null ? void 0 : subscription.pendingPlan) || "basic";
    await prisma.planSubscription.upsert({
      where: {
        shop
      },
      update: {
        plan: finalPlan,
        status: "active",
        pendingPlan: null
        // We will let the webhook or the next app load (self-healing) 
        // update the actual subscriptionId from the API.
      },
      create: {
        shop,
        plan: finalPlan,
        status: "active",
        pendingPlan: null
      }
    });
  }
  const redirectUrl = new URL("/app/pricing", url.origin);
  redirectUrl.searchParams.set("shop", shop);
  if (host) redirectUrl.searchParams.set("host", host);
  return redirect(redirectUrl.toString());
};
const app_billing = UNSAFE_withComponentProps(function BillingRedirect() {
  return null;
});
const route34 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: app_billing,
  loader: loader$4
}, Symbol.toStringTag, { value: "Module" }));
const loader$3 = async ({
  request
}) => {
  const {
    session
  } = await authenticate.admin(request);
  const shop = session.shop;
  const subscription = await prisma.planSubscription.findUnique({
    where: {
      shop
    }
  });
  return {
    currentPlan: (subscription == null ? void 0 : subscription.plan) ?? "basic",
    status: (subscription == null ? void 0 : subscription.status) ?? "active",
    subscriptionId: (subscription == null ? void 0 : subscription.subscriptionId) ?? null
  };
};
const action$2 = async ({
  request
}) => {
  var _a2;
  const {
    admin,
    session
  } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("_intent");
  const plans = ["basic", "advanced", "pro"];
  const plan = intent.replace("select", "").toLowerCase();
  if (plans.includes(plan)) {
    const planDetail = PLAN_DETAILS[plan];
    const price = parseFloat(planDetail.price.replace("$", ""));
    const url = new URL(request.url);
    const shopifyHost = url.searchParams.get("host");
    const host = process.env.SHOPIFY_APP_URL || url.origin;
    const returnUrl = `${host}/app/billing?plan=${plan}&shop=${shop}${shopifyHost ? `&host=${encodeURIComponent(shopifyHost)}` : ""}`;
    const response = await admin.graphql(`#graphql
            mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $test: Boolean) {
              appSubscriptionCreate(name: $name, lineItems: $lineItems, returnUrl: $returnUrl, test: $test) {
                appSubscription {
                  id
                }
                confirmationUrl
                userErrors {
                  field
                  message
                }
              }
            }`, {
      variables: {
        name: `Galaxy Easy Donations - ${planDetail.name} Plan`,
        returnUrl,
        test: process.env.SHOPIFY_BILLING_TEST_MODE === "true",
        lineItems: [{
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: price,
                currencyCode: "USD"
              },
              interval: "EVERY_30_DAYS"
            }
          }
        }]
      }
    });
    const responseJson = await response.json();
    if (!((_a2 = responseJson == null ? void 0 : responseJson.data) == null ? void 0 : _a2.appSubscriptionCreate)) {
      return {
        success: false,
        error: "Failed to create subscription in Shopify."
      };
    }
    const data2 = responseJson.data.appSubscriptionCreate;
    if (data2.userErrors.length > 0) {
      return {
        success: false,
        error: data2.userErrors[0].message
      };
    }
    await prisma.planSubscription.upsert({
      where: {
        shop
      },
      update: {
        status: "pending",
        pendingPlan: plan,
        subscriptionId: data2.appSubscription.id
      },
      create: {
        shop,
        plan: "basic",
        // Default to basic if new
        pendingPlan: plan,
        status: "pending",
        subscriptionId: data2.appSubscription.id
      }
    });
    return {
      success: true,
      plan,
      confirmationUrl: data2.confirmationUrl
    };
  }
  return {
    success: false,
    error: "Unknown intent"
  };
};
const BASIC_FEATURES = ["Donation create (basic)", "Portion of sale (fixed only)", "Receipt email notification", "Basic UI & Design", "Order Tagging", "Community support"];
const ADVANCED_FEATURES = ["Everything in Basic", "Portion of sale (percentage based)", "Refund email notification", "Filters / pagination", "Advanced Analytics", "Priority support"];
const PRO_FEATURES = ["Everything in Advanced", "Cancellation email notification", "Custom email templates", "Custom branding", "Dynamic variables", "Unlimited logs"];
const app_pricing = UNSAFE_withComponentProps(function PricingPage() {
  var _a2;
  const {
    currentPlan,
    status
  } = useLoaderData();
  const fetcher = useFetcher();
  const shopify2 = useAppBridge();
  const isSubmitting = fetcher.state !== "idle";
  const [errorMessage, setErrorMessage] = useState(null);
  useEffect(() => {
    const data2 = fetcher.data;
    if (data2 == null ? void 0 : data2.success) {
      if (data2.confirmationUrl) {
        window.top.location.href = data2.confirmationUrl;
      } else {
        shopify2.toast.show(`You are now on the ${data2.plan.charAt(0).toUpperCase() + data2.plan.slice(1)} plan.`);
        setErrorMessage(null);
      }
    }
    if ((data2 == null ? void 0 : data2.success) === false && (data2 == null ? void 0 : data2.error)) {
      setErrorMessage(data2.error);
    }
  }, [fetcher.data, shopify2]);
  const activePlan = ((_a2 = fetcher.data) == null ? void 0 : _a2.plan) ?? currentPlan;
  const selectPlan = (plan) => {
    const form2 = new FormData();
    form2.append("_intent", `select${plan.charAt(0).toUpperCase() + plan.slice(1)}`);
    fetcher.submit(form2, {
      method: "POST"
    });
  };
  const pageStyle = {
    maxWidth: "1100px",
    margin: "0 auto",
    paddingBottom: "48px"
  };
  const heroStyle = {
    textAlign: "center",
    padding: "40px 24px 32px"
  };
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "20px",
    padding: "0 8px"
  };
  const cardBase = {
    backgroundColor: "#ffffff",
    border: "1px solid #EBEBEB",
    borderRadius: "12px",
    padding: "32px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    position: "relative",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease"
  };
  const featuredCard = {
    ...cardBase,
    border: "2px solid #6C4A79",
    boxShadow: "0 8px 24px rgba(108,74,121,0.12)",
    transform: "scale(1.02)",
    zIndex: 1
  };
  const popularBadge = {
    position: "absolute",
    top: "-13px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#6C4A79",
    color: "white",
    fontSize: "11px",
    fontWeight: "700",
    padding: "4px 16px",
    borderRadius: "20px",
    letterSpacing: "0.05em",
    textTransform: "uppercase"
  };
  const featureItem = {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    fontSize: "13px",
    color: "#202223",
    padding: "4px 0",
    lineHeight: "1.4"
  };
  const checkIcon = (color) => /* @__PURE__ */ jsxs("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 16 16",
    fill: "none",
    style: {
      flexShrink: 0,
      marginTop: "2px"
    },
    children: [/* @__PURE__ */ jsx("circle", {
      cx: "8",
      cy: "8",
      r: "8",
      fill: color,
      fillOpacity: "0.15"
    }), /* @__PURE__ */ jsx("path", {
      d: "M4.5 8l2.5 2.5 4.5-5",
      stroke: color,
      strokeWidth: "1.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    })]
  });
  const btnBase = {
    width: "100%",
    padding: "12px 24px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    border: "none",
    transition: "filter 0.15s",
    marginTop: "auto"
  };
  const getButtonText = (planKey, planName) => {
    if (activePlan === planKey) return "✓ Current Plan";
    if (status === "pending") return "Switching...";
    const planRanks = {
      basic: 0,
      advanced: 1,
      pro: 2
    };
    const currentRank = planRanks[activePlan] ?? 0;
    const targetRank = planRanks[planKey] ?? 0;
    if (targetRank > currentRank) return `Upgrade to ${planName}`;
    return `Switch to ${planName}`;
  };
  return /* @__PURE__ */ jsx("div", {
    style: pageStyle,
    children: /* @__PURE__ */ jsxs("s-page", {
      heading: "Pricing Plans",
      children: [/* @__PURE__ */ jsxs("div", {
        style: heroStyle,
        children: [/* @__PURE__ */ jsx("div", {
          style: {
            fontSize: "28px",
            fontWeight: "700",
            color: "#202223",
            marginBottom: "12px"
          },
          children: "Choose the right plan for your growth"
        }), /* @__PURE__ */ jsx("div", {
          style: {
            fontSize: "15px",
            color: "#6D7175",
            maxWidth: "540px",
            margin: "0 auto",
            lineHeight: "1.6"
          },
          children: "From simple donations to advanced automated receipts. Scale your charitable impact with our powerful tools."
        })]
      }), errorMessage && /* @__PURE__ */ jsx("div", {
        style: {
          margin: "0 8px 24px",
          padding: "12px 16px",
          background: "#fee2e2",
          border: "1px solid #ef4444",
          borderRadius: "8px",
          color: "#991b1b",
          fontSize: "14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        },
        children: /* @__PURE__ */ jsx("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: "10px"
          },
          children: /* @__PURE__ */ jsxs("span", {
            children: [/* @__PURE__ */ jsx("strong", {
              children: "Error:"
            }), " ", errorMessage]
          })
        })
      }), /* @__PURE__ */ jsxs("div", {
        style: gridStyle,
        children: [/* @__PURE__ */ jsxs("div", {
          style: activePlan === "basic" ? featuredCard : cardBase,
          children: [activePlan === "basic" && /* @__PURE__ */ jsx("div", {
            style: popularBadge,
            children: "✓ Active"
          }), /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("div", {
              style: {
                fontSize: "18px",
                fontWeight: "700",
                marginBottom: "6px"
              },
              children: "Basic"
            }), /* @__PURE__ */ jsx("div", {
              style: {
                fontSize: "13px",
                color: "#6D7175",
                marginBottom: "20px"
              },
              children: PLAN_DETAILS.basic.description
            }), /* @__PURE__ */ jsxs("div", {
              style: {
                display: "flex",
                alignItems: "baseline",
                gap: "4px"
              },
              children: [/* @__PURE__ */ jsx("span", {
                style: {
                  fontSize: "36px",
                  fontWeight: "800",
                  color: activePlan === "basic" ? "#6C4A79" : "inherit"
                },
                children: PLAN_DETAILS.basic.price
              }), /* @__PURE__ */ jsx("span", {
                style: {
                  fontSize: "14px",
                  color: "#6D7175"
                },
                children: "/ month"
              })]
            })]
          }), /* @__PURE__ */ jsx("div", {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "4px"
            },
            children: BASIC_FEATURES.map((f) => /* @__PURE__ */ jsxs("div", {
              style: featureItem,
              children: [checkIcon(activePlan === "basic" ? "#6C4A79" : "#6D7175"), f]
            }, f))
          }), /* @__PURE__ */ jsx("button", {
            onClick: () => selectPlan("basic"),
            disabled: isSubmitting || activePlan === "basic",
            style: {
              ...btnBase,
              background: activePlan === "basic" ? "#f4f4f4" : "#202223",
              color: activePlan === "basic" ? "#6D7175" : "white",
              cursor: activePlan === "basic" ? "default" : "pointer"
            },
            children: getButtonText("basic", "Basic")
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: activePlan === "advanced" ? featuredCard : cardBase,
          children: [activePlan === "advanced" ? /* @__PURE__ */ jsx("div", {
            style: popularBadge,
            children: "✓ Active"
          }) : /* @__PURE__ */ jsx("div", {
            style: popularBadge,
            children: "⭐ Recommended"
          }), /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("div", {
              style: {
                fontSize: "18px",
                fontWeight: "700",
                marginBottom: "6px"
              },
              children: "Advanced"
            }), /* @__PURE__ */ jsx("div", {
              style: {
                fontSize: "13px",
                color: "#6D7175",
                marginBottom: "20px"
              },
              children: PLAN_DETAILS.advanced.description
            }), /* @__PURE__ */ jsxs("div", {
              style: {
                display: "flex",
                alignItems: "baseline",
                gap: "4px"
              },
              children: [/* @__PURE__ */ jsx("span", {
                style: {
                  fontSize: "36px",
                  fontWeight: "800",
                  color: "#6C4A79"
                },
                children: PLAN_DETAILS.advanced.price
              }), /* @__PURE__ */ jsx("span", {
                style: {
                  fontSize: "14px",
                  color: "#6D7175"
                },
                children: "/ month"
              })]
            })]
          }), /* @__PURE__ */ jsx("div", {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "4px"
            },
            children: ADVANCED_FEATURES.map((f) => /* @__PURE__ */ jsxs("div", {
              style: featureItem,
              children: [checkIcon("#6C4A79"), f]
            }, f))
          }), /* @__PURE__ */ jsx("button", {
            onClick: () => selectPlan("advanced"),
            disabled: isSubmitting || activePlan === "advanced",
            style: {
              ...btnBase,
              background: activePlan === "advanced" ? "#f4f4f4" : "#6C4A79",
              color: activePlan === "advanced" ? "#6D7175" : "white",
              cursor: activePlan === "advanced" ? "default" : "pointer"
            },
            children: getButtonText("advanced", "Advanced")
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: activePlan === "pro" ? featuredCard : cardBase,
          children: [activePlan === "pro" && /* @__PURE__ */ jsx("div", {
            style: popularBadge,
            children: "✓ Active"
          }), /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("div", {
              style: {
                fontSize: "18px",
                fontWeight: "700",
                marginBottom: "6px"
              },
              children: "Pro"
            }), /* @__PURE__ */ jsx("div", {
              style: {
                fontSize: "13px",
                color: "#6D7175",
                marginBottom: "20px"
              },
              children: PLAN_DETAILS.pro.description
            }), /* @__PURE__ */ jsxs("div", {
              style: {
                display: "flex",
                alignItems: "baseline",
                gap: "4px"
              },
              children: [/* @__PURE__ */ jsx("span", {
                style: {
                  fontSize: "36px",
                  fontWeight: "800",
                  color: activePlan === "pro" ? "#6C4A79" : "inherit"
                },
                children: PLAN_DETAILS.pro.price
              }), /* @__PURE__ */ jsx("span", {
                style: {
                  fontSize: "14px",
                  color: "#6D7175"
                },
                children: "/ month"
              })]
            })]
          }), /* @__PURE__ */ jsx("div", {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "4px"
            },
            children: PRO_FEATURES.map((f) => /* @__PURE__ */ jsxs("div", {
              style: featureItem,
              children: [checkIcon(activePlan === "pro" ? "#6C4A79" : "#202223"), f]
            }, f))
          }), /* @__PURE__ */ jsx("button", {
            onClick: () => selectPlan("pro"),
            disabled: isSubmitting || activePlan === "pro",
            style: {
              ...btnBase,
              background: activePlan === "pro" ? "#f4f4f4" : "#202223",
              color: activePlan === "pro" ? "#6D7175" : "white",
              cursor: activePlan === "pro" ? "default" : "pointer"
            },
            children: getButtonText("pro", "Pro")
          })]
        })]
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          margin: "48px 8px 0",
          padding: "20px",
          background: "#f9f4fb",
          borderRadius: "8px",
          fontSize: "13px",
          color: "#6C4A79",
          border: "1px solid #e7d9f0",
          textAlign: "center"
        },
        children: [/* @__PURE__ */ jsx("strong", {
          children: "🔒 Secure billing via Shopify."
        }), " All charges are processed through your Shopify account. Cancel anytime."]
      })]
    })
  });
});
const headers$2 = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route35 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$2,
  default: app_pricing,
  headers: headers$2,
  loader: loader$3
}, Symbol.toStringTag, { value: "Module" }));
async function loader$2({
  request
}) {
  var _a2, _b, _c, _d, _e;
  const {
    session
  } = await authenticate.admin(request);
  let settings = await prisma.roundUpDonationSettings.findUnique({
    where: {
      shop: session.shop
    }
  });
  if (!settings) {
    settings = {
      shop: session.shop,
      enabled: false,
      showImage: false,
      productId: null,
      campaignTitle: "",
      description: "",
      checkboxLabel: "",
      rounding: "nearest1",
      customAmount: "",
      additionalDonationEnabled: false,
      additionalDonationTitle: "",
      placeholderText: "",
      buttonText: "",
      imageUrl: "",
      donationOrderTag: "",
      productHandle: ""
    };
  } else if (settings.productId && settings.showImage) {
    try {
      const {
        admin
      } = await authenticate.admin(request);
      const productResponse = await admin.graphql(`
                query roundupGetLiveImage($id: ID!) {
                    product(id: $id) {
                        images(first: 1) {
                            nodes {
                                url
                            }
                        }
                    }
                }
            `, {
        variables: {
          id: settings.productId
        }
      });
      const productData = await productResponse.json();
      const liveUrl = (_e = (_d = (_c = (_b = (_a2 = productData.data) == null ? void 0 : _a2.product) == null ? void 0 : _b.images) == null ? void 0 : _c.nodes) == null ? void 0 : _d[0]) == null ? void 0 : _e.url;
      if (liveUrl && liveUrl !== settings.imageUrl) {
        settings.imageUrl = liveUrl;
      }
    } catch (error) {
      console.warn("Error fetching live image from Shopify", error);
    }
  }
  return {
    settings
  };
}
async function action$1({
  request
}) {
  var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A;
  const {
    session,
    admin
  } = await authenticate.admin(request);
  const formData = await request.formData();
  await prisma.roundUpDonationSettings.findUnique({
    where: {
      shop: session.shop
    }
  });
  const enabled = formData.get("enabled") === "true";
  const campaignTitle = String(formData.get("campaignTitle") || "");
  const description = String(formData.get("description") || "");
  const showImage = formData.get("showImage") === "true";
  const checkboxLabel = String(formData.get("checkboxLabel") || "");
  const rounding = String(formData.get("rounding") || "nearest1");
  const customAmount = String(formData.get("customAmount") || "");
  const donationOrderTag = String(formData.get("donationOrderTag") || "");
  const additionalDonationEnabled = formData.get("additionalDonationEnabled") === "true";
  const additionalDonationTitle = String(formData.get("additionalDonationTitle") || "");
  const placeholderText = String(formData.get("placeholderText") || "");
  const buttonText = String(formData.get("buttonText") || "");
  const imageUrl = String(formData.get("imageUrl") || "https://cdn-icons-png.flaticon.com/512/3772/3772231.png");
  const isNewImage = imageUrl.startsWith("data:image");
  const shopQuery = await admin.graphql(`
    #graphql
    query RoundupGetShop {
      shop { id }
    }
  `);
  const shopData = await shopQuery.json();
  const shopId = shopData.data.shop.id;
  let onlineStorePublicationId = null;
  try {
    const publicationQuery = await admin.graphql(`
      query {
        publications(first: 10) {
          nodes {
            id
            name
          }
        }
      }
    `);
    const publicationData = await publicationQuery.json();
    const publications = ((_b = (_a2 = publicationData.data) == null ? void 0 : _a2.publications) == null ? void 0 : _b.nodes) || [];
    console.log("All publications:", publications);
    const onlineStore = publications.find((p) => p.name.toLowerCase().includes("online"));
    onlineStorePublicationId = (onlineStore == null ? void 0 : onlineStore.id) || null;
    console.log("Selected publication:", onlineStorePublicationId);
  } catch (error) {
    console.warn("Publication fetch error", error);
  }
  let productId = null;
  let productHandle = "";
  let finalImageUrl = imageUrl;
  if (!productId || isNewImage) {
    const existingProductResponse = await admin.graphql(`
      #graphql
      query RoundupFindExistingDonationProduct {
        products(first: 1, query: "tag:roundup-donation-product") {
          nodes {
            id
            handle
          }
        }
      }
    `);
    const existingProductData = await existingProductResponse.json();
    const existingProduct = (_e = (_d = (_c = existingProductData.data) == null ? void 0 : _c.products) == null ? void 0 : _d.nodes) == null ? void 0 : _e[0];
    if (existingProduct) {
      productId = existingProduct.id;
      productHandle = existingProduct.handle;
    }
    const productMutation = `
      mutation CreateOrUpdateProduct($input: ProductSetInput!) {
        productSet(input: $input) {
          product {
            id
            handle
            images(first: 1) {
              nodes {
                url
              }
            }
            variants(first: 10) {
              nodes {
                id
                price
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    if (isNewImage) {
      try {
        const base64Parts = imageUrl.split(",");
        const contentType = base64Parts[0].split(":")[1].split(";")[0];
        const extension = contentType.split("/")[1] || "png";
        const filename = `donation-image-${Date.now()}.${extension}`;
        const base64Data = base64Parts[1];
        const buffer = Buffer.from(base64Data, "base64");
        const stagedMutation = `
          mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
            stagedUploadsCreate(input: $input) {
              stagedTargets {
                url
                resourceUrl
                parameters {
                  name
                  value
                }
              }
            }
          }
        `;
        const stagedResponse = await admin.graphql(stagedMutation, {
          variables: {
            input: [{
              filename,
              mimeType: contentType,
              resource: "IMAGE",
              fileSize: buffer.length.toString(),
              httpMethod: "POST"
            }]
          }
        });
        const stagedData = await stagedResponse.json();
        const target = stagedData.data.stagedUploadsCreate.stagedTargets[0];
        const formDataUpload = new FormData();
        target.parameters.forEach(({
          name,
          value
        }) => {
          formDataUpload.append(name, value);
        });
        const blob = new Blob([buffer], {
          type: contentType
        });
        formDataUpload.append("file", blob, filename);
        const uploadResponse = await fetch(target.url, {
          method: "POST",
          body: formDataUpload
        });
        if (uploadResponse.ok) {
          finalImageUrl = target.resourceUrl;
        } else {
          console.error("Shopify upload failed", await uploadResponse.text());
        }
      } catch (error) {
        console.error("Error during image upload workflow", error);
      }
    }
    const productInput = {
      title: campaignTitle || "Round Up Donation",
      descriptionHtml: `<p>${description}</p>`,
      vendor: "Rounded-donation",
      productType: "Donation",
      status: enabled ? "ACTIVE" : "DRAFT",
      tags: ["roundup-donation-product"]
    };
    if (showImage && finalImageUrl && (!productId || isNewImage)) {
      productInput.files = [{
        alt: "Donation Image",
        contentType: "IMAGE",
        originalSource: finalImageUrl
      }];
    }
    if (productId) {
      productInput.id = productId;
      try {
        const variantQuery = await admin.graphql(`
                  query getRoundupVariants($id: ID!) {
                    product(id: $id) {
                      variants(first: 50) {
                        nodes {
                          id
                        }
                      }
                    }
                  }
                `, {
          variables: {
            id: productId
          }
        });
        const variantData = await variantQuery.json();
        const variantNodes = ((_h = (_g = (_f = variantData.data) == null ? void 0 : _f.product) == null ? void 0 : _g.variants) == null ? void 0 : _h.nodes) || [];
        if (variantNodes.length > 0) {
          const bulkUpdateVariants = variantNodes.map((v) => ({
            id: v.id,
            inventoryItem: {
              requiresShipping: false
            }
          }));
          const bulkUpdateRes = await admin.graphql(`
                      mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
                        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                          userErrors { field message }
                        }
                      }
                    `, {
            variables: {
              productId,
              variants: bulkUpdateVariants
            }
          });
          const bulkUpdateJson = await bulkUpdateRes.json();
          const bulkErrors = ((_j = (_i = bulkUpdateJson.data) == null ? void 0 : _i.productVariantsBulkUpdate) == null ? void 0 : _j.userErrors) || [];
          if (bulkErrors.length > 0) {
            console.warn("[RoundUp] Bulk variant update errors:", bulkErrors);
          } else {
            console.log(`[RoundUp] Successfully updated ${variantNodes.length} variants to non-shippable.`);
          }
        }
      } catch (variantErr) {
        console.error("[RoundUp] Failed to update variants:", variantErr);
      }
    } else {
      productInput.productOptions = [{
        name: "Amount",
        values: [{
          name: "0.01"
        }, {
          name: "0.10"
        }, {
          name: "1.00"
        }, {
          name: "10.00"
        }, {
          name: "100.00"
        }, {
          name: "1000.00"
        }]
      }];
      productInput.variants = [{
        price: "0.01",
        optionValues: [{
          optionName: "Amount",
          name: "0.01"
        }],
        inventoryPolicy: "CONTINUE",
        inventoryItem: {
          tracked: false,
          requiresShipping: false
        }
      }, {
        price: "0.10",
        optionValues: [{
          optionName: "Amount",
          name: "0.10"
        }],
        inventoryPolicy: "CONTINUE",
        inventoryItem: {
          tracked: false,
          requiresShipping: false
        }
      }, {
        price: "1.00",
        optionValues: [{
          optionName: "Amount",
          name: "1.00"
        }],
        inventoryPolicy: "CONTINUE",
        inventoryItem: {
          tracked: false,
          requiresShipping: false
        }
      }, {
        price: "10.00",
        optionValues: [{
          optionName: "Amount",
          name: "10.00"
        }],
        inventoryPolicy: "CONTINUE",
        inventoryItem: {
          tracked: false,
          requiresShipping: false
        }
      }, {
        price: "100.00",
        optionValues: [{
          optionName: "Amount",
          name: "100.00"
        }],
        inventoryPolicy: "CONTINUE",
        inventoryItem: {
          tracked: false,
          requiresShipping: false
        }
      }, {
        price: "1000.00",
        optionValues: [{
          optionName: "Amount",
          name: "1000.00"
        }],
        inventoryPolicy: "CONTINUE",
        inventoryItem: {
          tracked: false,
          requiresShipping: false
        }
      }];
    }
    const pResponse = await admin.graphql(productMutation, {
      variables: {
        input: productInput
      }
    });
    const pData = await pResponse.json();
    if ((_l = (_k = pData.data) == null ? void 0 : _k.productSet) == null ? void 0 : _l.product) {
      productId = pData.data.productSet.product.id;
      productHandle = pData.data.productSet.product.handle;
      if (isNewImage) {
        let fetchedUrl = (_o = (_n = (_m = pData.data.productSet.product.images) == null ? void 0 : _m.nodes) == null ? void 0 : _n[0]) == null ? void 0 : _o.url;
        if (!fetchedUrl) {
          await new Promise((resolve) => setTimeout(resolve, 2e3));
          const productQuery = await admin.graphql(`
                        query roundupGetProductImage($id: ID!) {
                            product(id: $id) {
                                images(first: 1) {
                                    nodes {
                                        url
                                    }
                                }
                            }
                        }
                    `, {
            variables: {
              id: productId
            }
          });
          const productData = await productQuery.json();
          fetchedUrl = (_t = (_s = (_r = (_q = (_p = productData.data) == null ? void 0 : _p.product) == null ? void 0 : _q.images) == null ? void 0 : _r.nodes) == null ? void 0 : _s[0]) == null ? void 0 : _t.url;
        }
        if (fetchedUrl) {
          finalImageUrl = fetchedUrl;
        }
      }
      if (onlineStorePublicationId) {
        try {
          const publishMutation = `
        mutation PublishDonationProduct($id: ID!, $input: [PublicationInput!]!) {
          publishablePublish(id: $id, input: $input) {
            userErrors {
              field
              message
            }
          }
        }
      `;
          const pubResponse = await admin.graphql(publishMutation, {
            variables: {
              id: productId,
              input: [{
                publicationId: onlineStorePublicationId
              }]
            }
          });
          const pubData = await pubResponse.json();
          const pubErrors = (_v = (_u = pubData.data) == null ? void 0 : _u.publishablePublish) == null ? void 0 : _v.userErrors;
          if (pubErrors && pubErrors.length > 0) {
            console.error("RoundUpDonation: publish errors", pubErrors);
          } else {
            console.log(" Product published to Online Store");
          }
        } catch (error) {
          console.warn("RoundUpDonation: auto-publish failed", error);
        }
      }
    } else if ((_y = (_x = (_w = pData.data) == null ? void 0 : _w.productSet) == null ? void 0 : _x.userErrors) == null ? void 0 : _y.length) {
      console.error("RoundUpDonation: productSet errors", pData.data.productSet.userErrors);
    }
  }
  const updateData = {
    enabled,
    campaignTitle,
    description,
    showImage,
    checkboxLabel,
    rounding,
    customAmount,
    donationOrderTag,
    additionalDonationEnabled,
    additionalDonationTitle,
    placeholderText,
    buttonText,
    imageUrl: finalImageUrl,
    productId,
    productHandle
  };
  await prisma.roundUpDonationSettings.upsert({
    where: {
      shop: session.shop
    },
    update: updateData,
    create: {
      shop: session.shop,
      ...updateData
    }
  });
  const valueData = {
    enabled,
    campaignTitle,
    description,
    showImage,
    checkboxLabel,
    rounding,
    customAmount,
    productId,
    productHandle,
    additionalDonationEnabled,
    additionalDonationTitle,
    placeholderText,
    buttonText,
    imageUrl: finalImageUrl
  };
  const response = await admin.graphql(`
    #graphql
    mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          key
          namespace
          value
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: {
      metafields: [{
        key: "settings",
        namespace: "roundup_donation",
        ownerId: shopId,
        type: "json",
        value: JSON.stringify(valueData)
      }]
    }
  });
  const responseJson = await response.json();
  const userErrors = (_A = (_z = responseJson.data) == null ? void 0 : _z.metafieldsSet) == null ? void 0 : _A.userErrors;
  if (userErrors && userErrors.length > 0) {
    console.error("Metafield update errors:", userErrors);
    return {
      success: false,
      errors: userErrors
    };
  }
  return {
    success: true
  };
}
const app_roundup = UNSAFE_withComponentProps(function RoundUpDonationPage() {
  var _a2, _b, _c;
  const {
    settings
  } = useLoaderData();
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const handleTabChange = useCallback((itemIndex) => setSelectedTabIndex(itemIndex), []);
  const [enabled, setEnabled] = useState((settings == null ? void 0 : settings.enabled) ?? false);
  const [showImage, setShowImage] = useState((settings == null ? void 0 : settings.showImage) ?? false);
  const [additionalDonationEnabled, setAdditionalDonationEnabled] = useState((settings == null ? void 0 : settings.additionalDonationEnabled) ?? false);
  const [campaignTitlePreview, setCampaignTitlePreview] = useState((settings == null ? void 0 : settings.campaignTitle) || "Support Our Cause");
  const [descriptionPreview, setDescriptionPreview] = useState((settings == null ? void 0 : settings.description) || "Round up your order and donate {amount} to support our cause. Every small contribution makes a difference.");
  const editorRef = useRef(null);
  useEffect(() => {
    if (selectedTabIndex === 0 && editorRef.current && editorRef.current.innerHTML !== descriptionPreview) {
      editorRef.current.innerHTML = descriptionPreview;
    }
  }, [selectedTabIndex]);
  const handleEditorInput = () => {
    if (editorRef.current) {
      setDescriptionPreview(editorRef.current.innerHTML);
    }
  };
  const execCommand = (command, value = void 0) => {
    document.execCommand(command, false, value);
    handleEditorInput();
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };
  const [checkboxLabelPreview, setCheckboxLabelPreview] = useState((settings == null ? void 0 : settings.checkboxLabel) || "Yes, I want to donate {amount}");
  const [roundingMode, setRoundingMode] = useState((settings == null ? void 0 : settings.rounding) || "nearest1");
  const [customAmount, setCustomAmount] = useState("0.61");
  const [additionalDonationTitlePreview, setAdditionalDonationTitlePreview] = useState((settings == null ? void 0 : settings.additionalDonationTitle) || "Add an extra donation (optional)");
  const [placeholderTextPreview, setPlaceholderTextPreview] = useState((settings == null ? void 0 : settings.placeholderText) || "Enter amount");
  const [buttonTextPreview, setButtonTextPreview] = useState((settings == null ? void 0 : settings.buttonText) || "Donate");
  const [imageUrlPreview, setImageUrlPreview] = useState((settings == null ? void 0 : settings.imageUrl) || "https://cdn-icons-png.flaticon.com/512/3772/3772231.png");
  const [donationOrderTag, setDonationOrderTag] = useState((settings == null ? void 0 : settings.donationOrderTag) || "");
  const choiceListRef = useRef(null);
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "integration") {
      setSelectedTabIndex(1);
    }
  }, [location.search]);
  useEffect(() => {
    const el = choiceListRef.current;
    if (!el) return;
    const handleChange = (e) => {
      var _a3, _b2, _c2, _d, _e, _f;
      const val = ((_b2 = (_a3 = e.detail) == null ? void 0 : _a3.selected) == null ? void 0 : _b2[0]) || ((_c2 = e.detail) == null ? void 0 : _c2.value) || ((_d = e.target) == null ? void 0 : _d.value) || ((_f = (_e = e.target) == null ? void 0 : _e.values) == null ? void 0 : _f[0]);
      if (val) {
        setRoundingMode(String(val));
      }
    };
    el.addEventListener("change", handleChange);
    el.addEventListener("input", handleChange);
    return () => {
      el.removeEventListener("change", handleChange);
      el.removeEventListener("input", handleChange);
    };
  }, []);
  const cartTotal = 99.39;
  let displayPrice = "$0.00";
  if (roundingMode === "custom") {
    displayPrice = customAmount ? `$${Number(customAmount).toFixed(2)}` : "$0.00";
  } else {
    let rounded = Math.ceil(cartTotal);
    if (roundingMode === "nearest5") rounded = Math.ceil(cartTotal / 5) * 5;
    if (roundingMode === "nearest10") rounded = Math.ceil(cartTotal / 10) * 10;
    displayPrice = `$${(rounded - cartTotal).toFixed(2)}`;
  }
  const replaceAmount = (text2, amount) => {
    if (!text2) return "";
    return text2.replace(/{amount}/g, amount).replace(/\(amount\)/g, amount).replace(/\[amount\]/g, amount);
  };
  const previewDescriptionText = replaceAmount(descriptionPreview, displayPrice);
  const previewCheckboxText = replaceAmount(checkboxLabelPreview, displayPrice);
  const handleToggle = (e) => {
    var _a3;
    e.preventDefault();
    (_a3 = document.getElementById("enabled-checkbox")) == null ? void 0 : _a3.click();
  };
  const handleImageToggle = (e) => {
    const newVal = e.target.checked;
    const checkbox = document.getElementById("showImage-checkbox");
    if (checkbox && checkbox.checked !== newVal) {
      checkbox.click();
    } else {
      setShowImage(newVal);
    }
  };
  const handleAdditionalToggle = (e) => {
    var _a3;
    e.preventDefault();
    (_a3 = document.getElementById("additional-checkbox")) == null ? void 0 : _a3.click();
  };
  const tabs2 = [{
    id: "settings",
    content: "Settings",
    panelID: "settings-content"
  }, {
    id: "Configuration",
    content: "Configuration",
    panelID: "Configuration-content"
  }];
  return /* @__PURE__ */ jsxs("s-page", {
    "inline-size": "large",
    children: [/* @__PURE__ */ jsx("div", {
      className: "polaris-tabs",
      children: /* @__PURE__ */ jsx("div", {
        className: "polaris-tabs-list",
        role: "tablist",
        children: tabs2.map((tab, index2) => {
          const isSelected = selectedTabIndex === index2;
          return /* @__PURE__ */ jsx("button", {
            role: "tab",
            "aria-selected": isSelected,
            className: `polaris-tab ${isSelected ? "active" : ""}`,
            onClick: () => handleTabChange(index2),
            children: tab.content
          }, tab.id);
        })
      })
    }), /* @__PURE__ */ jsx("style", {
      children: `
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
            `
    }), selectedTabIndex === 0 && /* @__PURE__ */ jsxs(Fragment, {
      children: [/* @__PURE__ */ jsx("div", {
        style: {
          marginBottom: "24px"
        },
        children: /* @__PURE__ */ jsxs("s-banner", {
          heading: "Secure Configuration",
          tone: "info",
          children: [/* @__PURE__ */ jsx("s-text", {
            color: "subdued",
            children: "We've synced a dedicated donation product with your store. To maintain seamless operation, please manage all changes through this dashboard rather than the Shopify Admin."
          }), (settings == null ? void 0 : settings.productId) ? /* @__PURE__ */ jsx("s-button", {
            slot: "secondary-actions",
            variant: "secondary",
            href: `https://admin.shopify.com/store/${(_a2 = settings == null ? void 0 : settings.shop) == null ? void 0 : _a2.split(".")[0]}/products/${(_c = (_b = settings.productId) == null ? void 0 : _b.split("/")) == null ? void 0 : _c.pop()}`,
            children: "View Shopify Product"
          }) : /* @__PURE__ */ jsx("s-text", {
            tone: "neutral",
            children: 'Initial setup required. Click "Save" to generate your donation product.'
          })]
        })
      }), /* @__PURE__ */ jsxs(Form, {
        method: "post",
        "data-save-bar": true,
        children: [/* @__PURE__ */ jsx("input", {
          type: "checkbox",
          name: "enabled",
          id: "enabled-checkbox",
          value: "true",
          checked: enabled,
          onChange: (e) => setEnabled(e.target.checked),
          style: {
            display: "none"
          }
        }), /* @__PURE__ */ jsx("input", {
          type: "checkbox",
          name: "showImage",
          id: "showImage-checkbox",
          value: "true",
          checked: showImage,
          onChange: (e) => setShowImage(e.target.checked),
          style: {
            display: "none"
          }
        }), /* @__PURE__ */ jsx("input", {
          type: "checkbox",
          name: "additionalDonationEnabled",
          id: "additional-checkbox",
          value: "true",
          checked: additionalDonationEnabled,
          onChange: (e) => setAdditionalDonationEnabled(e.target.checked),
          style: {
            display: "none"
          }
        }), /* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "campaignTitle",
          value: campaignTitlePreview
        }), /* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "description",
          value: descriptionPreview
        }), /* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "checkboxLabel",
          value: checkboxLabelPreview
        }), /* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "rounding",
          value: roundingMode
        }), /* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "customAmount",
          value: customAmount
        }), /* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "additionalDonationTitle",
          value: additionalDonationTitlePreview
        }), /* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "placeholderText",
          value: placeholderTextPreview
        }), /* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "buttonText",
          value: buttonTextPreview
        }), /* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "imageUrl",
          value: imageUrlPreview
        }), /* @__PURE__ */ jsx("div", {
          style: {
            marginBottom: "24px"
          },
          children: /* @__PURE__ */ jsxs(BlockStack, {
            gap: "100",
            children: [/* @__PURE__ */ jsx(Text, {
              variant: "headingLg",
              as: "h2",
              children: "Campaign Customization"
            }), /* @__PURE__ */ jsx(Text, {
              variant: "bodyMd",
              tone: "subdued",
              children: "Configure your roundup experience to match your brand's voice and mission."
            })]
          })
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 380px",
            gap: "32px",
            alignItems: "start"
          },
          children: [/* @__PURE__ */ jsxs("s-stack", {
            gap: "large",
            children: [/* @__PURE__ */ jsx("s-box", {
              padding: "large",
              background: "base",
              borderWidth: "base",
              borderRadius: "large",
              borderColor: "base",
              shadow: "base",
              children: /* @__PURE__ */ jsxs("s-stack", {
                direction: "inline",
                justifyContent: "space-between",
                alignItems: "center",
                children: [/* @__PURE__ */ jsxs("s-stack", {
                  gap: "small",
                  children: [/* @__PURE__ */ jsxs("s-stack", {
                    direction: "inline",
                    gap: "small",
                    alignItems: "center",
                    children: [/* @__PURE__ */ jsx("s-text", {
                      type: "strong",
                      children: /* @__PURE__ */ jsx("span", {
                        style: {
                          fontSize: "16px",
                          letterSpacing: "-0.01em"
                        },
                        children: "Round-Up Widget Status"
                      })
                    }), enabled ? /* @__PURE__ */ jsx("s-badge", {
                      tone: "success",
                      children: "Live"
                    }) : /* @__PURE__ */ jsx("s-badge", {
                      tone: "warning",
                      children: "Inactive"
                    })]
                  }), /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: /* @__PURE__ */ jsx("span", {
                      style: {
                        fontSize: "13px"
                      },
                      children: enabled ? "The widget is currently active and visible to your customers at checkout." : "Activate the widget to start collecting round-up donations."
                    })
                  })]
                }), /* @__PURE__ */ jsx("s-button", {
                  type: "button",
                  variant: enabled ? "secondary" : "primary",
                  onClick: handleToggle,
                  children: enabled ? "Deactivate Widget" : "Activate Widget"
                })]
              })
            }), /* @__PURE__ */ jsx("s-box", {
              padding: "large",
              background: "base",
              borderWidth: "base",
              borderRadius: "large",
              borderColor: "base",
              shadow: "base",
              children: /* @__PURE__ */ jsxs("s-stack", {
                gap: "large",
                children: [/* @__PURE__ */ jsxs("s-stack", {
                  gap: "small",
                  children: [/* @__PURE__ */ jsx("s-text", {
                    type: "strong",
                    children: /* @__PURE__ */ jsx("span", {
                      style: {
                        fontSize: "16px",
                        letterSpacing: "-0.01em"
                      },
                      children: "Visual Content Settings"
                    })
                  }), /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "Customize how your donation request appears to customers in the cart."
                  })]
                }), /* @__PURE__ */ jsx("div", {
                  style: {
                    height: "1px",
                    background: "#f1f2f3",
                    width: "100%"
                  }
                }), /* @__PURE__ */ jsxs("s-stack", {
                  gap: "base",
                  children: [/* @__PURE__ */ jsx("s-text-field", {
                    name: "campaignTitle",
                    label: "Contribution Title",
                    value: campaignTitlePreview,
                    onInput: (e) => setCampaignTitlePreview(e.target.value),
                    labelAccessibilityVisibility: "visible"
                  }), /* @__PURE__ */ jsxs("div", {
                    style: {
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px"
                    },
                    children: [/* @__PURE__ */ jsx("div", {
                      style: {
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#202223",
                        marginBottom: "2px"
                      },
                      children: "Contribution Description"
                    }), /* @__PURE__ */ jsxs("div", {
                      style: {
                        border: "1px solid #dfe3e8",
                        borderRadius: "8px",
                        overflow: "hidden",
                        background: "#fff",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                      },
                      children: [/* @__PURE__ */ jsxs("div", {
                        style: {
                          borderBottom: "1px solid #dfe3e8",
                          padding: "8px 12px",
                          display: "flex",
                          gap: "8px",
                          background: "#f9fafb",
                          alignItems: "center",
                          flexWrap: "wrap"
                        },
                        children: [/* @__PURE__ */ jsxs("select", {
                          onChange: (e) => execCommand("formatBlock", e.target.value),
                          defaultValue: "p",
                          style: {
                            padding: "6px 10px",
                            border: "1px solid #dfe3e8",
                            borderRadius: "6px",
                            fontSize: "13px",
                            color: "#202223",
                            background: "#fff",
                            cursor: "pointer",
                            outline: "none"
                          },
                          children: [/* @__PURE__ */ jsx("option", {
                            value: "p",
                            children: "Body Text"
                          }), /* @__PURE__ */ jsx("option", {
                            value: "h3",
                            children: "Subheading"
                          }), /* @__PURE__ */ jsx("option", {
                            value: "h2",
                            children: "Heading"
                          })]
                        }), /* @__PURE__ */ jsx("div", {
                          style: {
                            width: "1px",
                            height: "20px",
                            background: "#dfe3e8",
                            margin: "0 4px"
                          }
                        }), /* @__PURE__ */ jsx("button", {
                          type: "button",
                          onClick: () => execCommand("bold"),
                          style: {
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            padding: "6px",
                            color: "#454f5b",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "background 0.2s"
                          },
                          onMouseEnter: (e) => e.currentTarget.style.background = "#f4f6f8",
                          onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
                          title: "Bold",
                          children: /* @__PURE__ */ jsx("svg", {
                            viewBox: "0 0 20 20",
                            style: {
                              width: "16px",
                              height: "16px",
                              fill: "currentColor"
                            },
                            children: /* @__PURE__ */ jsx("path", {
                              d: "M12.44 9.08c1.37-.62 2.16-1.89 2.16-3.33 0-2.45-2-4.25-4.85-4.25H4.25v15h5.81c3.1 0 5.19-2 5.19-4.5 0-1.83-1.02-3.23-2.81-2.92zM7.25 4.5h2.5c1.34 0 2.22.84 2.22 1.94 0 1.1-.88 1.94-2.22 1.94H7.25V4.5zm0 9.5v-4h2.8c1.55 0 2.62.9 2.62 2.06s-1.07 1.94-2.62 1.94h-2.8z"
                            })
                          })
                        }), /* @__PURE__ */ jsx("button", {
                          type: "button",
                          onClick: () => execCommand("italic"),
                          style: {
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            padding: "6px",
                            color: "#454f5b",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "background 0.2s"
                          },
                          onMouseEnter: (e) => e.currentTarget.style.background = "#f4f6f8",
                          onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
                          title: "Italic",
                          children: /* @__PURE__ */ jsx("svg", {
                            viewBox: "0 0 20 20",
                            style: {
                              width: "16px",
                              height: "16px",
                              fill: "currentColor"
                            },
                            children: /* @__PURE__ */ jsx("path", {
                              d: "M8 2h6v2h-1.63l-2.74 9H11.5v2h-6v-2h1.63l2.74-9H8V2z"
                            })
                          })
                        }), /* @__PURE__ */ jsx("div", {
                          style: {
                            width: "1px",
                            height: "20px",
                            background: "#dfe3e8",
                            margin: "0 4px"
                          }
                        }), /* @__PURE__ */ jsx("button", {
                          type: "button",
                          onClick: () => execCommand("insertUnorderedList"),
                          style: {
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            padding: "6px",
                            color: "#454f5b",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "background 0.2s"
                          },
                          onMouseEnter: (e) => e.currentTarget.style.background = "#f4f6f8",
                          onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
                          title: "Bullet List",
                          children: /* @__PURE__ */ jsx("svg", {
                            viewBox: "0 0 20 20",
                            style: {
                              width: "16px",
                              height: "16px",
                              fill: "currentColor"
                            },
                            children: /* @__PURE__ */ jsx("path", {
                              d: "M6 5h12v2H6V5zm0 4h12v2H6V9zm0 4h12v2H6v-2zM3 5h2v2H3V5zm0 4h2v2H3V9zm0 4h2v2H3v-2z"
                            })
                          })
                        }), /* @__PURE__ */ jsx("div", {
                          style: {
                            width: "1px",
                            height: "20px",
                            background: "#dfe3e8",
                            margin: "0 4px"
                          }
                        }), /* @__PURE__ */ jsx("button", {
                          type: "button",
                          onClick: () => execCommand("undo"),
                          style: {
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            padding: "6px",
                            color: "#454f5b",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "background 0.2s"
                          },
                          onMouseEnter: (e) => e.currentTarget.style.background = "#f4f6f8",
                          onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
                          title: "Undo",
                          children: /* @__PURE__ */ jsx("svg", {
                            viewBox: "0 0 20 20",
                            style: {
                              width: "16px",
                              height: "16px",
                              fill: "currentColor"
                            },
                            children: /* @__PURE__ */ jsx("path", {
                              d: "M8 14.5a.5.5 0 0 1 0 1C4.13 15.5 1 12.37 1 8.5S4.13 1.5 8 1.5A6.47 6.47 0 0 1 12.6 3.4L14.5 1.5a.5.5 0 0 1 .85.35v6a.5.5 0 0 1-.5.5h-6A.5.5 0 0 1 8.5 7.5v-.5a.5.5 0 0 1 .15-.35l1.9-1.9A5.47 5.47 0 0 0 8 2.5c-3.31 0-6 2.69-6 6s2.69 6 6 6z"
                            })
                          })
                        })]
                      }), /* @__PURE__ */ jsx("div", {
                        ref: editorRef,
                        contentEditable: true,
                        onInput: handleEditorInput,
                        onBlur: handleEditorInput,
                        style: {
                          minHeight: "120px",
                          padding: "16px",
                          outline: "none",
                          fontSize: "14px",
                          lineHeight: "1.6",
                          cursor: "text",
                          background: "#fff",
                          color: "#202223"
                        }
                      })]
                    })]
                  })]
                }), /* @__PURE__ */ jsx("div", {
                  style: {
                    height: "1px",
                    background: "#e1e3e5",
                    width: "100%"
                  }
                }), /* @__PURE__ */ jsxs("s-stack", {
                  gap: "large",
                  children: [/* @__PURE__ */ jsxs("s-stack", {
                    direction: "inline",
                    justifyContent: "space-between",
                    alignItems: "center",
                    children: [/* @__PURE__ */ jsx("s-text", {
                      type: "strong",
                      children: "Display Contribution Image"
                    }), /* @__PURE__ */ jsx("s-switch", {
                      checked: showImage,
                      onChange: handleImageToggle
                    })]
                  }), /* @__PURE__ */ jsx("div", {
                    style: {
                      opacity: showImage ? 1 : 0.4,
                      transition: "opacity 0.2s ease"
                    },
                    children: /* @__PURE__ */ jsxs("s-stack", {
                      direction: "inline",
                      gap: "large",
                      alignItems: "center",
                      children: [/* @__PURE__ */ jsx("div", {
                        style: {
                          border: "1px solid #e1e3e5",
                          borderRadius: "8px",
                          overflow: "hidden",
                          width: "80px",
                          height: "80px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        },
                        children: /* @__PURE__ */ jsx("img", {
                          src: imageUrlPreview || "https://via.placeholder.com/80",
                          style: {
                            width: "100%",
                            height: "100%",
                            objectFit: "cover"
                          }
                        })
                      }), /* @__PURE__ */ jsxs("s-stack", {
                        gap: "small",
                        children: [/* @__PURE__ */ jsx("s-button", {
                          type: "button",
                          onClick: () => {
                            var _a3;
                            return (_a3 = document.getElementById("image-upload-input")) == null ? void 0 : _a3.click();
                          },
                          disabled: !showImage,
                          children: "Upload New Image"
                        }), /* @__PURE__ */ jsx("input", {
                          type: "file",
                          id: "image-upload-input",
                          style: {
                            display: "none"
                          },
                          accept: "image/*",
                          onChange: (e) => {
                            var _a3;
                            if (!showImage) return;
                            const file = (_a3 = e.target.files) == null ? void 0 : _a3[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                var _a4;
                                if ((_a4 = event.target) == null ? void 0 : _a4.result) {
                                  setImageUrlPreview(event.target.result);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }
                        })]
                      })]
                    })
                  })]
                }), /* @__PURE__ */ jsx("div", {
                  style: {
                    height: "1px",
                    background: "#e1e3e5",
                    width: "100%"
                  }
                }), /* @__PURE__ */ jsxs("s-stack", {
                  gap: "none",
                  children: [/* @__PURE__ */ jsx("s-text-field", {
                    name: "checkboxLabel",
                    label: "Checkbox Label",
                    value: checkboxLabelPreview,
                    onInput: (e) => setCheckboxLabelPreview(e.target.value),
                    labelAccessibilityVisibility: "visible"
                  }), /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "Use (amount) as a placeholder for the calculated donation amount."
                  })]
                })]
              })
            }), /* @__PURE__ */ jsx("s-box", {
              padding: "large",
              background: "base",
              borderWidth: "base",
              borderRadius: "large",
              borderColor: "base",
              shadow: "base",
              children: /* @__PURE__ */ jsxs("s-stack", {
                gap: "large",
                children: [/* @__PURE__ */ jsxs("s-stack", {
                  gap: "small",
                  children: [/* @__PURE__ */ jsx("s-text", {
                    type: "strong",
                    children: /* @__PURE__ */ jsx("span", {
                      style: {
                        fontSize: "16px",
                        letterSpacing: "-0.01em"
                      },
                      children: "Rounding Rules"
                    })
                  }), /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "Define how the cart total should be calculated for the donation."
                  })]
                }), /* @__PURE__ */ jsx("div", {
                  style: {
                    height: "1px",
                    background: "#f1f2f3",
                    width: "100%"
                  }
                }), /* @__PURE__ */ jsxs("s-stack", {
                  gap: "base",
                  children: [/* @__PURE__ */ jsxs("s-choice-list", {
                    name: "rounding",
                    ref: choiceListRef,
                    values: [roundingMode],
                    onInput: (e) => {
                      var _a3, _b2;
                      const val = e.target.value || ((_a3 = e.detail) == null ? void 0 : _a3.value) || ((_b2 = e.target.values) == null ? void 0 : _b2[0]);
                      if (val) setRoundingMode(String(val));
                    },
                    children: [/* @__PURE__ */ jsx("s-choice", {
                      value: "nearest1",
                      selected: roundingMode === "nearest1",
                      children: "Round to nearest $1.00"
                    }), /* @__PURE__ */ jsx("s-choice", {
                      value: "nearest5",
                      selected: roundingMode === "nearest5",
                      children: "Round to nearest $5.00"
                    }), /* @__PURE__ */ jsx("s-choice", {
                      value: "nearest10",
                      selected: roundingMode === "nearest10",
                      children: "Round to nearest $10.00"
                    }), /* @__PURE__ */ jsx("s-choice", {
                      value: "custom",
                      selected: roundingMode === "custom",
                      children: "Fixed custom amount"
                    })]
                  }), roundingMode === "custom" && /* @__PURE__ */ jsx("s-box", {
                    paddingBlockStart: "small",
                    children: /* @__PURE__ */ jsx("s-text-field", {
                      name: "customAmount",
                      label: "Donation Amount ($)",
                      value: customAmount,
                      onInput: (e) => {
                        var _a3;
                        return setCustomAmount(e.target.value || ((_a3 = e.detail) == null ? void 0 : _a3.value) || "");
                      },
                      labelAccessibilityVisibility: "visible"
                    })
                  })]
                }), /* @__PURE__ */ jsx("div", {
                  style: {
                    padding: "12px",
                    background: "#f4f6f8",
                    borderRadius: "6px",
                    borderLeft: "3px solid #6C4A79"
                  },
                  children: /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    size: "small",
                    children: 'Tip: Most merchants choose "Nearest $1" for the best conversion rate.'
                  })
                }), /* @__PURE__ */ jsx("s-text-field", {
                  name: "donationOrderTag",
                  label: "Internal Order Tag",
                  value: (settings == null ? void 0 : settings.donationOrderTag) || "roundUpDonation",
                  readOnly: true,
                  labelAccessibilityVisibility: "visible"
                })]
              })
            }), /* @__PURE__ */ jsx("s-box", {
              padding: "large",
              background: "base",
              borderWidth: "base",
              borderRadius: "large",
              borderColor: "base",
              shadow: "base",
              children: /* @__PURE__ */ jsxs("s-stack", {
                gap: "large",
                children: [/* @__PURE__ */ jsxs("s-stack", {
                  direction: "inline",
                  justifyContent: "space-between",
                  alignItems: "center",
                  children: [/* @__PURE__ */ jsxs("s-stack", {
                    gap: "small",
                    children: [/* @__PURE__ */ jsxs("s-stack", {
                      direction: "inline",
                      gap: "small",
                      alignItems: "center",
                      children: [/* @__PURE__ */ jsx("s-text", {
                        type: "strong",
                        children: /* @__PURE__ */ jsx("span", {
                          style: {
                            fontSize: "16px",
                            letterSpacing: "-0.01em"
                          },
                          children: "Optional Manual Top-Up"
                        })
                      }), additionalDonationEnabled ? /* @__PURE__ */ jsx("s-badge", {
                        tone: "success",
                        children: "Active"
                      }) : /* @__PURE__ */ jsx("s-badge", {
                        tone: "warning",
                        children: "Disabled"
                      })]
                    }), /* @__PURE__ */ jsx("s-text", {
                      color: "subdued",
                      children: "Allow customers to add a specific donation amount manually."
                    })]
                  }), /* @__PURE__ */ jsx("s-button", {
                    type: "button",
                    variant: additionalDonationEnabled ? "secondary" : "primary",
                    onClick: handleAdditionalToggle,
                    children: additionalDonationEnabled ? "Disable" : "Enable"
                  })]
                }), additionalDonationEnabled && /* @__PURE__ */ jsxs(Fragment, {
                  children: [/* @__PURE__ */ jsx("div", {
                    style: {
                      height: "1px",
                      background: "#f1f2f3",
                      width: "100%"
                    }
                  }), /* @__PURE__ */ jsxs("s-stack", {
                    gap: "base",
                    children: [/* @__PURE__ */ jsx("s-text-field", {
                      name: "additionalDonationTitle",
                      label: "Widget Headline",
                      value: additionalDonationTitlePreview,
                      onInput: (e) => setAdditionalDonationTitlePreview(e.target.value),
                      labelAccessibilityVisibility: "visible"
                    }), /* @__PURE__ */ jsxs("div", {
                      style: {
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "16px"
                      },
                      children: [/* @__PURE__ */ jsx("s-text-field", {
                        name: "placeholderText",
                        label: "Input Placeholder",
                        value: placeholderTextPreview,
                        onInput: (e) => setPlaceholderTextPreview(e.target.value),
                        labelAccessibilityVisibility: "visible"
                      }), /* @__PURE__ */ jsx("s-text-field", {
                        name: "buttonText",
                        label: "Action Button Text",
                        value: buttonTextPreview,
                        onInput: (e) => setButtonTextPreview(e.target.value),
                        labelAccessibilityVisibility: "visible"
                      })]
                    })]
                  })]
                })]
              })
            })]
          }), /* @__PURE__ */ jsx("div", {
            style: {
              position: "sticky",
              top: "24px"
            },
            children: /* @__PURE__ */ jsxs("s-stack", {
              gap: "large",
              children: [/* @__PURE__ */ jsxs("div", {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "4px"
                },
                children: [/* @__PURE__ */ jsx("svg", {
                  viewBox: "0 0 20 20",
                  style: {
                    width: "18px",
                    height: "18px",
                    fill: "#6C4A79"
                  },
                  children: /* @__PURE__ */ jsx("path", {
                    d: "M12 2a1 1 0 0 1 1 1v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0V6H9a1 1 0 1 1 0-2h1V3a1 1 0 0 1 1-1ZM5 8a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8Zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1H7Z"
                  })
                }), /* @__PURE__ */ jsx("s-text", {
                  type: "strong",
                  children: /* @__PURE__ */ jsx("span", {
                    style: {
                      fontSize: "15px",
                      letterSpacing: "-0.01em",
                      color: "#6C4A79"
                    },
                    children: "Live Widget Preview"
                  })
                })]
              }), /* @__PURE__ */ jsxs("s-box", {
                padding: "none",
                background: "base",
                borderWidth: "base",
                borderRadius: "large",
                borderColor: "base",
                shadow: "base",
                overflow: "hidden",
                children: [/* @__PURE__ */ jsxs("div", {
                  style: {
                    background: "#f9fafb",
                    padding: "12px 16px",
                    borderBottom: "1px solid #dfe3e8",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  },
                  children: [/* @__PURE__ */ jsx("s-text", {
                    type: "strong",
                    size: "small",
                    children: "Storefront Preview"
                  }), /* @__PURE__ */ jsxs("div", {
                    style: {
                      display: "flex",
                      gap: "4px"
                    },
                    children: [/* @__PURE__ */ jsx("div", {
                      style: {
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#ff5f56"
                      }
                    }), /* @__PURE__ */ jsx("div", {
                      style: {
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#ffbd2e"
                      }
                    }), /* @__PURE__ */ jsx("div", {
                      style: {
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#27c93f"
                      }
                    })]
                  })]
                }), /* @__PURE__ */ jsx("s-box", {
                  padding: "large",
                  children: /* @__PURE__ */ jsxs("s-stack", {
                    gap: "large",
                    children: [/* @__PURE__ */ jsxs("s-stack", {
                      direction: "inline",
                      gap: "base",
                      alignItems: "center",
                      children: [showImage && /* @__PURE__ */ jsx("div", {
                        style: {
                          width: "56px",
                          height: "56px",
                          overflow: "hidden",
                          borderRadius: "12px",
                          border: "1px solid #eee",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
                        },
                        children: /* @__PURE__ */ jsx("img", {
                          src: imageUrlPreview,
                          alt: "Preview",
                          style: {
                            width: "100%",
                            height: "100%",
                            objectFit: "cover"
                          }
                        })
                      }), /* @__PURE__ */ jsx("s-text", {
                        type: "strong",
                        children: /* @__PURE__ */ jsx("span", {
                          style: {
                            fontSize: "15px"
                          },
                          children: campaignTitlePreview || "Support Our Cause"
                        })
                      })]
                    }), /* @__PURE__ */ jsx("div", {
                      dangerouslySetInnerHTML: {
                        __html: previewDescriptionText
                      },
                      style: {
                        color: "#454f5b",
                        fontSize: "14px",
                        lineHeight: "1.6",
                        margin: "4px 0"
                      }
                    }), /* @__PURE__ */ jsx("div", {
                      style: {
                        padding: "16px",
                        background: "linear-gradient(135deg, #f6f6f7 0%, #ffffff 100%)",
                        borderRadius: "10px",
                        border: "1px solid #dfe3e8",
                        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)"
                      },
                      children: /* @__PURE__ */ jsxs("div", {
                        style: {
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        },
                        children: [/* @__PURE__ */ jsx("s-text", {
                          color: "subdued",
                          children: "Calculated Round-Up"
                        }), /* @__PURE__ */ jsx("s-text", {
                          type: "strong",
                          children: /* @__PURE__ */ jsx("span", {
                            style: {
                              color: "#6C4A79",
                              fontSize: "16px"
                            },
                            children: displayPrice
                          })
                        })]
                      })
                    }), /* @__PURE__ */ jsxs("div", {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      },
                      children: [/* @__PURE__ */ jsx("input", {
                        type: "checkbox",
                        checked: true,
                        readOnly: true,
                        style: {
                          accentColor: "#6C4A79",
                          width: "18px",
                          height: "18px"
                        }
                      }), /* @__PURE__ */ jsx("s-text", {
                        children: /* @__PURE__ */ jsx("span", {
                          style: {
                            fontSize: "14px",
                            fontWeight: 500
                          },
                          children: previewCheckboxText
                        })
                      })]
                    }), additionalDonationEnabled && /* @__PURE__ */ jsx("div", {
                      style: {
                        borderTop: "1px dashed #dfe3e8",
                        paddingTop: "20px",
                        marginTop: "4px"
                      },
                      children: /* @__PURE__ */ jsxs("s-stack", {
                        gap: "base",
                        children: [/* @__PURE__ */ jsx("s-text", {
                          type: "strong",
                          children: /* @__PURE__ */ jsx("span", {
                            style: {
                              fontSize: "14px"
                            },
                            children: additionalDonationTitlePreview
                          })
                        }), /* @__PURE__ */ jsxs("div", {
                          style: {
                            display: "flex",
                            gap: "8px",
                            alignItems: "stretch"
                          },
                          children: [/* @__PURE__ */ jsx("div", {
                            style: {
                              flex: 1,
                              padding: "10px 14px",
                              background: "#fff",
                              border: "1px solid #dfe3e8",
                              borderRadius: "8px",
                              color: "#919eab",
                              fontSize: "13px",
                              display: "flex",
                              alignItems: "center"
                            },
                            children: placeholderTextPreview
                          }), /* @__PURE__ */ jsx("s-button", {
                            disabled: true,
                            children: buttonTextPreview
                          })]
                        })]
                      })
                    })]
                  })
                })]
              }), /* @__PURE__ */ jsx("s-box", {
                padding: "large",
                background: "subdued",
                borderRadius: "large",
                children: /* @__PURE__ */ jsxs("s-stack", {
                  direction: "inline",
                  gap: "small",
                  alignItems: "start",
                  children: [/* @__PURE__ */ jsx("svg", {
                    viewBox: "0 0 20 20",
                    style: {
                      width: "16px",
                      height: "16px",
                      fill: "#637381",
                      marginTop: "2px"
                    },
                    children: /* @__PURE__ */ jsx("path", {
                      d: "M10 2a8 8 0 1 0 8 8 8.009 8.009 0 0 0-8-8Zm0 14a6 6 0 1 1 6-6 6.007 6.007 0 0 1-6 6Zm-1-5h2v2H9v-2Zm0-6h2v4H9V5Z"
                    })
                  }), /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: /* @__PURE__ */ jsxs("span", {
                      style: {
                        fontSize: "13px"
                      },
                      children: ["The preview reflects the calculations based on a sample cart total of ", /* @__PURE__ */ jsx("strong", {
                        children: "$99.39"
                      }), "."]
                    })
                  })]
                })
              })]
            })
          })]
        })]
      })]
    }), selectedTabIndex === 1 && /* @__PURE__ */ jsx(ConfigurationTab, {
      blocks: [{
        id: "roundup-cart",
        title: "Cart Page Setup",
        description: "To add the roundup donation section to your cart page, click the button below to insert the app block.",
        themeEditorUrl: `https://admin.shopify.com/store/${((settings == null ? void 0 : settings.shop) || "").split(".")[0]}/themes/current/editor?template=cart`,
        buttonLabel: "Open Cart Editor ↗",
        previewSvg: CART_PREVIEW_SVG,
        enabled,
        instructions: ["Go to ", "Online Store", " ➺ ", "Themes", " ➺ Click on ", "Customize", " ➺ Select ", "Cart Page", " Template ➺ Click ", "Add Block", " ➺ Select ", "Round Up Donation"],
        onToggle: (val) => setEnabled(val)
      }]
    })]
  });
});
const route36 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$1,
  default: app_roundup,
  loader: loader$2
}, Symbol.toStringTag, { value: "Module" }));
const loader$1 = async ({
  request
}) => {
  var _a2, _b;
  const {
    session,
    admin
  } = await authenticate.admin(request);
  const shop = session.shop;
  let currencyCode = "USD";
  try {
    const currencyResponse = await admin.graphql(`
      query {
        shop {
          currencyCode
        }
      }
    `);
    const currencyData = await currencyResponse.json();
    currencyCode = ((_b = (_a2 = currencyData.data) == null ? void 0 : _a2.shop) == null ? void 0 : _b.currencyCode) || "USD";
  } catch (e) {
    console.error("Error fetching shop currency:", e);
  }
  try {
    const {
      registerWebhooks: registerWebhooks2
    } = await Promise.resolve().then(() => shopify_server);
    await registerWebhooks2({
      session
    });
    console.log(`[Webhook Registration] Webhooks successfully registered for ${session.shop}`);
  } catch (e) {
    console.error(`[Webhook Registration] Failed to manual register:`, e);
  }
  const last7DaysDate = /* @__PURE__ */ new Date();
  last7DaysDate.setDate(last7DaysDate.getDate() - 7);
  const [presetStats, presetLast7Days, posLogs, recurringLogs, appSettings, posSettings, roundupSettings, campaignsCount] = await Promise.all([prisma.donation.aggregate({
    where: {
      campaign: {
        shop
      }
    },
    _sum: {
      amount: true
    }
  }), prisma.donation.aggregate({
    where: {
      campaign: {
        shop
      },
      createdAt: {
        gte: last7DaysDate
      }
    },
    _sum: {
      amount: true
    }
  }), prisma.posDonationLog.findMany({
    where: {
      shop
    }
  }), prisma.recurringDonationLog.findMany({
    where: {
      shop
    }
  }), prisma.appSettings.findUnique({
    where: {
      shop
    }
  }), prisma.posDonationSettings.findUnique({
    where: {
      shop
    }
  }), prisma.roundUpDonationSettings.findUnique({
    where: {
      shop
    }
  }), prisma.campaign.count({
    where: {
      shop,
      enabled: true
    }
  })]);
  const roundupLogs = await prisma.roundUpDonationLog.findMany({
    where: {
      shop
    }
  });
  const allPosLogs = posLogs;
  const totalPos = allPosLogs.reduce((acc, l) => acc + (l.donationAmount || 0), 0);
  const posOrderCountInt = allPosLogs.length;
  const last7DaysPos = allPosLogs.filter((l) => new Date(l.createdAt) >= last7DaysDate).reduce((acc, l) => acc + (l.donationAmount || 0), 0);
  const allRoundupLogs = roundupLogs;
  const totalRoundup = allRoundupLogs.reduce((acc, l) => acc + (l.donationAmount || 0), 0);
  const last7DaysRoundup = allRoundupLogs.filter((l) => new Date(l.createdAt) >= last7DaysDate).reduce((acc, l) => acc + (l.donationAmount || 0), 0);
  const allRecurringLogs = recurringLogs;
  const totalRecurring = allRecurringLogs.reduce((acc, l) => acc + (l.donationAmount || 0), 0);
  const last7DaysRecurring = allRecurringLogs.filter((l) => new Date(l.createdAt) >= last7DaysDate).reduce((acc, l) => acc + (l.donationAmount || 0), 0);
  const totalPreset = presetStats._sum.amount || 0;
  const totalImpact = totalPreset + totalPos + totalRoundup + totalRecurring;
  const last7DaysPreset = presetLast7Days._sum.amount || 0;
  const totalLast7Days = last7DaysPreset + last7DaysPos + last7DaysRoundup + last7DaysRecurring;
  let activeChannels = 0;
  if (campaignsCount > 0) activeChannels++;
  if (posSettings == null ? void 0 : posSettings.enabled) activeChannels++;
  if (roundupSettings == null ? void 0 : roundupSettings.enabled) activeChannels++;
  return {
    enabled: (appSettings == null ? void 0 : appSettings.enabled) ?? true,
    shop: session.shop,
    currency: currencyCode,
    stats: {
      totalImpact: totalImpact.toFixed(2),
      totalLast7Days: totalLast7Days.toFixed(2),
      activeChannels,
      preset: {
        total: totalPreset.toFixed(2),
        last7Days: last7DaysPreset.toFixed(2)
      },
      pos: {
        total: totalPos.toFixed(2),
        orderCount: posOrderCountInt,
        last7Days: last7DaysPos.toFixed(2)
      },
      roundup: {
        total: totalRoundup.toFixed(2)
      },
      recurring: {
        total: totalRecurring.toFixed(2)
      }
    }
  };
};
const action = async ({
  request
}) => {
  const {
    session,
    admin
  } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const enabled = formData.get("enabled") === "true";
  await prisma.appSettings.upsert({
    where: {
      shop
    },
    update: {
      enabled
    },
    create: {
      shop,
      enabled
    }
  });
  try {
    const appResponse = await admin.graphql(`query { currentAppInstallation { id } }`);
    const appData = await appResponse.json();
    const appId = appData.data.currentAppInstallation.id;
    await admin.graphql(`

      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {

        metafieldsSet(metafields: $metafields) {

          metafields { id }

          userErrors { field message }

        }

      }

    `, {
      variables: {
        metafields: [{
          ownerId: appId,
          namespace: "common",
          key: "enabled",
          type: "boolean",
          value: String(enabled)
        }]
      }
    });
  } catch (e) {
    console.error("Error syncing global settings to Metafields:", e);
  }
  return {
    status: "success"
  };
};
const app__index = UNSAFE_withComponentProps(function Index() {
  var _a2;
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const shopify2 = useAppBridge();
  const navigate = useNavigate();
  const currencyCode = (loaderData == null ? void 0 : loaderData.currency) || "USD";
  const moneyFormatter = new Intl.NumberFormat(void 0, {
    style: "currency",
    currency: currencyCode
  });
  const [enabled, setEnabled] = useState((loaderData == null ? void 0 : loaderData.enabled) ?? true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  useEffect(() => {
    var _a3;
    if (((_a3 = fetcher.data) == null ? void 0 : _a3.status) === "success") {
      shopify2.toast.show(`App ${enabled ? "enabled" : "disabled"} successfully`);
    }
  }, [fetcher.data, enabled, shopify2]);
  const toggleStatus = () => {
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    const formData = new FormData();
    formData.append("enabled", String(nextEnabled));
    fetcher.submit(formData, {
      method: "POST"
    });
  };
  const handleContactSupport = () => {
    if (window.Tawk_API) {
      window.Tawk_API.maximize();
    } else {
      shopify2.toast.show("Support chat is loading...", {
        duration: 3e3
      });
    }
  };
  const submitReview = () => {
    shopify2.toast.show("Thank you for your feedback!", {
      duration: 5e3
    });
    setShowReviewModal(false);
  };
  return /* @__PURE__ */ jsxs("s-page", {
    children: [showReviewModal && /* @__PURE__ */ jsx("div", {
      style: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.5)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      },
      children: /* @__PURE__ */ jsx("div", {
        style: {
          background: "white",
          padding: "32px",
          borderRadius: "16px",
          width: "450px",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
        },
        children: /* @__PURE__ */ jsxs("s-stack", {
          gap: "large",
          children: [/* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            },
            children: [/* @__PURE__ */ jsx("s-text", {
              type: "strong",
              children: "Write a Review"
            }), /* @__PURE__ */ jsx("s-button", {
              variant: "secondary",
              onClick: () => setShowReviewModal(false),
              children: "✕"
            })]
          }), /* @__PURE__ */ jsxs("s-stack", {
            gap: "base",
            children: [/* @__PURE__ */ jsx("s-text", {
              color: "subdued",
              children: "How would you rate your experience?"
            }), /* @__PURE__ */ jsx("div", {
              style: {
                display: "flex",
                gap: "8px"
              },
              children: [1, 2, 3, 4, 5].map((star) => /* @__PURE__ */ jsx("button", {
                onClick: () => setRating(star),
                style: {
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: star <= rating ? "#FFB800" : "#E5E7EB"
                },
                children: "★"
              }, star))
            })]
          }), /* @__PURE__ */ jsxs("s-stack", {
            gap: "small",
            children: [/* @__PURE__ */ jsx("s-text", {
              color: "subdued",
              children: "Your feedback helps us improve."
            }), /* @__PURE__ */ jsx("textarea", {
              placeholder: "Tell us what you think...",
              value: reviewText,
              onChange: (e) => setReviewText(e.target.value),
              style: {
                width: "100%",
                minHeight: "120px",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #E1E3E5",
                fontFamily: "inherit"
              }
            })]
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              gap: "12px"
            },
            children: [/* @__PURE__ */ jsx("s-button", {
              "full-width": true,
              variant: "primary",
              onClick: submitReview,
              children: "Submit Feedback"
            }), /* @__PURE__ */ jsx("s-button", {
              "full-width": true,
              variant: "secondary",
              onClick: () => setShowReviewModal(false),
              children: "Cancel"
            })]
          })]
        })
      })
    }), /* @__PURE__ */ jsxs("div", {
      style: {
        paddingBottom: "32px"
      },
      children: [/* @__PURE__ */ jsx("h1", {
        style: {
          fontSize: "28px",
          fontWeight: 700,
          margin: 0,
          paddingBottom: "8px",
          color: "#1A1C23"
        },
        children: "Performance Dashboard"
      }), /* @__PURE__ */ jsx("s-text", {
        color: "subdued",
        children: "Detailed overview of your donation channels and their individual performance."
      })]
    }), /* @__PURE__ */ jsxs("s-stack", {
      direction: "block",
      gap: "large",
      children: [/* @__PURE__ */ jsx("div", {
        style: {
          background: "linear-gradient(135deg, #6C4A79 0%, #4A3454 100%)",
          color: "white",
          padding: "32px",
          borderRadius: "12px",
          marginBottom: "20px"
        },
        children: /* @__PURE__ */ jsx("div", {
          style: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center"
          },
          children: /* @__PURE__ */ jsxs("s-stack", {
            gap: "small",
            children: [/* @__PURE__ */ jsx("div", {
              style: {
                color: "rgba(255,255,255,0.8)",
                fontSize: "16px",
                fontWeight: 500
              },
              children: "Total Donation Amount"
            }), /* @__PURE__ */ jsx("div", {
              style: {
                fontSize: "48px",
                fontWeight: 800,
                color: "white"
              },
              children: moneyFormatter.format(parseFloat(loaderData.stats.totalImpact))
            })]
          })
        })
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "20px"
        },
        children: [/* @__PURE__ */ jsx("div", {
          style: {
            borderTop: "4px solid #008060",
            borderRadius: "12px"
          },
          children: /* @__PURE__ */ jsx("s-box", {
            padding: "large",
            background: "base",
            borderWidth: "base",
            borderRadius: "large",
            borderColor: "base",
            children: /* @__PURE__ */ jsxs("s-stack", {
              gap: "base",
              children: [/* @__PURE__ */ jsx("s-text", {
                type: "strong",
                children: "Preset Donation"
              }), /* @__PURE__ */ jsx("div", {
                style: {
                  background: "#F9FAFB",
                  padding: "32px 24px",
                  borderRadius: "8px",
                  textAlign: "center"
                },
                children: /* @__PURE__ */ jsx("div", {
                  style: {
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "baseline",
                    gap: "6px"
                  },
                  children: /* @__PURE__ */ jsx("span", {
                    style: {
                      fontSize: "32px",
                      fontWeight: 700,
                      color: "#1A1C23"
                    },
                    children: moneyFormatter.format(parseFloat(loaderData.stats.preset.total))
                  })
                })
              }), /* @__PURE__ */ jsx("s-button", {
                "full-width": true,
                variant: "secondary",
                onClick: () => navigate("/app/preset-donation"),
                children: "View details"
              })]
            })
          })
        }), /* @__PURE__ */ jsx("div", {
          style: {
            borderTop: "4px solid #D82C0D",
            borderRadius: "12px"
          },
          children: /* @__PURE__ */ jsx("s-box", {
            padding: "large",
            background: "base",
            borderWidth: "base",
            borderRadius: "large",
            borderColor: "base",
            children: /* @__PURE__ */ jsxs("s-stack", {
              gap: "base",
              children: [/* @__PURE__ */ jsx("s-text", {
                type: "strong",
                children: "Portion of Sale"
              }), /* @__PURE__ */ jsx("div", {
                style: {
                  background: "#F9FAFB",
                  padding: "32px 24px",
                  borderRadius: "8px",
                  textAlign: "center"
                },
                children: /* @__PURE__ */ jsx("div", {
                  style: {
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "baseline",
                    gap: "6px"
                  },
                  children: /* @__PURE__ */ jsx("span", {
                    style: {
                      fontSize: "32px",
                      fontWeight: 700,
                      color: "#1A1C23"
                    },
                    children: moneyFormatter.format(parseFloat(loaderData.stats.pos.total))
                  })
                })
              }), /* @__PURE__ */ jsx("s-button", {
                "full-width": true,
                variant: "secondary",
                onClick: () => navigate("/app/pos-donation"),
                children: "View details"
              })]
            })
          })
        }), /* @__PURE__ */ jsx("div", {
          style: {
            borderTop: "4px solid #965A00",
            borderRadius: "12px"
          },
          children: /* @__PURE__ */ jsx("s-box", {
            padding: "large",
            background: "base",
            borderWidth: "base",
            borderRadius: "large",
            borderColor: "base",
            children: /* @__PURE__ */ jsxs("s-stack", {
              gap: "base",
              children: [/* @__PURE__ */ jsx("s-text", {
                type: "strong",
                children: "Round-Up Donation"
              }), /* @__PURE__ */ jsx("div", {
                style: {
                  background: "#F9FAFB",
                  padding: "32px 24px",
                  borderRadius: "8px",
                  textAlign: "center"
                },
                children: /* @__PURE__ */ jsx("div", {
                  style: {
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "baseline",
                    gap: "6px"
                  },
                  children: /* @__PURE__ */ jsx("span", {
                    style: {
                      fontSize: "32px",
                      fontWeight: 700,
                      color: "#1A1C23"
                    },
                    children: moneyFormatter.format(parseFloat(loaderData.stats.roundup.total))
                  })
                })
              }), /* @__PURE__ */ jsx("s-button", {
                "full-width": true,
                variant: "secondary",
                onClick: () => navigate("/app/roundup"),
                children: "View details"
              })]
            })
          })
        }), /* @__PURE__ */ jsx("div", {
          style: {
            borderTop: "4px solid #6C4A79",
            borderRadius: "12px"
          },
          children: /* @__PURE__ */ jsx("s-box", {
            padding: "large",
            background: "base",
            borderWidth: "base",
            borderRadius: "large",
            borderColor: "base",
            children: /* @__PURE__ */ jsxs("s-stack", {
              gap: "base",
              children: [/* @__PURE__ */ jsx("s-text", {
                type: "strong",
                children: "Recurring Donation"
              }), /* @__PURE__ */ jsx("div", {
                style: {
                  background: "#F9FAFB",
                  padding: "32px 24px",
                  borderRadius: "8px",
                  textAlign: "center"
                },
                children: /* @__PURE__ */ jsx("div", {
                  style: {
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "baseline",
                    gap: "6px"
                  },
                  children: /* @__PURE__ */ jsx("span", {
                    style: {
                      fontSize: "32px",
                      fontWeight: 700,
                      color: "#1A1C23"
                    },
                    children: moneyFormatter.format(parseFloat(((_a2 = loaderData.stats.recurring) == null ? void 0 : _a2.total) || "0"))
                  })
                })
              }), /* @__PURE__ */ jsx("s-button", {
                "full-width": true,
                variant: "secondary",
                onClick: () => navigate("/app/recurring-subscriptions"),
                children: "View details"
              })]
            })
          })
        })]
      }), /* @__PURE__ */ jsx("s-box", {
        padding: "large",
        background: "base",
        borderWidth: "base",
        borderRadius: "large",
        borderColor: "base",
        children: /* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          },
          children: [/* @__PURE__ */ jsxs("s-stack", {
            gap: "base",
            children: [/* @__PURE__ */ jsxs("div", {
              style: {
                display: "flex",
                alignItems: "center",
                gap: "12px"
              },
              children: [/* @__PURE__ */ jsx("s-text", {
                type: "strong",
                children: "Global App Status"
              }), /* @__PURE__ */ jsx("s-badge", {
                tone: enabled ? "success" : "warning",
                children: enabled ? "Enable" : "Paused"
              })]
            }), /* @__PURE__ */ jsx("s-text", {
              color: "subdued",
              children: enabled ? "Your donation widgets are currently visible and active on your storefront." : "All donation features are currently hidden. Enable to resume collecting contributions."
            })]
          }), /* @__PURE__ */ jsx("s-button", {
            variant: enabled ? "secondary" : "primary",
            onClick: toggleStatus,
            children: enabled ? "Disable All Widgets" : "Enable All Widgets"
          })]
        })
      }), /* @__PURE__ */ jsxs("s-stack", {
        gap: "base",
        children: [/* @__PURE__ */ jsx("div", {
          style: {
            paddingBottom: "8px"
          },
          children: /* @__PURE__ */ jsxs("s-stack", {
            gap: "small",
            children: [/* @__PURE__ */ jsx("s-text", {
              type: "strong",
              children: "Giving Channels"
            }), /* @__PURE__ */ jsx("s-text", {
              color: "subdued",
              children: "Configure how your customers contribute to your causes."
            })]
          })
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px"
          },
          children: [/* @__PURE__ */ jsx("s-box", {
            padding: "large",
            background: "base",
            borderWidth: "base",
            borderRadius: "large",
            borderColor: "base",
            children: /* @__PURE__ */ jsxs("s-stack", {
              gap: "base",
              children: [/* @__PURE__ */ jsx("div", {
                style: {
                  background: "#E3F1DF",
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                },
                children: /* @__PURE__ */ jsx("svg", {
                  viewBox: "0 0 20 20",
                  style: {
                    width: "22px",
                    fill: "#008060"
                  },
                  children: /* @__PURE__ */ jsx("path", {
                    d: "M10 18.25a.75.75 0 0 1-.53-.22l-6.8-6.73a4.52 4.52 0 0 1 0-6.4 4.5 4.5 0 0 1 6.36 0L10 5.86l.97-.96a4.5 4.5 0 0 1 6.36 0 4.52 4.52 0 0 1 0 6.4l-6.8 6.73a.75.75 0 0 1-.53.22Z"
                  })
                })
              }), /* @__PURE__ */ jsxs("s-stack", {
                gap: "base",
                children: [/* @__PURE__ */ jsx("s-text", {
                  type: "strong",
                  children: "One-Time Donations"
                }), /* @__PURE__ */ jsx("s-text", {
                  color: "subdued",
                  children: "Customers choose fixed amounts from your predefined list."
                })]
              }), /* @__PURE__ */ jsx("div", {
                style: {
                  marginTop: "12px"
                },
                children: /* @__PURE__ */ jsxs("s-stack", {
                  gap: "small",
                  children: [/* @__PURE__ */ jsx("s-button", {
                    "full-width": true,
                    variant: "primary",
                    onClick: () => navigate("/app/preset-donation"),
                    children: "Manage Setting"
                  }), /* @__PURE__ */ jsx("s-button", {
                    "full-width": true,
                    variant: "secondary",
                    onClick: () => navigate("/app/preset-donation?tab=configuration"),
                    children: "Configure Theme"
                  })]
                })
              })]
            })
          }), /* @__PURE__ */ jsx("s-box", {
            padding: "large",
            background: "base",
            borderWidth: "base",
            borderRadius: "large",
            borderColor: "base",
            children: /* @__PURE__ */ jsxs("s-stack", {
              gap: "base",
              children: [/* @__PURE__ */ jsx("div", {
                style: {
                  background: "#FCEBE3",
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                },
                children: /* @__PURE__ */ jsx("svg", {
                  viewBox: "0 0 20 20",
                  style: {
                    width: "22px",
                    fill: "#D82C0D"
                  },
                  children: /* @__PURE__ */ jsx("path", {
                    d: "M7 14.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm6-6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm1.28-4.78a.75.75 0 0 1 0 1.06l-10 10a.75.75 0 0 1-1.06-1.06l10-10a.75.75 0 0 1 1.06 0Z"
                  })
                })
              }), /* @__PURE__ */ jsxs("s-stack", {
                gap: "base",
                children: [/* @__PURE__ */ jsx("s-text", {
                  type: "strong",
                  children: "Revenue Sharing"
                }), /* @__PURE__ */ jsx("s-text", {
                  color: "subdued",
                  children: "Automatically donate a percentage of every order or product sale."
                })]
              }), /* @__PURE__ */ jsx("div", {
                style: {
                  marginTop: "12px"
                },
                children: /* @__PURE__ */ jsxs("s-stack", {
                  gap: "small",
                  children: [/* @__PURE__ */ jsx("s-button", {
                    "full-width": true,
                    variant: "primary",
                    onClick: () => navigate("/app/pos-donation"),
                    children: "Manage Setting"
                  }), /* @__PURE__ */ jsx("s-button", {
                    "full-width": true,
                    variant: "secondary",
                    onClick: () => navigate("/app/pos-donation?tab=configuration"),
                    children: "Configure Theme"
                  })]
                })
              })]
            })
          }), /* @__PURE__ */ jsx("s-box", {
            padding: "large",
            background: "base",
            borderWidth: "base",
            borderRadius: "large",
            borderColor: "base",
            children: /* @__PURE__ */ jsxs("s-stack", {
              gap: "base",
              children: [/* @__PURE__ */ jsx("div", {
                style: {
                  background: "#FFF4E5",
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                },
                children: /* @__PURE__ */ jsx("svg", {
                  viewBox: "0 0 20 20",
                  style: {
                    width: "22px",
                    fill: "#965A00"
                  },
                  children: /* @__PURE__ */ jsx("path", {
                    d: "M10 2c-3.5 0-6.5 1.5-6.5 3.5s3 3.5 6.5 3.5 6.5-1.5 6.5-3.5-3-3.5-6.5-3.5Zm0 12c-3.5 0-6.5-1.5-6.5-3.5v-2.26c1.61 1.07 3.93 1.76 6.5 1.76s4.89-.69 6.5-1.76v2.26c0 2-3 3.5-6.5 3.5Zm0 4c-3.5 0-6.5-1.5-6.5-3.5v-2.26c1.61 1.07 3.93 1.76 6.5 1.76s4.89-.69 6.5-1.76v2.26c0 2-3 3.5-6.5 3.5Z"
                  })
                })
              }), /* @__PURE__ */ jsxs("s-stack", {
                gap: "base",
                children: [/* @__PURE__ */ jsx("s-text", {
                  type: "strong",
                  children: "Change Roundups"
                }), /* @__PURE__ */ jsx("s-text", {
                  color: "subdued",
                  children: "Round up the order total at checkout and donate the difference."
                })]
              }), /* @__PURE__ */ jsx("div", {
                style: {
                  marginTop: "12px"
                },
                children: /* @__PURE__ */ jsxs("s-stack", {
                  gap: "small",
                  children: [/* @__PURE__ */ jsx("s-button", {
                    "full-width": true,
                    variant: "primary",
                    onClick: () => navigate("/app/roundup"),
                    children: "Manage Setting"
                  }), /* @__PURE__ */ jsx("s-button", {
                    "full-width": true,
                    variant: "secondary",
                    onClick: () => navigate("/app/roundup?tab=integration"),
                    children: "Configure Theme"
                  })]
                })
              })]
            })
          })]
        })]
      }), /* @__PURE__ */ jsx("s-box", {
        padding: "large",
        background: "base",
        borderWidth: "base",
        borderRadius: "large",
        borderColor: "base",
        children: /* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          },
          children: [/* @__PURE__ */ jsx("div", {
            style: {
              maxWidth: "600px"
            },
            children: /* @__PURE__ */ jsxs("s-stack", {
              gap: "base",
              children: [/* @__PURE__ */ jsx("div", {
                style: {
                  background: "#EBEBEB",
                  padding: "4px 12px",
                  borderRadius: "100px",
                  display: "inline-block",
                  fontSize: "11px",
                  fontWeight: 700
                },
                children: "EXPERT ASSISTANCE"
              }), /* @__PURE__ */ jsx("div", {
                style: {
                  fontSize: "18px",
                  fontWeight: 700
                },
                children: "Need custom integration or business strategy?"
              }), /* @__PURE__ */ jsx("s-text", {
                color: "subdued",
                children: "Our dedicated impact consultants are available to help you with store setup, technical integration, and donation strategy at no extra cost."
              }), /* @__PURE__ */ jsx("div", {
                style: {
                  marginTop: "12px"
                },
                children: /* @__PURE__ */ jsxs("s-stack", {
                  direction: "inline",
                  gap: "base",
                  children: [/* @__PURE__ */ jsx("s-button", {
                    variant: "primary",
                    onClick: () => setShowReviewModal(true),
                    children: "Write Review"
                  }), /* @__PURE__ */ jsx("s-button", {
                    variant: "secondary",
                    onClick: handleContactSupport,
                    children: "Contact Support"
                  })]
                })
              })]
            })
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              textAlign: "center",
              background: "#F9FAFB",
              padding: "24px",
              borderRadius: "16px",
              border: "1px solid #F1F2F3",
              marginLeft: "20px"
            },
            children: [/* @__PURE__ */ jsx("img", {
              src: "https://easydonation.zestardshop.com/assets/images/support.png",
              style: {
                height: "70px",
                marginBottom: "12px"
              },
              alt: "Support"
            }), /* @__PURE__ */ jsx("div", {
              style: {
                fontWeight: 700,
                fontSize: "14px",
                color: "#1A1C23"
              },
              children: "Rapid Support"
            })]
          })]
        })
      })]
    })]
  });
});
const headers$1 = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route37 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action,
  default: app__index,
  headers: headers$1,
  loader: loader$1
}, Symbol.toStringTag, { value: "Module" }));
const loader = async ({
  request
}) => {
  await authenticate.admin(request);
  return null;
};
const faqs = [{
  question: "How many donations can a merchant create?",
  answer: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pharetra hendrerit ut duis sem. Suspendisse potenti."
}, {
  question: "Is it required to register the organization at your end? How many Organization does it support?",
  answer: "Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Phasellus tincidunt elit purus, sed bibendum enim tristique eget."
}, {
  question: "Is it required to have organizations/firms/charity institutions from specific countries?",
  answer: "Curabitur eget lectus at lorem accumsan faucibus. In elementum lacus eget tortor pretium imperdiet. Praesent fermentum accumsan aliquet."
}, {
  question: "Can we update the labels and descriptions of the donation option?",
  answer: "Nullam sollicitudin interdum dolor, at bibendum justo sollicitudin tristique. Maecenas sed lectus in dui vehicula placerat ut feugiat neque."
}, {
  question: "Can we have the Pre-determined donation amount as options given to the customer?",
  answer: "Aenean ullamcorper efficitur leo nec faucibus. Vestibulum suscipit velit tellus, feugiat tincidunt erat auctor ut."
}, {
  question: "Do we have the ability to set a minimum donation amount?",
  answer: "Nunc at dolor ac nisi dictum commodo sed id risus. Morbi gravida nunc varius ex semper sagittis."
}, {
  question: "Do we have the ability to add/modify the design of the Donation Option?",
  answer: "Maecenas interdum felis eget diam gravida imperdiet ac quis risus. Nulla convallis sem sapien, et mollis felis viverra a."
}];
const app_help = UNSAFE_withComponentProps(function HelpPage() {
  const [openIndex, setOpenIndex] = useState(0);
  return /* @__PURE__ */ jsx("s-page", {
    heading: "Help & Support",
    children: /* @__PURE__ */ jsx("section", {
      style: {
        maxWidth: "800px",
        margin: "0 auto",
        paddingBottom: "40px"
      },
      children: /* @__PURE__ */ jsx("s-stack", {
        direction: "block",
        gap: "large-300",
        children: /* @__PURE__ */ jsx("s-stack", {
          direction: "block",
          gap: "base",
          children: /* @__PURE__ */ jsxs("section", {
            style: {
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              padding: "20px"
            },
            children: [/* @__PURE__ */ jsx("div", {
              style: {
                marginBottom: "12px"
              },
              children: /* @__PURE__ */ jsx("span", {
                style: {
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#202223"
                },
                children: "Get In Touch With Us"
              })
            }), /* @__PURE__ */ jsxs("s-box", {
              paddingBlockStart: "base",
              children: [/* @__PURE__ */ jsx("s-text", {
                children: "Below is the list of our Frequently Asked Questions that will help customers to understand the application features and its configuration. If your question is not listed here OR to customise anything within the app, please contact us:"
              }), /* @__PURE__ */ jsxs("ul", {
                style: {
                  margin: "12px 0 0",
                  paddingLeft: "20px",
                  color: "#202223",
                  fontSize: "14px",
                  lineHeight: "1.8"
                },
                children: [/* @__PURE__ */ jsxs("li", {
                  children: [/* @__PURE__ */ jsx("strong", {
                    children: "Developed By:"
                  }), " abc Pvt Ltd"]
                }), /* @__PURE__ */ jsxs("li", {
                  children: [/* @__PURE__ */ jsx("strong", {
                    children: "Email:"
                  }), " ", /* @__PURE__ */ jsx("a", {
                    href: "mailto:abc@gmail.com",
                    style: {
                      color: "#005bd3",
                      textDecoration: "none"
                    },
                    children: "abc@gmail.com"
                  })]
                }), /* @__PURE__ */ jsxs("li", {
                  children: [/* @__PURE__ */ jsx("strong", {
                    children: "Website:"
                  }), " ", /* @__PURE__ */ jsx("a", {
                    href: "https://abc.com",
                    style: {
                      color: "#005bd3",
                      textDecoration: "none"
                    },
                    children: "https://abc.com"
                  })]
                })]
              })]
            }), /* @__PURE__ */ jsx("div", {
              style: {
                marginTop: "50px",
                marginBottom: "30px"
              },
              children: /* @__PURE__ */ jsx("span", {
                style: {
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#202223"
                },
                children: "Frequently Asked Questions"
              })
            }), /* @__PURE__ */ jsx("s-stack", {
              direction: "block",
              gap: "base",
              children: faqs.map((faq, index2) => /* @__PURE__ */ jsx("s-box", {
                padding: "none",
                borderRadius: "large-100",
                borderWidth: "base",
                children: /* @__PURE__ */ jsxs("section", {
                  style: {
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    overflow: "hidden",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
                  },
                  children: [/* @__PURE__ */ jsxs("button", {
                    onClick: () => setOpenIndex(openIndex === index2 ? null : index2),
                    style: {
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "16px 20px",
                      background: "rgba(255, 255, 255, 1)",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      color: "#202223"
                    },
                    children: [/* @__PURE__ */ jsx("span", {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        fontSize: "15px",
                        fontWeight: "600"
                      },
                      children: faq.question
                    }), /* @__PURE__ */ jsx("span", {
                      style: {
                        transform: openIndex === index2 ? "rotate(180deg)" : "none",
                        transition: "transform 0.3s ease"
                      },
                      children: /* @__PURE__ */ jsx("svg", {
                        viewBox: "0 0 20 20",
                        style: {
                          width: "20px",
                          height: "20px",
                          fill: "#5c5f62"
                        },
                        children: /* @__PURE__ */ jsx("path", {
                          fillRule: "evenodd",
                          d: "M13.098 8H6.902c-.751 0-1.172.854-.708 1.446l3.098 3.949c.353.45 1.063.45 1.416 0l3.098-3.949c.464-.592.043-1.446-.708-1.446Z"
                        })
                      })
                    })]
                  }), /* @__PURE__ */ jsx("div", {
                    style: {
                      display: "grid",
                      gridTemplateRows: openIndex === index2 ? "1fr" : "0fr",
                      transition: "grid-template-rows 0.35s ease"
                    },
                    children: /* @__PURE__ */ jsx("div", {
                      style: {
                        overflow: "hidden"
                      },
                      children: /* @__PURE__ */ jsx("s-box", {
                        padding: "large-100",
                        paddingBlockStart: "none",
                        children: /* @__PURE__ */ jsx("s-box", {
                          paddingInlineStart: "large-200",
                          children: index2 === 0 ? /* @__PURE__ */ jsxs("s-stack", {
                            direction: "block",
                            gap: "base",
                            children: [/* @__PURE__ */ jsxs("s-stack", {
                              direction: "block",
                              gap: "base",
                              children: [/* @__PURE__ */ jsx("s-text", {
                                children: "In total our application have two below mentioned versions :"
                              }), /* @__PURE__ */ jsxs("ul", {
                                style: {
                                  paddingLeft: "16px",
                                  margin: 0,
                                  lineHeight: 1.5,
                                  fontSize: "14px",
                                  color: "#6d7175"
                                },
                                children: [/* @__PURE__ */ jsx("li", {
                                  children: /* @__PURE__ */ jsx("s-text", {
                                    children: "Basic Version: Merchant will be allowed to make Single Donation and similarly can associate with single organization."
                                  })
                                }), /* @__PURE__ */ jsx("li", {
                                  style: {
                                    marginTop: "4px"
                                  },
                                  children: /* @__PURE__ */ jsx("s-text", {
                                    children: "Advance Version: Merchant will be allowed to make Multiple Donations(Recommended not to exceed more then 8 for better performance) and with multiple organizations."
                                  })
                                })]
                              })]
                            }), /* @__PURE__ */ jsxs("s-banner", {
                              tone: "warning",
                              children: [/* @__PURE__ */ jsx("span", {
                                slot: "title",
                                style: {
                                  fontWeight: 600
                                },
                                children: "Important Note"
                              }), /* @__PURE__ */ jsx("p", {
                                style: {
                                  margin: 0,
                                  fontSize: "13px"
                                },
                                children: `Please make sure not to delete the donation products which gets generated on the installation of the application otherwise it will result in showing the errors. Donation products are always available for the add/update facility which you can do from the app's admin section and also from the "Products" section of the shopify.`
                              })]
                            })]
                          }) : /* @__PURE__ */ jsx("span", {
                            style: {
                              fontSize: "14px",
                              color: "#6d7175",
                              lineHeight: 1.6,
                              display: "block",
                              paddingBottom: "16px"
                            },
                            children: faq.answer
                          })
                        })
                      })
                    })
                  })]
                })
              }, index2))
            })]
          })
        })
      })
    })
  });
});
const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route38 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: app_help,
  headers,
  loader
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-DiL8JACE.js", "imports": ["/assets/jsx-runtime-lA1hjGOj.js", "/assets/chunk-UVKPFVEO-CEw7IaX3.js", "/assets/index-C8UdS5-V.js"], "css": ["/assets/entry-x1cbIzLV.css"] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/root-CgTQuY8J.js", "imports": ["/assets/jsx-runtime-lA1hjGOj.js", "/assets/chunk-UVKPFVEO-CEw7IaX3.js", "/assets/index-C8UdS5-V.js"], "css": ["/assets/entry-x1cbIzLV.css"], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/webhooks.subscription_contracts.create": { "id": "routes/webhooks.subscription_contracts.create", "parentId": "root", "path": "webhooks/subscription_contracts/create", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/webhooks.subscription_contracts.create-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/webhooks.subscription_contracts.update": { "id": "routes/webhooks.subscription_contracts.update", "parentId": "root", "path": "webhooks/subscription_contracts/update", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/webhooks.subscription_contracts.update-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/webhooks.app_subscriptions.update": { "id": "routes/webhooks.app_subscriptions.update", "parentId": "root", "path": "webhooks/app_subscriptions/update", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app_subscriptions.update-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/api.customer.subscription-action": { "id": "routes/api.customer.subscription-action", "parentId": "root", "path": "api/customer/subscription-action", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/api.customer.subscription-action-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/api.customer.subscription-status": { "id": "routes/api.customer.subscription-status", "parentId": "root", "path": "api/customer/subscription-status", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/api.customer.subscription-status-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/apps.pos-donation.settings": { "id": "routes/apps.pos-donation.settings", "parentId": "root", "path": "apps/pos-donation/settings", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/apps.pos-donation.settings-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/webhooks.app.scopes_update": { "id": "routes/webhooks.app.scopes_update", "parentId": "root", "path": "webhooks/app/scopes_update", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app.scopes_update-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/api.resend-donation-email": { "id": "routes/api.resend-donation-email", "parentId": "root", "path": "api/resend-donation-email", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/api.resend-donation-email-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/webhooks.orders.cancelled": { "id": "routes/webhooks.orders.cancelled", "parentId": "root", "path": "webhooks/orders/cancelled", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/webhooks.orders.cancelled-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/api.custom-donation-cart": { "id": "routes/api.custom-donation-cart", "parentId": "root", "path": "api/custom-donation-cart", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/api.custom-donation-cart-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/webhooks.app.uninstalled": { "id": "routes/webhooks.app.uninstalled", "parentId": "root", "path": "webhooks/app/uninstalled", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app.uninstalled-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/webhooks.refunds.create": { "id": "routes/webhooks.refunds.create", "parentId": "root", "path": "webhooks/refunds/create", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/webhooks.refunds.create-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/webhooks.orders.create": { "id": "routes/webhooks.orders.create", "parentId": "root", "path": "webhooks/orders/create", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/webhooks.orders.create-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/api.block-config": { "id": "routes/api.block-config", "parentId": "root", "path": "api/block-config", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/api.block-config-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/api.pos-donation": { "id": "routes/api.pos-donation", "parentId": "root", "path": "api/pos-donation", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/api.pos-donation-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/api.pos-donation.settings": { "id": "routes/api.pos-donation.settings", "parentId": "routes/api.pos-donation", "path": "settings", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/api.pos-donation.settings-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/api.campaigns": { "id": "routes/api.campaigns", "parentId": "root", "path": "api/campaigns", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/api.campaigns-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/subscriptions": { "id": "routes/subscriptions", "parentId": "root", "path": "subscriptions", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/subscriptions-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/subscriptions.$id": { "id": "routes/subscriptions.$id", "parentId": "routes/subscriptions", "path": ":id", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/subscriptions._id-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/auth.login": { "id": "routes/auth.login", "parentId": "root", "path": "auth/login", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/route-DLYHH8Lt.js", "imports": ["/assets/chunk-UVKPFVEO-CEw7IaX3.js", "/assets/jsx-runtime-lA1hjGOj.js", "/assets/AppProxyProvider-CSPIe7t3.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/route-5FmIFhbT.js", "imports": ["/assets/chunk-UVKPFVEO-CEw7IaX3.js", "/assets/jsx-runtime-lA1hjGOj.js"], "css": ["/assets/route-Xpdx9QZl.css"], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/auth.$": { "id": "routes/auth.$", "parentId": "root", "path": "auth/*", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/auth._-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app": { "id": "routes/app", "parentId": "root", "path": "app", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": true, "module": "/assets/app-40h9grwG.js", "imports": ["/assets/chunk-UVKPFVEO-CEw7IaX3.js", "/assets/jsx-runtime-lA1hjGOj.js", "/assets/AppProxyProvider-CSPIe7t3.js", "/assets/context-DkLB1Z2_.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.preset-donation_.delete.$id": { "id": "routes/app.preset-donation_.delete.$id", "parentId": "routes/app", "path": "preset-donation/delete/:id", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/app.preset-donation_.delete._id-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.preset-donation_.edit.$id": { "id": "routes/app.preset-donation_.edit.$id", "parentId": "routes/app", "path": "preset-donation/edit/:id", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.preset-donation_.edit._id-BZJYlB4f.js", "imports": ["/assets/chunk-UVKPFVEO-CEw7IaX3.js", "/assets/jsx-runtime-lA1hjGOj.js", "/assets/AddCampaign-CXw5tEH9.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.recurring-subscriptions": { "id": "routes/app.recurring-subscriptions", "parentId": "routes/app", "path": "recurring-subscriptions", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.recurring-subscriptions-BIFqbCRq.js", "imports": ["/assets/chunk-UVKPFVEO-CEw7IaX3.js", "/assets/jsx-runtime-lA1hjGOj.js", "/assets/context-DkLB1Z2_.js", "/assets/BlockStack-BQsk5ghl.js", "/assets/index-C8UdS5-V.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.preset-donation_.add": { "id": "routes/app.preset-donation_.add", "parentId": "routes/app", "path": "preset-donation/add", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.preset-donation_.add-ByoowPhf.js", "imports": ["/assets/chunk-UVKPFVEO-CEw7IaX3.js", "/assets/jsx-runtime-lA1hjGOj.js", "/assets/AddCampaign-CXw5tEH9.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.donation-activity": { "id": "routes/app.donation-activity", "parentId": "routes/app", "path": "donation-activity", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.donation-activity-CNv24GVh.js", "imports": ["/assets/chunk-UVKPFVEO-CEw7IaX3.js", "/assets/jsx-runtime-lA1hjGOj.js", "/assets/features-DWWjLmSf.js", "/assets/useAppBridge-Bj34gXAL.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.perset-donation": { "id": "routes/app.perset-donation", "parentId": "routes/app", "path": "perset-donation", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.perset-donation-DMCJVfed.js", "imports": ["/assets/chunk-UVKPFVEO-CEw7IaX3.js", "/assets/jsx-runtime-lA1hjGOj.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.preset-donation": { "id": "routes/app.preset-donation", "parentId": "routes/app", "path": "preset-donation", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.preset-donation-BbFFV4cd.js", "imports": ["/assets/chunk-UVKPFVEO-CEw7IaX3.js", "/assets/jsx-runtime-lA1hjGOj.js", "/assets/ConfigurationTab-uPFD0stB.js", "/assets/useAppBridge-Bj34gXAL.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.email-settings": { "id": "routes/app.email-settings", "parentId": "routes/app", "path": "email-settings", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.email-settings-zgJX_ur2.js", "imports": ["/assets/chunk-UVKPFVEO-CEw7IaX3.js", "/assets/jsx-runtime-lA1hjGOj.js", "/assets/features-DWWjLmSf.js", "/assets/RichTextEditor-euPN7XAi.js", "/assets/useAppBridge-Bj34gXAL.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.track-donation": { "id": "routes/app.track-donation", "parentId": "routes/app", "path": "track-donation", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.track-donation-BrBBP9JH.js", "imports": ["/assets/chunk-UVKPFVEO-CEw7IaX3.js", "/assets/jsx-runtime-lA1hjGOj.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.pos-donation": { "id": "routes/app.pos-donation", "parentId": "routes/app", "path": "pos-donation", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.pos-donation-CjMuGGLG.js", "imports": ["/assets/chunk-UVKPFVEO-CEw7IaX3.js", "/assets/jsx-runtime-lA1hjGOj.js", "/assets/RichTextEditor-euPN7XAi.js", "/assets/features-DWWjLmSf.js", "/assets/ConfigurationTab-uPFD0stB.js", "/assets/useAppBridge-Bj34gXAL.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.billing": { "id": "routes/app.billing", "parentId": "routes/app", "path": "billing", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.billing-B_2PUpXr.js", "imports": ["/assets/chunk-UVKPFVEO-CEw7IaX3.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.pricing": { "id": "routes/app.pricing", "parentId": "routes/app", "path": "pricing", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.pricing-DkDMY39t.js", "imports": ["/assets/chunk-UVKPFVEO-CEw7IaX3.js", "/assets/jsx-runtime-lA1hjGOj.js", "/assets/features-DWWjLmSf.js", "/assets/useAppBridge-Bj34gXAL.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.roundup": { "id": "routes/app.roundup", "parentId": "routes/app", "path": "roundup", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.roundup-DUovZp0h.js", "imports": ["/assets/chunk-UVKPFVEO-CEw7IaX3.js", "/assets/jsx-runtime-lA1hjGOj.js", "/assets/ConfigurationTab-uPFD0stB.js", "/assets/BlockStack-BQsk5ghl.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app._index": { "id": "routes/app._index", "parentId": "routes/app", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app._index-Bqsee-mK.js", "imports": ["/assets/chunk-UVKPFVEO-CEw7IaX3.js", "/assets/jsx-runtime-lA1hjGOj.js", "/assets/useAppBridge-Bj34gXAL.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.help": { "id": "routes/app.help", "parentId": "routes/app", "path": "help", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.help-B6qucMPo.js", "imports": ["/assets/chunk-UVKPFVEO-CEw7IaX3.js", "/assets/jsx-runtime-lA1hjGOj.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 } }, "url": "/assets/manifest-4143d229.js", "version": "4143d229", "sri": void 0 };
const assetsBuildDirectory = "build/client";
const basename = "/";
const future = { "unstable_optimizeDeps": false, "unstable_passThroughRequests": false, "unstable_subResourceIntegrity": false, "unstable_trailingSlashAwareDataRequests": false, "unstable_previewServerPrerendering": false, "v8_middleware": false, "v8_splitRouteModules": false, "v8_viteEnvironmentApi": false };
const ssr = true;
const isSpaMode = false;
const prerender = [];
const routeDiscovery = { "mode": "lazy", "manifestPath": "/__manifest" };
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/webhooks.subscription_contracts.create": {
    id: "routes/webhooks.subscription_contracts.create",
    parentId: "root",
    path: "webhooks/subscription_contracts/create",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/webhooks.subscription_contracts.update": {
    id: "routes/webhooks.subscription_contracts.update",
    parentId: "root",
    path: "webhooks/subscription_contracts/update",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/webhooks.app_subscriptions.update": {
    id: "routes/webhooks.app_subscriptions.update",
    parentId: "root",
    path: "webhooks/app_subscriptions/update",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/api.customer.subscription-action": {
    id: "routes/api.customer.subscription-action",
    parentId: "root",
    path: "api/customer/subscription-action",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/api.customer.subscription-status": {
    id: "routes/api.customer.subscription-status",
    parentId: "root",
    path: "api/customer/subscription-status",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/apps.pos-donation.settings": {
    id: "routes/apps.pos-donation.settings",
    parentId: "root",
    path: "apps/pos-donation/settings",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/webhooks.app.scopes_update": {
    id: "routes/webhooks.app.scopes_update",
    parentId: "root",
    path: "webhooks/app/scopes_update",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/api.resend-donation-email": {
    id: "routes/api.resend-donation-email",
    parentId: "root",
    path: "api/resend-donation-email",
    index: void 0,
    caseSensitive: void 0,
    module: route8
  },
  "routes/webhooks.orders.cancelled": {
    id: "routes/webhooks.orders.cancelled",
    parentId: "root",
    path: "webhooks/orders/cancelled",
    index: void 0,
    caseSensitive: void 0,
    module: route9
  },
  "routes/api.custom-donation-cart": {
    id: "routes/api.custom-donation-cart",
    parentId: "root",
    path: "api/custom-donation-cart",
    index: void 0,
    caseSensitive: void 0,
    module: route10
  },
  "routes/webhooks.app.uninstalled": {
    id: "routes/webhooks.app.uninstalled",
    parentId: "root",
    path: "webhooks/app/uninstalled",
    index: void 0,
    caseSensitive: void 0,
    module: route11
  },
  "routes/webhooks.refunds.create": {
    id: "routes/webhooks.refunds.create",
    parentId: "root",
    path: "webhooks/refunds/create",
    index: void 0,
    caseSensitive: void 0,
    module: route12
  },
  "routes/webhooks.orders.create": {
    id: "routes/webhooks.orders.create",
    parentId: "root",
    path: "webhooks/orders/create",
    index: void 0,
    caseSensitive: void 0,
    module: route13
  },
  "routes/api.block-config": {
    id: "routes/api.block-config",
    parentId: "root",
    path: "api/block-config",
    index: void 0,
    caseSensitive: void 0,
    module: route14
  },
  "routes/api.pos-donation": {
    id: "routes/api.pos-donation",
    parentId: "root",
    path: "api/pos-donation",
    index: void 0,
    caseSensitive: void 0,
    module: route15
  },
  "routes/api.pos-donation.settings": {
    id: "routes/api.pos-donation.settings",
    parentId: "routes/api.pos-donation",
    path: "settings",
    index: void 0,
    caseSensitive: void 0,
    module: route16
  },
  "routes/api.campaigns": {
    id: "routes/api.campaigns",
    parentId: "root",
    path: "api/campaigns",
    index: void 0,
    caseSensitive: void 0,
    module: route17
  },
  "routes/subscriptions": {
    id: "routes/subscriptions",
    parentId: "root",
    path: "subscriptions",
    index: void 0,
    caseSensitive: void 0,
    module: route18
  },
  "routes/subscriptions.$id": {
    id: "routes/subscriptions.$id",
    parentId: "routes/subscriptions",
    path: ":id",
    index: void 0,
    caseSensitive: void 0,
    module: route19
  },
  "routes/auth.login": {
    id: "routes/auth.login",
    parentId: "root",
    path: "auth/login",
    index: void 0,
    caseSensitive: void 0,
    module: route20
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route21
  },
  "routes/auth.$": {
    id: "routes/auth.$",
    parentId: "root",
    path: "auth/*",
    index: void 0,
    caseSensitive: void 0,
    module: route22
  },
  "routes/app": {
    id: "routes/app",
    parentId: "root",
    path: "app",
    index: void 0,
    caseSensitive: void 0,
    module: route23
  },
  "routes/app.preset-donation_.delete.$id": {
    id: "routes/app.preset-donation_.delete.$id",
    parentId: "routes/app",
    path: "preset-donation/delete/:id",
    index: void 0,
    caseSensitive: void 0,
    module: route24
  },
  "routes/app.preset-donation_.edit.$id": {
    id: "routes/app.preset-donation_.edit.$id",
    parentId: "routes/app",
    path: "preset-donation/edit/:id",
    index: void 0,
    caseSensitive: void 0,
    module: route25
  },
  "routes/app.recurring-subscriptions": {
    id: "routes/app.recurring-subscriptions",
    parentId: "routes/app",
    path: "recurring-subscriptions",
    index: void 0,
    caseSensitive: void 0,
    module: route26
  },
  "routes/app.preset-donation_.add": {
    id: "routes/app.preset-donation_.add",
    parentId: "routes/app",
    path: "preset-donation/add",
    index: void 0,
    caseSensitive: void 0,
    module: route27
  },
  "routes/app.donation-activity": {
    id: "routes/app.donation-activity",
    parentId: "routes/app",
    path: "donation-activity",
    index: void 0,
    caseSensitive: void 0,
    module: route28
  },
  "routes/app.perset-donation": {
    id: "routes/app.perset-donation",
    parentId: "routes/app",
    path: "perset-donation",
    index: void 0,
    caseSensitive: void 0,
    module: route29
  },
  "routes/app.preset-donation": {
    id: "routes/app.preset-donation",
    parentId: "routes/app",
    path: "preset-donation",
    index: void 0,
    caseSensitive: void 0,
    module: route30
  },
  "routes/app.email-settings": {
    id: "routes/app.email-settings",
    parentId: "routes/app",
    path: "email-settings",
    index: void 0,
    caseSensitive: void 0,
    module: route31
  },
  "routes/app.track-donation": {
    id: "routes/app.track-donation",
    parentId: "routes/app",
    path: "track-donation",
    index: void 0,
    caseSensitive: void 0,
    module: route32
  },
  "routes/app.pos-donation": {
    id: "routes/app.pos-donation",
    parentId: "routes/app",
    path: "pos-donation",
    index: void 0,
    caseSensitive: void 0,
    module: route33
  },
  "routes/app.billing": {
    id: "routes/app.billing",
    parentId: "routes/app",
    path: "billing",
    index: void 0,
    caseSensitive: void 0,
    module: route34
  },
  "routes/app.pricing": {
    id: "routes/app.pricing",
    parentId: "routes/app",
    path: "pricing",
    index: void 0,
    caseSensitive: void 0,
    module: route35
  },
  "routes/app.roundup": {
    id: "routes/app.roundup",
    parentId: "routes/app",
    path: "roundup",
    index: void 0,
    caseSensitive: void 0,
    module: route36
  },
  "routes/app._index": {
    id: "routes/app._index",
    parentId: "routes/app",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route37
  },
  "routes/app.help": {
    id: "routes/app.help",
    parentId: "routes/app",
    path: "help",
    index: void 0,
    caseSensitive: void 0,
    module: route38
  }
};
const allowedActionOrigins = false;
export {
  allowedActionOrigins,
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  prerender,
  publicPath,
  routeDiscovery,
  routes,
  ssr
};
