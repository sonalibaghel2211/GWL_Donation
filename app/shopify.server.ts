import "dotenv/config";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
  BillingInterval,
  DeliveryMethod,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

export const MONTHLY_PLAN_BASIC = "Galaxy Easy Donations - Basic Plan";
export const MONTHLY_PLAN_ADVANCED = "Galaxy Easy Donations - Advanced Plan";
export const MONTHLY_PLAN_PRO = "Galaxy Easy Donations - Pro Plan";

console.log("Initializing Shopify App with API Key:", process.env.SHOPIFY_API_KEY);
console.log("App URL:", process.env.SHOPIFY_APP_URL);

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: "2026-04" as any,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  hostScheme: "https",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma) as any,
  distribution: AppDistribution.AppStore,
  isEmbeddedApp: true,
  isOnlineTokens: false, // Use offline tokens for better stability in billing redirects
  webhooks: {
    ORDERS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders/create",
    },
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app/uninstalled",
    },
    REFUNDS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/refunds/create",
    },
    ORDERS_CANCELLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders/cancelled",
    },
    APP_SUBSCRIPTIONS_UPDATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app_subscriptions/update",
    },
  },
  billing: {
    [MONTHLY_PLAN_BASIC]: {
      lineItems: [
        {
          amount: 5,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days,
        },
      ],
    },
    [MONTHLY_PLAN_ADVANCED]: {
      lineItems: [
        {
          amount: 10,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days,
        },
      ],
    },
    [MONTHLY_PLAN_PRO]: {
      lineItems: [
        {
          amount: 15,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days,
        },
      ],
    },
  },
  future: {
    expiringOfflineAccessTokens: true,
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
    },
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = "2026-04";
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
