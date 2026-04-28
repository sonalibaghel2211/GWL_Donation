import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { Link, Outlet, useLoaderData, useRouteError, redirect } from "react-router";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as PolarisProvider } from "@shopify/polaris";
import polarisTranslations from "@shopify/polaris/locales/en.json";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    // eslint-disable-next-line no-undef
    return { apiKey: process.env.SHOPIFY_API_KEY || "", shop: session?.shop || "" };
};

export default function App() {
    const { apiKey, shop } = useLoaderData<typeof loader>();

    return (
        <AppProvider embedded apiKey={apiKey}>
            <PolarisProvider i18n={polarisTranslations}>
                <ui-nav-menu>
                    <Link rel="home" to="/app">Home</Link>

                    <Link to="/app/preset-donation">Donation Preferences</Link>
                    <Link to="/app/roundup">Round Up Donation</Link>
                    <Link to="/app/pos-donation">Portion of Sale</Link>
                    <Link to="/app/email-settings">Email Settings</Link>

                    <Link to="/app/donation-activity">Donation Activity</Link>
                    <Link to="/app/track-donation">Track Donation</Link>

                    <Link to="/app/recurring-subscriptions">Subscription Management</Link>
                    <Link to="/app/pricing">Pricing Plans</Link>

                    <Link to="/app/help">Help</Link>
                </ui-nav-menu>
                <Outlet />
            </PolarisProvider>
        </AppProvider>
    );
}

// Shopify needs React Router to add some headers to the response for it to be rendered in the iframe
export const headers: HeadersFunction = (headersArgs) => {
    return boundary.headers(headersArgs);
};

export function ErrorBoundary() {
    return boundary.error(useRouteError());
}
