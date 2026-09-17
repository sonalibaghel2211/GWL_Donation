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

    const { session, admin } = await authenticate.admin(secureRequest);
    const shop = session.shop;
    const host = url.searchParams.get("host");

    const plan = url.searchParams.get("plan");
    const chargeId = url.searchParams.get("charge_id");

    if (plan) {
        let isApproved = false;
        let subscriptionGid = "";

        if (chargeId) {
            subscriptionGid = chargeId.startsWith("gid://shopify/AppSubscription/")
                ? chargeId
                : `gid://shopify/AppSubscription/${chargeId}`;

            try {
                const response = await admin.graphql(
                    `#graphql
                    query getAppSubscription($id: ID!) {
                        node(id: $id) {
                            ... on AppSubscription {
                                status
                            }
                        }
                    }`,
                    { variables: { id: subscriptionGid } }
                );
                const json: any = await response.json();
                const shopifyStatus = json.data?.node?.status;
                if (shopifyStatus === "ACTIVE") {
                    isApproved = true;
                }
            } catch (err) {
                console.error(`[BillingRedirect] Failed to check AppSubscription status for ${subscriptionGid}:`, err);
            }
        }

        if (isApproved) {
            await prisma.planSubscription.upsert({
                where: { shop },
                update: {
                    plan,
                    status: "active",
                    subscriptionId: subscriptionGid,
                    pendingPlan: null,
                },
                create: {
                    shop,
                    plan,
                    status: "active",
                    subscriptionId: subscriptionGid,
                    pendingPlan: null,
                },
            });
        } else {
            const existing = await prisma.planSubscription.findUnique({
                where: { shop },
            });
            if (existing && existing.status === "active") {
                await prisma.planSubscription.update({
                    where: { shop },
                    data: {
                        pendingPlan: null,
                    },
                });
            } else {
                await prisma.planSubscription.upsert({
                    where: { shop },
                    update: {
                        status: "none",
                        pendingPlan: null,
                        subscriptionId: null,
                    },
                    create: {
                        shop,
                        plan: "basic",
                        status: "none",
                        pendingPlan: null,
                        subscriptionId: null,
                    },
                });
            }
        }
    }

    return redirect(`/app/pricing?shop=${encodeURIComponent(shop)}${host ? `&host=${encodeURIComponent(host)}` : ""}`);
};

export default function BillingRedirect() {
    return null;
}
