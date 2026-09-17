import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { admin } = await authenticate.public.appProxy(request);
    const url = new URL(request.url);
    const customerId = url.searchParams.get("customer_id");

    if (!customerId || !admin) {
        return new Response(JSON.stringify({ hasSubscription: false }), {
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const response = await admin.graphql(
            `#graphql
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
      }`,
            { variables: { customerId } }
        );

        const json = await response.json();
        const contract = json?.data?.customer?.subscriptionContracts?.edges?.[0]?.node;

        if (contract) {
            const line = contract.lines.edges[0]?.node;
            const planName = line?.sellingPlan?.name || "Donation";
            const frequency = planName.toLowerCase().includes("monthly") ? "monthly" : "weekly";

            return new Response(
                JSON.stringify({
                    hasSubscription: true,
                    contractId: contract.id,
                    status: contract.status,
                    planName: planName,
                    frequency: frequency,
                }),
                { headers: { "Content-Type": "application/json" } }
            );
        }
    } catch (err) {
        console.error("Error fetching subscription status:", err);
    }

    return new Response(JSON.stringify({ hasSubscription: false }), {
        headers: { "Content-Type": "application/json" },
    });
};
