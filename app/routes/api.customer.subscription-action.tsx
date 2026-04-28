import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { sendDonationReceipt } from "../utils/sendgrid.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "";

  if (!admin) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const payload = await request.json();
    const { action: actionType, contractId, newFrequency } = payload;

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
      // For SWITCH, we need to find the new selling plan ID and update the contract line
      const config = await db.recurringDonationConfig.findUnique({ where: { shop: shop } });
      if (!config) throw new Error("Shop configuration not found");

      const newPlanId = newFrequency === "monthly" ? config.monthlyPlanId : config.weeklyPlanId;
      if (!newPlanId) throw new Error(`Selling plan for ${newFrequency} not configured`);

      // First get the line ID
      const getLineRes = await admin.graphql(`query { subscriptionContract(id: "${contractId}") { lines(first: 1) { edges { node { id } } } } }`);
      const lineData: any = await getLineRes.json();
      const lineId = lineData.data?.subscriptionContract?.lines?.edges?.[0]?.node?.id;

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
      return new Response(JSON.stringify({ success: false, error: "Invalid action" }), { status: 400 });
    }

    const response = await admin.graphql(mutation);
    const json = await response.json();
    const result = json.data?.[mutationName];

    if (result?.userErrors?.length > 0) {
      return new Response(JSON.stringify({ success: false, error: result.userErrors[0].message }), { status: 400 });
    }

    const contract = result?.contract;
    if (contract) {
      const newStatus = contract.status.toLowerCase();
      const orderId = contract.originOrder?.id;
      const orderNumber = contract.originOrder?.name;

      // 1. Update RecurringDonationLog
      await db.recurringDonationLog.updateMany({
        where: { subscriptionContractId: contractId },
        data: { status: newStatus }
      });

      // Also try fallback by orderId or orderNumber for RecurringDonationLog
      if (orderId || orderNumber) {
        await db.recurringDonationLog.updateMany({
          where: {
            OR: [
              { orderId: orderId || undefined },
              { orderNumber: orderNumber || undefined }
            ]
          },
          data: { status: newStatus }
        });
      }

      // 2. Update PosDonationLog
      if (orderId || orderNumber) {
        await db.posDonationLog.updateMany({
          where: {
            OR: [
              { orderId: orderId || undefined },
              { orderNumber: orderNumber || undefined }
            ]
          },
          data: { status: newStatus }
        });
      }

      // 3. Update subscription model
      await db.subscription.updateMany({
        where: { orderId: orderNumber },
        data: { status: newStatus }
      });

      // Send Email
      if (contract.customer?.email) {
        const totalAmount = contract.lines.edges.reduce((sum: number, edge: any) =>
          sum + parseFloat(edge.node.currentPrice.amount) * edge.node.quantity, 0
        ).toFixed(2);

        let emailType: any = "receipt";
        if (actionType === "CANCEL") emailType = "cancellation";
        else if (actionType === "PAUSE") emailType = "pause";
        else if (actionType === "RESUME") emailType = "resume";
        else if (actionType === "SWITCH") emailType = "resume"; // "Resumed" or "Updated" works

        await sendDonationReceipt({
          email: contract.customer.email,
          name: `${contract.customer.firstName || ""} ${contract.customer.lastName || ""}`.trim(),
          amount: totalAmount,
          orderNumber: contract.originOrder?.name || "",
          type: emailType,
          shop: shop || "Your Store",
          nextBillingDate: contract.nextBillingDate ? new Date(contract.nextBillingDate).toLocaleDateString() : "N/A",
          productTitle: contract.lines.edges[0]?.node?.title || "Donation"
        });
      }
    }

    return new Response(JSON.stringify({ success: true }));

  } catch (err: any) {
    console.error("Subscription action error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};
