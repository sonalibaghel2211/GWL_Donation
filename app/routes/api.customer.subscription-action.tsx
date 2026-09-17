import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { sendDonationReceipt } from "../utils/sendgrid.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.public.appProxy(request);
  const shop = session?.shop || "";

  if (!admin) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const url = new URL(request.url);
    const loggedInCustomerId = url.searchParams.get("logged_in_customer_id");

    if (!loggedInCustomerId) {
      return new Response(JSON.stringify({ success: false, error: "Missing customer authentication" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // ── Check merchant plan is active ──
    const planSub = await db.planSubscription.findUnique({ where: { shop } });
    if (!planSub || planSub.status !== "active") {
      return new Response(JSON.stringify({ success: false, error: "Service unavailable" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // ── Verify customer ID is real ──
    const customerCheckRes = await admin.graphql(
      `#graphql
      query verifyCustomerExists($id: ID!) {
        customer(id: $id) { id }
      }`,
      { variables: { id: `gid://shopify/Customer/${loggedInCustomerId}` } }
    );
    const customerCheckJson: any = await customerCheckRes.json();
    if (!customerCheckJson?.data?.customer?.id) {
      return new Response(JSON.stringify({ success: false, error: "Invalid customer identity" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const payload = await request.json();
    const { action: actionType, contractId, newFrequency } = payload;

    // Verify contract ownership
    const verifyRes = await admin.graphql(
      `#graphql
      query getContractOwner($id: ID!) {
        subscriptionContract(id: $id) {
          customer { id }
        }
      }`,
      { variables: { id: contractId } }
    );
    const verifyData: any = await verifyRes.json();
    const contractOwnerId = verifyData.data?.subscriptionContract?.customer?.id;

    if (!contractOwnerId || contractOwnerId !== `gid://shopify/Customer/${loggedInCustomerId}`) {
      return new Response(JSON.stringify({ success: false, error: "Forbidden: You do not own this subscription" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

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

    if (actionType === "UPDATE_PAYMENT") {
      const getPaymentMethodRes = await admin.graphql(
        `#graphql
        query getPaymentMethod($id: ID!) {
          subscriptionContract(id: $id) {
            customerPaymentMethod {
              id
            }
          }
        }`,
        { variables: { id: contractId } }
      );
      const paymentMethodData: any = await getPaymentMethodRes.json();
      const customerPaymentMethodId = paymentMethodData.data?.subscriptionContract?.customerPaymentMethod?.id;

      if (!customerPaymentMethodId) {
        throw new Error("No customer payment method found for this subscription.");
      }

      const sendEmailRes = await admin.graphql(
        `#graphql
        mutation customerPaymentMethodSendUpdateEmail($customerPaymentMethodId: ID!) {
          customerPaymentMethodSendUpdateEmail(customerPaymentMethodId: $customerPaymentMethodId) {
            userErrors {
              field
              message
            }
          }
        }`,
        { variables: { customerPaymentMethodId } }
      );
      const sendEmailData: any = await sendEmailRes.json();
      const errors = sendEmailData.data?.customerPaymentMethodSendUpdateEmail?.userErrors || [];
      if (errors.length > 0) {
        throw new Error(errors[0].message);
      }

      return new Response(JSON.stringify({ success: true, message: "Update payment link has been sent to your email." }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (actionType === "CANCEL") {
      mutation = `#graphql
        mutation subscriptionContractCancel($id: ID!) { subscriptionContractCancel(subscriptionContractId: $id) { ${commonFields} } }`;
      mutationName = "subscriptionContractCancel";
    } else if (actionType === "PAUSE") {
      mutation = `#graphql
        mutation subscriptionContractPause($id: ID!) { subscriptionContractPause(subscriptionContractId: $id) { ${commonFields} } }`;
      mutationName = "subscriptionContractPause";
    } else if (actionType === "RESUME") {
      mutation = `#graphql
        mutation subscriptionContractActivate($id: ID!) { subscriptionContractActivate(subscriptionContractId: $id) { ${commonFields} } }`;
      mutationName = "subscriptionContractActivate";
    } else if (actionType === "SWITCH") {
      // For SWITCH, we need to find the new selling plan ID and update the contract line
      const config = await db.recurringDonationConfig.findUnique({ where: { shop: shop } });
      if (!config) throw new Error("Shop configuration not found");

      const newPlanId = newFrequency === "monthly" ? config.monthlyPlanId : config.weeklyPlanId;
      if (!newPlanId) throw new Error(`Selling plan for ${newFrequency} not configured`);

      // First get the line ID
      const getLineRes = await admin.graphql(
        `#graphql
        query getLine($id: ID!) { subscriptionContract(id: $id) { lines(first: 1) { edges { node { id } } } } }`,
        { variables: { id: contractId } }
      );
      const lineData: any = await getLineRes.json();
      const lineId = lineData.data?.subscriptionContract?.lines?.edges?.[0]?.node?.id;

      if (!lineId) throw new Error("Subscription line not found");

      mutation = `#graphql
        mutation subscriptionContractUpdate($contractId: ID!, $input: SubscriptionContractUpdateInput!) {
          subscriptionContractUpdate(subscriptionContractId: $contractId, input: $input) {
            ${commonFields}
          }
        }`;
      mutationName = "subscriptionContractUpdate";

      const switchResponse = await admin.graphql(mutation, {
        variables: {
          contractId,
          input: { lines: { update: { id: lineId, sellingPlanId: newPlanId } } }
        }
      });
      const switchJson = await switchResponse.json();
      const switchResult = switchJson.data?.[mutationName];
      if (switchResult?.userErrors?.length > 0) {
        return new Response(JSON.stringify({ success: false, error: switchResult.userErrors[0].message }), { status: 400 });
      }
      // Skip the generic mutation execution below — we already ran it
      const contract = switchResult?.contract;
      if (contract) {
        const newStatus = contract.status.toLowerCase();
        await db.recurringDonationLog.updateMany({ where: { subscriptionContractId: contractId }, data: { status: newStatus } });
        await db.subscription.updateMany({ where: { orderId: contract.originOrder?.name }, data: { status: newStatus } });
        if (contract.customer?.email) {
          const totalAmount = contract.lines.edges.reduce((sum: number, edge: any) => sum + parseFloat(edge.node.currentPrice.amount) * edge.node.quantity, 0).toFixed(2);
          const recLog = await db.recurringDonationLog.findFirst({ where: { OR: [{ subscriptionContractId: contractId }] } });
          const frequencyVal = recLog?.frequency === "weekly" ? "Weekly" : "Monthly";
          await sendDonationReceipt({
            email: contract.customer.email,
            name: `${contract.customer.firstName || ""} ${contract.customer.lastName || ""}`.trim(),
            amount: totalAmount,
            orderNumber: contract.originOrder?.name || "",
            type: "resume",
            shop: shop || "Your Store",
            frequency: frequencyVal,
            nextBillingDate: contract.nextBillingDate ? new Date(contract.nextBillingDate).toLocaleDateString() : "N/A",
            productTitle: contract.lines.edges[0]?.node?.title || "Donation",
            currency: contract.currencyCode || "USD",
          });
        }
      }
      return new Response(JSON.stringify({ success: true }));
    } else {
      return new Response(JSON.stringify({ success: false, error: "Invalid action" }), { status: 400 });
    }

    const response = await admin.graphql(mutation, { variables: { id: contractId } });
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

        const recLog = await db.recurringDonationLog.findFirst({
          where: {
            OR: [
              { subscriptionContractId: contractId },
              { orderId: orderId || undefined },
              { orderNumber: orderNumber || undefined }
            ]
          }
        });
        const frequencyVal = recLog?.frequency === "weekly" ? "Weekly" : "Monthly";

        await sendDonationReceipt({
          email: contract.customer.email,
          name: `${contract.customer.firstName || ""} ${contract.customer.lastName || ""}`.trim(),
          amount: totalAmount,
          orderNumber: contract.originOrder?.name || "",
          type: emailType,
          shop: shop || "Your Store",
          frequency: frequencyVal,
          nextBillingDate: contract.nextBillingDate ? new Date(contract.nextBillingDate).toLocaleDateString() : "N/A",
          productTitle: contract.lines.edges[0]?.node?.title || "Donation",
          currency: contract.currencyCode || "USD"
        });
      }
    }

    return new Response(JSON.stringify({ success: true }));

  } catch (err: any) {
    console.error("Subscription action error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};
