import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const url = new URL(request.url);
    if (url.protocol === "http:" && !url.hostname.includes("localhost")) {
        url.protocol = "https:";
    }
    const secureRequest = new Request(url.toString(), request);

    const { session } = await authenticate.admin(secureRequest);
    const shop = session.shop;
    const host = url.searchParams.get("host");

    const plan = url.searchParams.get("plan");

    console.log(`Billing Callback: Shop=${shop}, Plan=${plan}, Host=${host}`);

    if (plan) {
        const subscription = await prisma.planSubscription.findUnique({
            where: { shop },
        });

        const finalPlan = plan || subscription?.pendingPlan || "basic";

        await prisma.planSubscription.upsert({
            where: { shop },
            update: {
                plan: finalPlan,
                status: "active",
                pendingPlan: null,
                // We will let the webhook or the next app load (self-healing) 
                // update the actual subscriptionId from the API.
            },
            create: {
                shop,
                plan: finalPlan,
                status: "active",
                pendingPlan: null,
            },
        });
    }

    const redirectUrl = new URL("/app/pricing", url.origin);
    redirectUrl.searchParams.set("shop", shop);
    if (host) redirectUrl.searchParams.set("host", host);

    return redirect(redirectUrl.toString());
};

export default function BillingRedirect() {
    return null;
}
