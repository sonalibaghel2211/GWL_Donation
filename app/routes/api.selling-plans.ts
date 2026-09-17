import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// ─── Queries & Mutations ─────────────────────────────────────────────

const GET_SELLING_PLAN_GROUP = `#graphql
query getSellingPlanGroup($id: ID!) {
  sellingPlanGroup(id: $id) {
    id
    name
    description
    merchantCode
    sellingPlans(first: 10) {
      edges {
        node {
          id
          name
          options
          position
          billingPolicy {
            ... on SellingPlanRecurringBillingPolicy {
              interval
              intervalCount
            }
          }
          deliveryPolicy {
            ... on SellingPlanRecurringDeliveryPolicy {
              interval
              intervalCount
            }
          }
          pricingPolicies {
            ... on SellingPlanFixedPricingPolicy {
              adjustmentType
              adjustmentValue {
                ... on SellingPlanPricingPolicyPercentageValue {
                  percentage
                }
                ... on MoneyV2 {
                  amount
                  currencyCode
                }
              }
            }
            ... on SellingPlanRecurringPricingPolicy {
              adjustmentType
              adjustmentValue {
                ... on SellingPlanPricingPolicyPercentageValue {
                  percentage
                }
                ... on MoneyV2 {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  }
}`;

const GET_ALL_SELLING_PLAN_GROUPS = `#graphql
query getAllSellingPlanGroups {
  sellingPlanGroups(first: 100) {
    edges {
      node {
        id
        name
      }
    }
  }
}`;

const CREATE_SELLING_PLAN_GROUP = `#graphql
mutation sellingPlanGroupCreate($input: SellingPlanGroupInput!, $resources: SellingPlanGroupResourceInput) {
  sellingPlanGroupCreate(input: $input, resources: $resources) {
    sellingPlanGroup {
      id
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
}`;

const UPDATE_SELLING_PLAN_GROUP = `#graphql
mutation sellingPlanGroupUpdate($id: ID!, $input: SellingPlanGroupInput!) {
  sellingPlanGroupUpdate(id: $id, input: $input) {
    sellingPlanGroup {
      id
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
}`;

const ADD_PRODUCTS_TO_GROUP = `#graphql
mutation sellingPlanGroupAddProducts($id: ID!, $productIds: [ID!]!) {
  sellingPlanGroupAddProducts(id: $id, productIds: $productIds) {
    sellingPlanGroup { id }
    userErrors { field message }
  }
}`;

const ADD_VARIANTS_TO_GROUP = `#graphql
mutation sellingPlanGroupAddProductVariants($id: ID!, $productVariantIds: [ID!]!) {
  sellingPlanGroupAddProductVariants(id: $id, productVariantIds: $productVariantIds) {
    sellingPlanGroup { id }
    userErrors { field message }
  }
}`;

const REMOVE_PRODUCTS_FROM_GROUP = `#graphql
mutation sellingPlanGroupRemoveProducts($id: ID!, $productIds: [ID!]!) {
  sellingPlanGroupRemoveProducts(id: $id, productIds: $productIds) {
    removedProductIds
    userErrors { field message }
  }
}`;

const REMOVE_VARIANTS_FROM_GROUP = `#graphql
mutation sellingPlanGroupRemoveProductVariants($id: ID!, $productVariantIds: [ID!]!) {
  sellingPlanGroupRemoveProductVariants(id: $id, productVariantIds: $productVariantIds) {
    removedProductVariantIds
    userErrors { field message }
  }
}`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ─── Loader (OPTIONS / GET) ──────────────────────────────────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);
  const rawId = url.searchParams.get("sellingPlanGroupId");

  // If no group ID is specified, return all selling plan groups in the store
  if (!rawId) {
    try {
      const response = await admin.graphql(GET_ALL_SELLING_PLAN_GROUPS);
      const jsonResult = await response.json();
      const groups = jsonResult.data?.sellingPlanGroups?.edges?.map((e: any) => e.node) || [];
      return Response.json({ success: true, groups }, { headers: corsHeaders });
    } catch (err: any) {
      console.error("[SellingPlanAPILoader] List error:", err);
      return Response.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders });
    }
  }

  const sellingPlanGroupId = rawId.startsWith("gid://")
    ? rawId
    : `gid://shopify/SellingPlanGroup/${rawId}`;

  try {
    const response = await admin.graphql(GET_SELLING_PLAN_GROUP, {
      variables: { id: sellingPlanGroupId }
    });
    const jsonResult = await response.json();
    const sellingPlanGroup = jsonResult.data?.sellingPlanGroup;

    if (!sellingPlanGroup) {
      return Response.json({ success: false, error: "Selling Plan Group not found" }, { status: 404, headers: corsHeaders });
    }

    const plans = sellingPlanGroup.sellingPlans.edges.map((e: any) => e.node);
    const monthlyPlan = plans.find((p: any) =>
      p.billingPolicy?.interval === "MONTH" ||
      p.name.toLowerCase().includes("month")
    );
    const weeklyPlan = plans.find((p: any) =>
      p.billingPolicy?.interval === "WEEK" ||
      p.name.toLowerCase().includes("week")
    );

    return Response.json({
      success: true,
      sellingPlanGroup: {
        id: sellingPlanGroup.id,
        name: sellingPlanGroup.name,
        description: sellingPlanGroup.description || "",
      },
      monthly: monthlyPlan ? {
        id: monthlyPlan.id,
        enabled: true,
        intervalCount: monthlyPlan.billingPolicy?.intervalCount ?? 1,
        discount: monthlyPlan.pricingPolicies?.[0]?.adjustmentValue?.percentage ?? 0,
      } : {
        id: null,
        enabled: false,
        intervalCount: 1,
        discount: 0,
      },
      weekly: weeklyPlan ? {
        id: weeklyPlan.id,
        enabled: true,
        intervalCount: weeklyPlan.billingPolicy?.intervalCount ?? 1,
        discount: weeklyPlan.pricingPolicies?.[0]?.adjustmentValue?.percentage ?? 0,
      } : {
        id: null,
        enabled: false,
        intervalCount: 1,
        discount: 0,
      },
    }, { headers: corsHeaders });
  } catch (err: any) {
    console.error("[SellingPlanAPILoader] Error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders });
  }
};

// ─── Action (POST) ───────────────────────────────────────────────────

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    const body = await request.json();
    const {
      action: actionType,
      id,
      name,
      description,
      monthlyEnabled,
      monthlyInterval,
      monthlyDiscount,
      weeklyEnabled,
      weeklyInterval,
      weeklyDiscount,
      productId,
    } = body;

    // ───────────────── 1. CREATE FLOW ─────────────────
    if (actionType === "CREATE") {
      const sellingPlansToCreate: any[] = [];

      if (monthlyEnabled) {
        sellingPlansToCreate.push({
          name: "Monthly Donation",
          options: ["Monthly"],
          description: `interval:MONTH,interval_count:${monthlyInterval}`,
          category: "SUBSCRIPTION",
          billingPolicy: {
            recurring: { interval: "MONTH", intervalCount: parseInt(monthlyInterval, 10) },
          },
          deliveryPolicy: {
            recurring: { interval: "MONTH", intervalCount: parseInt(monthlyInterval, 10) },
          },
          pricingPolicies: [
            {
              fixed: {
                adjustmentType: "PERCENTAGE",
                adjustmentValue: { percentage: parseFloat(monthlyDiscount) },
              },
            },
          ],
        });
      }

      if (weeklyEnabled) {
        sellingPlansToCreate.push({
          name: "Weekly Donation",
          options: ["Weekly"],
          description: `interval:WEEK,interval_count:${weeklyInterval}`,
          category: "SUBSCRIPTION",
          billingPolicy: {
            recurring: { interval: "WEEK", intervalCount: parseInt(weeklyInterval, 10) },
          },
          deliveryPolicy: {
            recurring: { interval: "WEEK", intervalCount: parseInt(weeklyInterval, 10) },
          },
          pricingPolicies: [
            {
              fixed: {
                adjustmentType: "PERCENTAGE",
                adjustmentValue: { percentage: parseFloat(weeklyDiscount) },
              },
            },
          ],
        });
      }

      const isVariant = productId?.includes("ProductVariant");
      const resources = isVariant
        ? { productVariantIds: [productId] }
        : { productIds: [productId] };

      const createResponse = await admin.graphql(CREATE_SELLING_PLAN_GROUP, {
        variables: {
          input: {
            name,
            description,
            merchantCode: "recurring-donations",
            options: ["Donation Interval"],
            sellingPlansToCreate,
          },
          resources,
        }
      });

      const createJson = await createResponse.json();
      const userErrors = createJson.data?.sellingPlanGroupCreate?.userErrors || [];
      if (userErrors.length > 0) {
        return Response.json({ success: false, error: userErrors.map((e: any) => e.message).join(", ") }, { status: 400, headers: corsHeaders });
      }

      const newGroup = createJson.data?.sellingPlanGroupCreate?.sellingPlanGroup;
      const newPlans = newGroup?.sellingPlans?.edges?.map((e: any) => e.node) || [];
      const newMonthlyPlanId = newPlans.find((p: any) => p.name.toLowerCase().includes("monthly"))?.id || null;
      const newWeeklyPlanId = newPlans.find((p: any) => p.name.toLowerCase().includes("weekly"))?.id || null;

      // Sync database config
      await prisma.recurringDonationConfig.upsert({
        where: { shop },
        update: {
          sellingPlanGroupId: newGroup.id,
          monthlyPlanId: newMonthlyPlanId,
          weeklyPlanId: newWeeklyPlanId,
          isActive: newMonthlyPlanId !== null || newWeeklyPlanId !== null,
        },
        create: {
          shop,
          productId: productId?.split("/").pop() || "",
          productGid: productId || "",
          sellingPlanGroupId: newGroup.id,
          monthlyPlanId: newMonthlyPlanId,
          weeklyPlanId: newWeeklyPlanId,
          isActive: newMonthlyPlanId !== null || newWeeklyPlanId !== null,
        }
      });

      return Response.json({ success: true, id: newGroup.id }, { headers: corsHeaders });
    }

    // ───────────────── 2. UPDATE FLOW ─────────────────
    if (!actionType || actionType === "UPDATE") {
      const currentGroupResponse = await admin.graphql(GET_SELLING_PLAN_GROUP, {
        variables: { id }
      });
      const currentGroupJson = await currentGroupResponse.json();
      const existingPlans = currentGroupJson.data?.sellingPlanGroup?.sellingPlans?.edges?.map((e: any) => e.node) || [];

      const sellingPlansToDelete: string[] = [];
      const sellingPlansToCreate: any[] = [];
      const sellingPlansToUpdate: any[] = [];

      // Monthly
      const existingMonthly = existingPlans.find((p: any) =>
        p.billingPolicy?.interval === "MONTH" ||
        p.name.toLowerCase().includes("month")
      );
      if (existingMonthly) {
        if (!monthlyEnabled) {
          sellingPlansToDelete.push(existingMonthly.id);
        } else {
          sellingPlansToUpdate.push({
            id: existingMonthly.id,
            name: "Monthly Donation",
            options: ["Monthly"],
            description: `interval:MONTH,interval_count:${monthlyInterval}`,
            billingPolicy: {
              recurring: { interval: "MONTH", intervalCount: parseInt(monthlyInterval, 10) },
            },
            deliveryPolicy: {
              recurring: { interval: "MONTH", intervalCount: parseInt(monthlyInterval, 10) },
            },
            pricingPolicies: [
              {
                fixed: {
                  adjustmentType: "PERCENTAGE",
                  adjustmentValue: { percentage: parseFloat(monthlyDiscount) },
                },
              },
            ],
          });
        }
      } else if (monthlyEnabled) {
        sellingPlansToCreate.push({
          name: "Monthly Donation",
          options: ["Monthly"],
          description: `interval:MONTH,interval_count:${monthlyInterval}`,
          category: "SUBSCRIPTION",
          billingPolicy: {
            recurring: { interval: "MONTH", intervalCount: parseInt(monthlyInterval, 10) },
          },
          deliveryPolicy: {
            recurring: { interval: "MONTH", intervalCount: parseInt(monthlyInterval, 10) },
          },
          pricingPolicies: [
            {
              fixed: {
                adjustmentType: "PERCENTAGE",
                adjustmentValue: { percentage: parseFloat(monthlyDiscount) },
              },
            },
          ],
        });
      }

      // Weekly
      const existingWeekly = existingPlans.find((p: any) =>
        p.billingPolicy?.interval === "WEEK" ||
        p.name.toLowerCase().includes("week")
      );
      if (existingWeekly) {
        if (!weeklyEnabled) {
          sellingPlansToDelete.push(existingWeekly.id);
        } else {
          sellingPlansToUpdate.push({
            id: existingWeekly.id,
            name: "Weekly Donation",
            options: ["Weekly"],
            description: `interval:WEEK,interval_count:${weeklyInterval}`,
            billingPolicy: {
              recurring: { interval: "WEEK", intervalCount: parseInt(weeklyInterval, 10) },
            },
            deliveryPolicy: {
              recurring: { interval: "WEEK", intervalCount: parseInt(weeklyInterval, 10) },
            },
            pricingPolicies: [
              {
                fixed: {
                  adjustmentType: "PERCENTAGE",
                  adjustmentValue: { percentage: parseFloat(weeklyDiscount) },
                },
              },
            ],
          });
        }
      } else if (weeklyEnabled) {
        sellingPlansToCreate.push({
          name: "Weekly Donation",
          options: ["Weekly"],
          description: `interval:WEEK,interval_count:${weeklyInterval}`,
          category: "SUBSCRIPTION",
          billingPolicy: {
            recurring: { interval: "WEEK", intervalCount: parseInt(weeklyInterval, 10) },
          },
          deliveryPolicy: {
            recurring: { interval: "WEEK", intervalCount: parseInt(weeklyInterval, 10) },
          },
          pricingPolicies: [
            {
              fixed: {
                adjustmentType: "PERCENTAGE",
                adjustmentValue: { percentage: parseFloat(weeklyDiscount) },
              },
            },
          ],
        });
      }

      const updateResponse = await admin.graphql(UPDATE_SELLING_PLAN_GROUP, {
        variables: {
          id,
          input: {
            name,
            description,
            sellingPlansToCreate,
            sellingPlansToUpdate,
            sellingPlansToDelete,
          }
        }
      });

      const updateJson = await updateResponse.json();
      const userErrors = updateJson.data?.sellingPlanGroupUpdate?.userErrors || [];

      if (userErrors.length > 0) {
        return Response.json({ success: false, error: userErrors.map((e: any) => e.message).join(", ") }, { status: 400, headers: corsHeaders });
      }

      const updatedGroup = updateJson.data?.sellingPlanGroupUpdate?.sellingPlanGroup;
      const updatedPlans = updatedGroup?.sellingPlans?.edges?.map((e: any) => e.node) || [];

      const newMonthlyPlanId = updatedPlans.find((p: any) => p.name.toLowerCase().includes("monthly"))?.id || null;
      const newWeeklyPlanId = updatedPlans.find((p: any) => p.name.toLowerCase().includes("weekly"))?.id || null;

      // Sync Prisma DB Config
      await prisma.recurringDonationConfig.upsert({
        where: { shop },
        update: {
          sellingPlanGroupId: id,
          monthlyPlanId: newMonthlyPlanId,
          weeklyPlanId: newWeeklyPlanId,
          isActive: newMonthlyPlanId !== null || newWeeklyPlanId !== null,
        },
        create: {
          shop,
          productId: productId?.split("/").pop() || "",
          productGid: productId || "",
          sellingPlanGroupId: id,
          monthlyPlanId: newMonthlyPlanId,
          weeklyPlanId: newWeeklyPlanId,
          isActive: newMonthlyPlanId !== null || newWeeklyPlanId !== null,
        }
      });

      return Response.json({ success: true }, { headers: corsHeaders });
    }

    // ───────────────── 3. ADD EXISTING FLOW ─────────────────
    if (actionType === "ADD_EXISTING") {
      const isVariant = productId?.includes("ProductVariant");
      const mutation = isVariant ? ADD_VARIANTS_TO_GROUP : ADD_PRODUCTS_TO_GROUP;
      const variables = isVariant
        ? { id, productVariantIds: [productId] }
        : { id, productIds: [productId] };

      const response = await admin.graphql(mutation, { variables });
      const jsonResult = await response.json();
      const mutationKey = isVariant ? "sellingPlanGroupAddProductVariants" : "sellingPlanGroupAddProducts";
      const userErrors = jsonResult.data?.[mutationKey]?.userErrors || [];

      if (userErrors.length > 0) {
        return Response.json({ success: false, error: userErrors.map((e: any) => e.message).join(", ") }, { status: 400, headers: corsHeaders });
      }

      // Sync Database Configuration
      const currentGroupResponse = await admin.graphql(GET_SELLING_PLAN_GROUP, {
        variables: { id }
      });
      const currentGroupJson = await currentGroupResponse.json();
      const plans = currentGroupJson.data?.sellingPlanGroup?.sellingPlans?.edges?.map((e: any) => e.node) || [];
      const newMonthlyPlanId = plans.find((p: any) => p.name.toLowerCase().includes("monthly"))?.id || null;
      const newWeeklyPlanId = plans.find((p: any) => p.name.toLowerCase().includes("weekly"))?.id || null;

      await prisma.recurringDonationConfig.upsert({
        where: { shop },
        update: {
          sellingPlanGroupId: id,
          monthlyPlanId: newMonthlyPlanId,
          weeklyPlanId: newWeeklyPlanId,
          isActive: newMonthlyPlanId !== null || newWeeklyPlanId !== null,
        },
        create: {
          shop,
          productId: productId?.split("/").pop() || "",
          productGid: productId || "",
          sellingPlanGroupId: id,
          monthlyPlanId: newMonthlyPlanId,
          weeklyPlanId: newWeeklyPlanId,
          isActive: newMonthlyPlanId !== null || newWeeklyPlanId !== null,
        }
      });

      return Response.json({ success: true }, { headers: corsHeaders });
    }

    // ───────────────── 4. REMOVE FLOW ─────────────────
    if (actionType === "REMOVE") {
      const isVariant = productId?.includes("ProductVariant");
      const mutation = isVariant ? REMOVE_VARIANTS_FROM_GROUP : REMOVE_PRODUCTS_FROM_GROUP;
      const variables = isVariant
        ? { id, productVariantIds: [productId] }
        : { id, productIds: [productId] };

      const response = await admin.graphql(mutation, { variables });
      const jsonResult = await response.json();
      const mutationKey = isVariant ? "sellingPlanGroupRemoveProductVariants" : "sellingPlanGroupRemoveProducts";
      const userErrors = jsonResult.data?.[mutationKey]?.userErrors || [];

      if (userErrors.length > 0) {
        return Response.json({ success: false, error: userErrors.map((e: any) => e.message).join(", ") }, { status: 400, headers: corsHeaders });
      }

      // Dissociate DB config (disable active state since the resource is removed)
      await prisma.recurringDonationConfig.updateMany({
        where: { shop, sellingPlanGroupId: id },
        data: { isActive: false }
      });

      return Response.json({ success: true }, { headers: corsHeaders });
    }

    return Response.json({ success: false, error: "Invalid action" }, { status: 400, headers: corsHeaders });
  } catch (err: any) {
    console.error("[SellingPlanAPIAction] Mutation error:", err);
    return Response.json({ success: false, error: err.message || "Mutation failed" }, { status: 500, headers: corsHeaders });
  }
};
