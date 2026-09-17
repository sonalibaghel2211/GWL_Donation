import { useState, useCallback, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData, Link, useNavigate } from "react-router";
import {
    Page,
    Layout,
    Card,
    IndexTable,
    Badge,
    Text,
    Button,
    InlineStack,
    useIndexResourceState,
    Box,
    EmptyState,
    Icon,
    Banner,
    List,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { performSubscriptionAction } from "../utils/subscription-actions.server";
import prisma from "../db.server";
import { PLAN_FEATURES, type PlanType } from "../utils/features";

// ─── Loader ─────────────────────────────────────────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { admin, session } = await authenticate.admin(request);

    let contracts: any[] = [];
    let graphqlErrors: string[] = [];

    try {
        const response = await admin.graphql(
            `#graphql
        query getSubscriptionContracts($first: Int!) {
          subscriptionContracts(first: $first, reverse: true) {
            edges {
              node {
                id
                status
                createdAt
                nextBillingDate
                currencyCode
                customer {
                  firstName
                  lastName
                  email
                }
                lines(first: 10) {
                  edges {
                    node {
                      title
                      quantity
                      sellingPlanName
                      currentPrice {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
                originOrder {
                  id
                  name
                }
              }
            }
          }
        }`,
            { variables: { first: 50 } }
        );

        const json = await response.json();

        if (json.errors && json.errors.length > 0) {
            graphqlErrors = json.errors.map((e: any) => e.message);
            console.error(`[RecurringSubscriptions] GraphQL errors for ${session.shop}:`, graphqlErrors);
        }

        contracts = json.data?.subscriptionContracts?.edges?.map((e: any) => {
            const node = e.node;
            const lines = node.lines?.edges?.map((l: any) => l.node) ?? [];
            const totalAmount = lines.reduce((sum: number, line: any) => {
                return sum + (parseFloat(line.currentPrice?.amount ?? "0") * (line.quantity ?? 1));
            }, 0);

            return {
                id: node.id,
                numericId: node.id.split("/").pop(),
                status: node.status,
                createdAt: node.createdAt,
                nextBillingDate: node.nextBillingDate,
                currency: node.currencyCode || lines[0]?.currentPrice?.currencyCode || "USD",
                customerName: `${node.customer?.firstName ?? ""} ${node.customer?.lastName ?? ""}`.trim() || "N/A",
                customerEmail: node.customer?.email ?? "N/A",
                orderNumber: node.originOrder?.name ?? "N/A",
                planType: lines[0]?.sellingPlanName ?? "Subscription",
                totalAmount,
                source: "shopify" as const,
            };
        }) ?? [];

        console.log(`[RecurringSubscriptions] Loaded ${contracts.length} native contracts for ${session.shop}`);
    } catch (err: any) {
        console.error(`[RecurringSubscriptions] Failed to query Shopify contracts for ${session.shop}:`, err.message || err);
        graphqlErrors.push(err.message || "Unknown error querying Shopify");
    }

    let localRecords: any[] = [];
    if (contracts.length === 0) {
        try {
            const { default: db } = await import("../db.server");
            const dbRecords = await db.recurringDonationLog.findMany({
                where: { shop: session.shop },
                orderBy: { createdAt: "desc" },
                take: 50,
            });
            localRecords = dbRecords.map((r: any) => ({
                id: r.subscriptionContractId || `local-${r.id}`,
                numericId: r.subscriptionContractId ? r.subscriptionContractId.split("/").pop() : r.id,
                status: r.subscriptionContractId ? "ACTIVE" : "UNLINKED",
                createdAt: r.createdAt?.toISOString(),
                nextBillingDate: null,
                currency: r.currency || "USD",
                customerName: r.customerName || "N/A",
                customerEmail: r.customerEmail || "N/A",
                orderNumber: r.orderName || "N/A",
                planType: r.interval || "Subscription",
                totalAmount: r.amount || 0,
                source: "database" as const,
            }));
            console.log(`[RecurringSubscriptions] Loaded ${localRecords.length} local DB records as fallback`);
        } catch (dbErr: any) {
            console.error("[RecurringSubscriptions] DB fallback failed:", dbErr.message);
        }
    }

    const planSubscription = await prisma.planSubscription.findUnique({ where: { shop: session.shop } });
    const currentPlan = (planSubscription?.plan || "basic") as PlanType;
    const canUseRecurringDonations = PLAN_FEATURES[currentPlan]?.canUseRecurringDonations ?? false;

    return {
        contracts: contracts.length > 0 ? contracts : localRecords,
        shop: session.shop,
        graphqlErrors,
        isLocalFallback: contracts.length === 0 && localRecords.length > 0,
        currentPlan,
        canUseRecurringDonations,
    };
};

// ─── Action ─────────────────────────────────────────────────

export const action = async ({ request }: ActionFunctionArgs) => {
    const { admin, session } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("_action") as any;
    const subscriptionId = formData.get("subscriptionId") as string;

    try {
        const result = await performSubscriptionAction({
            admin,
            shop: session.shop,
            subscriptionId,
            actionType,
        });
        return { success: true, message: result.message };
    } catch (err) {
        return { success: false, message: err instanceof Error ? err.message : "Action failed" };
    }
};

// ─── Component ──────────────────────────────────────────────

export default function RecurringSubscriptionsPage() {
    const { contracts, graphqlErrors, isLocalFallback, currentPlan, canUseRecurringDonations } = useLoaderData<typeof loader>();
    const fetcher = useFetcher<any>();
    const shopify = useAppBridge();
    const navigate = useNavigate();

    useEffect(() => {
        if (fetcher.data?.message) {
            shopify.toast.show(fetcher.data.message);
        }
    }, [fetcher.data, shopify]);

    const resourceName = {
        singular: "subscription",
        plural: "subscriptions",
    };

    const { selectedResources, allResourcesSelected, handleSelectionChange } =
        useIndexResourceState(contracts as any);

    const getStatusBadge = (status: string, source: string) => {
        if (source === "database") {
            return <Badge tone="info">Tracking Only</Badge>;
        }
        switch (status.toUpperCase()) {
            case "ACTIVE":
                return <Badge tone="success">Active</Badge>;
            case "PAUSED":
                return <Badge tone="attention">Paused</Badge>;
            case "CANCELLED":
            case "EXPIRED":
            case "FAILED":
                return <Badge tone="critical">{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const fmtDate = (dateString: string | null) => {
        if (!dateString) return "—";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const rowMarkup = (contracts || []).map(
        (
            { id, numericId, customerName, customerEmail, planType, orderNumber, createdAt, nextBillingDate, totalAmount, currency, status, source }: any,
            index: number
        ) => (
            <IndexTable.Row
                id={id}
                key={id}
                selected={selectedResources.includes(id)}
                position={index}
            >
                <IndexTable.Cell>
                    <Link to={`/app/subscription-detail?id=${numericId}`} style={{ textDecoration: "none" }}>
                        <Text variant="bodyMd" fontWeight="bold" as="span">
                            #{numericId}
                        </Text>
                    </Link>
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <Text variant="bodyMd" fontWeight="bold" as="span">{customerName}</Text>
                        <Text variant="bodySm" tone="subdued" as="span">{customerEmail}</Text>
                    </div>
                </IndexTable.Cell>
                <IndexTable.Cell>
                    {planType.toLowerCase().includes("month") ? "Monthly" : planType.toLowerCase().includes("week") ? "Weekly" : "Recurring"}
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <Text variant="bodyMd" fontWeight="bold" as="span">{orderNumber}</Text>
                </IndexTable.Cell>
                <IndexTable.Cell>{fmtDate(createdAt)}</IndexTable.Cell>
                <IndexTable.Cell>{fmtDate(nextBillingDate)}</IndexTable.Cell>
                <IndexTable.Cell>
                    {new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(totalAmount)}
                </IndexTable.Cell>
                <IndexTable.Cell>{getStatusBadge(status, source)}</IndexTable.Cell>
                <IndexTable.Cell>
                    <InlineStack gap="200" align="end">
                        <Button
                            size="slim"
                            variant="plain"
                            onClick={() => navigate(`/app/subscription-detail?id=${numericId}`)}
                        >
                            View
                        </Button>
                        {source === "shopify" && status === "ACTIVE" && (
                            <Button
                                size="slim"
                                onClick={() => fetcher.submit({ _action: "pause", subscriptionId: id }, { method: "POST" })}
                                loading={fetcher.state === "submitting" && fetcher.formData?.get("subscriptionId") === id && fetcher.formData?.get("_action") === "pause"}
                            >
                                Pause
                            </Button>
                        )}
                        {source === "shopify" && status === "PAUSED" && (
                            <Button
                                size="slim"
                                variant="primary"
                                onClick={() => fetcher.submit({ _action: "activate", subscriptionId: id }, { method: "POST" })}
                                loading={fetcher.state === "submitting" && fetcher.formData?.get("subscriptionId") === id && fetcher.formData?.get("_action") === "activate"}
                            >
                                Resume
                            </Button>
                        )}
                        {source === "shopify" && (status === "ACTIVE" || status === "PAUSED") && (
                            <Button
                                size="slim"
                                tone="critical"
                                onClick={() => {
                                    if (confirm("Are you sure you want to cancel this subscription?")) {
                                        fetcher.submit({ _action: "cancel", subscriptionId: id }, { method: "POST" });
                                    }
                                }}
                                loading={fetcher.state === "submitting" && fetcher.formData?.get("subscriptionId") === id && fetcher.formData?.get("_action") === "cancel"}
                            >
                                Cancel
                            </Button>
                        )}
                        {source === "database" && (
                             <Text variant="bodySm" tone="subdued" as="span">Sync Pending</Text>
                        )}
                    </InlineStack>
                </IndexTable.Cell>
            </IndexTable.Row>
        )
    );

    // ── Upgrade Wall for Basic Plan ──────────────────────────────────────
    if (!canUseRecurringDonations) {
        return (
            <Page fullWidth title="Recurring Donation Management">
                <Layout>
                    <Layout.Section>
                        <Card>
                            <div style={{ padding: "48px 24px", textAlign: "center" }}>
                                <div style={{ fontSize: "56px", marginBottom: "16px" }}>🔒</div>
                                <Text variant="headingLg" as="h2">
                                    Recurring Donations — Advanced Plan Required
                                </Text>
                                <Box paddingBlockStart="300" paddingBlockEnd="500">
                                    <Text variant="bodyMd" tone="subdued" as="p">
                                        Recurring donation subscriptions are available on the <strong>Advanced</strong> plan and above.
                                        Upgrade your subscription to unlock subscription management, automated billing, and more.
                                    </Text>
                                </Box>
                                <Button
                                    variant="primary"
                                    size="large"
                                    onClick={() => navigate("/app/pricing")}
                                >
                                    Upgrade to Advanced
                                </Button>
                            </div>
                        </Card>
                    </Layout.Section>
                </Layout>
            </Page>
        );
    }

    return (
        <Page fullWidth title="Recurring Donation Management">
            <Layout>
                {graphqlErrors && graphqlErrors.length > 0 && (
                    <Layout.Section>
                        <Banner
                            title="Subscription Sync Issues Detected"
                            tone="warning"
                        >
                            <p>We encountered some issues while fetching native subscription contracts from Shopify. This might be due to missing permissions or ongoing synchronization.</p>
                            <Box paddingBlockStart="200">
                                <List type="bullet">
                                    {graphqlErrors.map((error: string, idx: number) => (
                                        <List.Item key={idx}>{error}</List.Item>
                                    ))}
                                </List>
                            </Box>
                            <Box paddingBlockStart="200">
                                <Text as="p" variant="bodyMd">
                                    <strong>Recommendation:</strong> Ensure the app is correctly authorized and that the latest webhooks are registered in your Shopify admin.
                                </Text>
                            </Box>
                        </Banner>
                    </Layout.Section>
                )}

                {isLocalFallback && (
                    <Layout.Section>
                        <Banner
                            title="Showing Local Sync Records"
                            tone="info"
                        >
                            <p>No native Shopify Subscription Contracts were found. We are currently showing records tracked directly by the app. Native actions (Pause/Cancel) will be available once the Shopify Contracts are generated.</p>
                        </Banner>
                    </Layout.Section>
                )}

                <Layout.Section>
                    <Card padding="0">
                        {contracts && contracts.length > 0 ? (
                            <IndexTable
                                resourceName={resourceName}
                                itemCount={contracts.length}
                                selectedItemsCount={
                                    allResourcesSelected ? "All" : selectedResources.length
                                }
                                onSelectionChange={handleSelectionChange}
                                headings={[
                                    { title: "Subscription Id" },
                                    { title: "Customer" },
                                    { title: "Frequency" },
                                    { title: "First Order No" },
                                    { title: "Create Date" },
                                    { title: "Next Billing Date" },
                                    { title: "Total Amount" },
                                    { title: "Status" },
                                    { title: "Actions", alignment: "end" },
                                ]}
                                selectable={false}
                            >
                                {rowMarkup}
                            </IndexTable>
                        ) : (
                            <EmptyState
                                heading="No recurring donations found"
                                action={{ content: "Setup Selling Plans", onAction: () => navigate("/app/preset-donation") }}
                                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                            >
                                <p>When customers start recurring donations, they will appear here.</p>
                            </EmptyState>
                        )}
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
