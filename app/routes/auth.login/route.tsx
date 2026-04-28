import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, HeadersFunction } from "react-router";
import { Form, useActionData, useLoaderData, redirect } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { login, authenticate } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (url.protocol === "http:" && !url.hostname.includes("localhost")) {
    url.protocol = "https:";
  }
  const secureRequest = new Request(url.toString(), request);

  console.log("Auth Login Loader Request URL (patched):", secureRequest.url);

  try {
    const { session } = await authenticate.admin(secureRequest);
    if (session) {
      console.log("Auth Login: Already authenticated for", session.shop, "Redirecting to /app");
      return redirect(`/app?shop=${session.shop}`);
    }
  } catch (error) {
    // If auth fails, that's expected for a login page, just continue
  }

  const result = await login(secureRequest);
  console.log("Login helper result (loader):", JSON.stringify(result));
  const errors = loginErrorMessage(result);

  return { errors };
};

export const action = async ({ request }: ActionFunctionArgs) => {
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
    errors,
  };
};

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

export default function Auth() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  const { errors } = actionData || (loaderData as any) || { errors: {} };

  return (
    <AppProvider embedded={false}>
      <s-page>
        {typeof window !== "undefined" && window.top !== window.self ? (
          <div style={{ padding: "40px", maxWidth: "600px", margin: "40px auto", textAlign: "center", background: "#ffffff", border: "1px solid #EBEBEB", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: "20px", fontWeight: "700", marginBottom: "12px", color: "#202223" }}>Authentication Required</div>
            <p style={{ fontSize: "14px", color: "#6D7175", marginBottom: "24px", lineHeight: "1.5" }}>
              To keep your data secure, Shopify requires you to complete the login process in a separate window.
            </p>
            <form action={window.location.href} target="_top" method="GET">
              {/* Keep existing query params like shop */}
              {Array.from(new URLSearchParams(window.location.search).entries()).map(([key, value]) => (
                <input key={key} type="hidden" name={key} value={value} />
              ))}
              <s-button type="submit">Continue to Login</s-button>
            </form>
          </div>
        ) : (
          <Form method="post">
            <s-section heading="Log in">
              <s-text-field
                name="shop"
                label="Shop domain"
                details="example.myshopify.com"
                value={shop}
                onChange={(e) => setShop(e.currentTarget.value)}
                autocomplete="on"
                error={errors.shop}
              ></s-text-field>
              <s-button type="submit">Log in</s-button>
            </s-section>
          </Form>
        )}
      </s-page>
    </AppProvider>
  );
}
