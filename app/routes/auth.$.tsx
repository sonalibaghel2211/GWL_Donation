
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (url.protocol === "http:" && !url.hostname.includes("localhost")) {
    url.protocol = "https:";
  }
  const secureRequest = new Request(url.toString(), request);
  await authenticate.admin(secureRequest);

  return null;
};

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
