import { useState, useMemo, useEffect } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useSubmit, useNavigate, useActionData, useNavigation } from "react-router";
import {
    Page,
    Layout,
    Card,
    TextField,
    Checkbox,
    Button,
    Banner,
    BlockStack,
    InlineGrid,
    Text,
    Box,
    InlineStack,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
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

const UPDATE_SELLING_PLAN_GROUP = `#graphql
mutation sellingPlanGroupUpdate($id: ID!, $input: SellingPlanGroupInput!) {
  sellingPlanGroupUpdate(id: $id, input: $input) {
    sellingPlanGroup {
      id
      name
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

// ─── Loader ─────────────────────────────────────────────────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session, admin } = await authenticate.admin(request);
    const shop = session.shop;
    const url = new URL(request.url);
    const rawId = url.searchParams.get("sellingPlanGroupId");

    if (!rawId) {
        return { error: "No sellingPlanGroupId provided in request." };
    }

    const sellingPlanGroupId = rawId.startsWith("gid://") 
        ? rawId 
        : `gid://shopify/SellingPlanGroup/${rawId}`;

    try {
        const response = await admin.graphql(GET_SELLING_PLAN_GROUP, {
            variables: { id: sellingPlanGroupId }
        });
        const json = await response.json();
        const sellingPlanGroup = json.data?.sellingPlanGroup;

        if (!sellingPlanGroup) {
            return { error: `Selling Plan Group not found on Shopify for ID: ${rawId}` };
        }

        // Fetch database config if exists to cross-check
        const dbConfig = await prisma.recurringDonationConfig.findUnique({
            where: { shop }
        });

        // Parse plans
        const plans = sellingPlanGroup.sellingPlans.edges.map((e: any) => e.node);
        const monthlyPlan = plans.find((p: any) => 
            p.billingPolicy?.interval === "MONTH" || 
            p.name.toLowerCase().includes("month")
        );
        const weeklyPlan = plans.find((p: any) => 
            p.billingPolicy?.interval === "WEEK" || 
            p.name.toLowerCase().includes("week")
        );

        return {
            shop,
            sellingPlanGroup: {
                id: sellingPlanGroup.id,
                name: sellingPlanGroup.name,
                description: sellingPlanGroup.description || "",
                merchantCode: sellingPlanGroup.merchantCode,
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
            dbConfig,
        };
    } catch (err: any) {
        console.error("[SellingPlanEditLoader] Failed to fetch selling plan group:", err);
        return { error: `Failed to load Selling Plan Group: ${err.message || err}` };
    }
};

// ─── Action ─────────────────────────────────────────────────────────

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session, admin } = await authenticate.admin(request);
    const shop = session.shop;
    const formData = await request.formData();

    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    const monthlyEnabled = formData.get("monthlyEnabled") === "true";
    const monthlyId = formData.get("monthlyId") as string || null;
    const monthlyInterval = parseInt(formData.get("monthlyInterval") as string || "1", 10);
    const monthlyDiscount = parseFloat(formData.get("monthlyDiscount") as string || "0");

    const weeklyEnabled = formData.get("weeklyEnabled") === "true";
    const weeklyId = formData.get("weeklyId") as string || null;
    const weeklyInterval = parseInt(formData.get("weeklyInterval") as string || "1", 10);
    const weeklyDiscount = parseFloat(formData.get("weeklyDiscount") as string || "0");

    try {
        // 1. Re-query existing Selling Plan Group plans to build differential inputs
        const currentGroupResponse = await admin.graphql(GET_SELLING_PLAN_GROUP, {
            variables: { id }
        });
        const currentGroupJson = await currentGroupResponse.json();
        const existingPlans = currentGroupJson.data?.sellingPlanGroup?.sellingPlans?.edges?.map((e: any) => e.node) || [];

        const sellingPlansToDelete: string[] = [];
        const sellingPlansToCreate: any[] = [];
        const sellingPlansToUpdate: any[] = [];

        // Check Monthly
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
                    billingPolicy: {
                        recurring: {
                            interval: "MONTH",
                            intervalCount: monthlyInterval,
                        },
                    },
                    deliveryPolicy: {
                        recurring: {
                            interval: "MONTH",
                            intervalCount: monthlyInterval,
                        },
                    },
                    pricingPolicies: [
                        {
                            fixed: {
                                adjustmentType: "PERCENTAGE",
                                adjustmentValue: { percentage: monthlyDiscount },
                            },
                        },
                    ],
                });
            }
        } else if (monthlyEnabled) {
            sellingPlansToCreate.push({
                name: "Monthly Donation",
                options: ["Monthly"],
                category: "SUBSCRIPTION",
                billingPolicy: {
                    recurring: {
                        interval: "MONTH",
                        intervalCount: monthlyInterval,
                    },
                },
                deliveryPolicy: {
                    recurring: {
                        interval: "MONTH",
                        intervalCount: monthlyInterval,
                    },
                },
                pricingPolicies: [
                    {
                        fixed: {
                            adjustmentType: "PERCENTAGE",
                            adjustmentValue: { percentage: monthlyDiscount },
                        },
                    },
                ],
            });
        }

        // Check Weekly
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
                    billingPolicy: {
                        recurring: {
                            interval: "WEEK",
                            intervalCount: weeklyInterval,
                        },
                    },
                    deliveryPolicy: {
                        recurring: {
                            interval: "WEEK",
                            intervalCount: weeklyInterval,
                        },
                    },
                    pricingPolicies: [
                        {
                            fixed: {
                                adjustmentType: "PERCENTAGE",
                                adjustmentValue: { percentage: weeklyDiscount },
                            },
                        },
                    ],
                });
            }
        } else if (weeklyEnabled) {
            sellingPlansToCreate.push({
                name: "Weekly Donation",
                options: ["Weekly"],
                category: "SUBSCRIPTION",
                billingPolicy: {
                    recurring: {
                        interval: "WEEK",
                        intervalCount: weeklyInterval,
                    },
                },
                deliveryPolicy: {
                    recurring: {
                        interval: "WEEK",
                        intervalCount: weeklyInterval,
                    },
                },
                pricingPolicies: [
                    {
                        fixed: {
                            adjustmentType: "PERCENTAGE",
                            adjustmentValue: { percentage: weeklyDiscount },
                        },
                    },
                ],
            });
        }

        // Execute Update Mutation
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
            return { success: false, error: userErrors.map((e: any) => e.message).join(", ") };
        }

        const updatedGroup = updateJson.data?.sellingPlanGroupUpdate?.sellingPlanGroup;
        const updatedPlans = updatedGroup?.sellingPlans?.edges?.map((e: any) => e.node) || [];

        // Identify new IDs
        const newMonthlyPlanId = updatedPlans.find((p: any) => p.name.toLowerCase().includes("monthly"))?.id || null;
        const newWeeklyPlanId = updatedPlans.find((p: any) => p.name.toLowerCase().includes("weekly"))?.id || null;

        // Update database configuration
        const dbConfig = await prisma.recurringDonationConfig.findUnique({ where: { shop } });
        if (dbConfig) {
            await prisma.recurringDonationConfig.update({
                where: { shop },
                data: {
                    sellingPlanGroupId: id,
                    monthlyPlanId: newMonthlyPlanId,
                    weeklyPlanId: newWeeklyPlanId,
                    isActive: newMonthlyPlanId !== null || newWeeklyPlanId !== null,
                }
            });
        }

        return { success: true };
    } catch (err: any) {
        console.error("[SellingPlanEditAction] Mutation failure:", err);
        return { success: false, error: err.message || "An unexpected error occurred." };
    }
};

// ─── UI Component ───────────────────────────────────────────────────

export default function EditSellingPlanGroup() {
    const loaderData = useLoaderData<any>();
    const actionData = useActionData<any>();
    const submit = useSubmit();
    const navigate = useNavigate();
    const shopify = useAppBridge();
    const navigation = useNavigation();

    const sellingPlanGroup = loaderData?.sellingPlanGroup;
    const monthly = loaderData?.monthly;
    const weekly = loaderData?.weekly;

    const [name, setName] = useState(sellingPlanGroup?.name || "");
    const [description, setDescription] = useState(sellingPlanGroup?.description || "");

    const [mEnabled, setMEnabled] = useState(monthly?.enabled || false);
    const [mInterval, setMInterval] = useState(String(monthly?.intervalCount || "1"));
    const [mDiscount, setMDiscount] = useState(String(monthly?.discount || "0"));

    const [wEnabled, setWEnabled] = useState(weekly?.enabled || false);
    const [wInterval, setWInterval] = useState(String(weekly?.intervalCount || "1"));
    const [wDiscount, setWDiscount] = useState(String(weekly?.discount || "0"));

    if (loaderData?.error) {
        return (
            <Page title="Edit Selling Plan Group">
                <Banner tone="critical">
                    <p>{loaderData.error}</p>
                </Banner>
                <Box minHeight="20px" />
                <Button onClick={() => navigate("/app/recurring-subscriptions")}>Back to Subscriptions</Button>
            </Page>
        );
    }

    const isSubmitting = navigation.state === "submitting";

    useEffect(() => {
        if (actionData) {
            if (actionData.success) {
                shopify.toast.show("Selling plan group updated successfully");
                navigate("/app/recurring-subscriptions");
            } else if (actionData.error) {
                shopify.toast.show(actionData.error, { isError: true });
            }
        }
    }, [actionData, navigate, shopify]);

    const handleSave = () => {
        if (!name.trim()) {
            shopify.toast.show("Plan group name cannot be empty", { isError: true });
            return;
        }

        const fd = new FormData();
        fd.append("id", sellingPlanGroup.id);
        fd.append("name", name);
        fd.append("description", description);

        fd.append("monthlyEnabled", String(mEnabled));
        fd.append("monthlyInterval", mInterval);
        fd.append("monthlyDiscount", mDiscount);

        fd.append("weeklyEnabled", String(wEnabled));
        fd.append("weeklyInterval", wInterval);
        fd.append("weeklyDiscount", wDiscount);

        submit(fd, { method: "POST" });
    };

    return (
        <Page
            title={`Edit ${sellingPlanGroup.name}`}
            primaryAction={
                <Button variant="primary" onClick={handleSave} loading={isSubmitting}>
                    Save Plan Group
                </Button>
            }
            secondaryActions={[
                {
                    content: "Cancel",
                    onAction: () => navigate("/app/recurring-subscriptions"),
                },
            ]}
        >
            <Layout>
                <Layout.Section>
                    <BlockStack gap="500">
                        <Card>
                            <BlockStack gap="400">
                                <Text variant="headingMd" as="h2">Group Details</Text>
                                <TextField
                                    label="Group Name"
                                    value={name}
                                    onChange={setName}
                                    autoComplete="off"
                                    helpText="This is visible to buyers on the store product page."
                                />
                                <TextField
                                    label="Description"
                                    value={description}
                                    onChange={setDescription}
                                    multiline={3}
                                    autoComplete="off"
                                    helpText="Internal description of this selling plan group."
                                />
                            </BlockStack>
                        </Card>

                        <Card>
                            <BlockStack gap="400">
                                <Text variant="headingMd" as="h2">Monthly Donation Option</Text>
                                <Checkbox
                                    label="Enable Monthly Donations"
                                    checked={mEnabled}
                                    onChange={setMEnabled}
                                />
                                {mEnabled && (
                                    <InlineGrid columns={2} gap="400">
                                        <TextField
                                            label="Billing Interval (Months)"
                                            type="number"
                                            value={mInterval}
                                            onChange={setMInterval}
                                            autoComplete="off"
                                            min={1}
                                        />
                                        <TextField
                                            label="Discount Percentage"
                                            type="number"
                                            value={mDiscount}
                                            onChange={setMDiscount}
                                            autoComplete="off"
                                            suffix="%"
                                            min={0}
                                            max={100}
                                        />
                                    </InlineGrid>
                                )}
                            </BlockStack>
                        </Card>

                        <Card>
                            <BlockStack gap="400">
                                <Text variant="headingMd" as="h2">Weekly Donation Option</Text>
                                <Checkbox
                                    label="Enable Weekly Donations"
                                    checked={wEnabled}
                                    onChange={setWEnabled}
                                />
                                {wEnabled && (
                                    <InlineGrid columns={2} gap="400">
                                        <TextField
                                            label="Billing Interval (Weeks)"
                                            type="number"
                                            value={wInterval}
                                            onChange={setWInterval}
                                            autoComplete="off"
                                            min={1}
                                        />
                                        <TextField
                                            label="Discount Percentage"
                                            type="number"
                                            value={wDiscount}
                                            onChange={setWDiscount}
                                            autoComplete="off"
                                            suffix="%"
                                            min={0}
                                            max={100}
                                        />
                                    </InlineGrid>
                                )}
                            </BlockStack>
                        </Card>
                    </BlockStack>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
