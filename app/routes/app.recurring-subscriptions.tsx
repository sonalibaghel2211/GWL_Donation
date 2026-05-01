import { useState, useCallback } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData, Link } from "react-router";
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
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { performSubscriptionAction } from "../utils/subscription-actions.server";

// ─── Loader ─────────────────────────────────────────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { admin, session } = await authenticate.admin(request);

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
    const contracts = json.data?.subscriptionContracts?.edges?.map((e: any) => {
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
        };
    }) ?? [];

    return { contracts, shop: session.shop };
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
    const { contracts } = useLoaderData<typeof loader>();
    const fetcher = useFetcher<any>();

    const resourceName = {
        singular: "subscription",
        plural: "subscriptions",
    };

    const { selectedResources, allResourcesSelected, handleSelectionChange } =
        useIndexResourceState(contracts);

    const getStatusBadge = (status: string) => {
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

    const rowMarkup = contracts.map(
        (
            { id, numericId, customerName, customerEmail, planType, orderNumber, createdAt, nextBillingDate, totalAmount, currency, status }: any,
            index: number
        ) => (
            <IndexTable.Row
                id={id}
                key={id}
                selected={selectedResources.includes(id)}
                position={index}
            >
                <IndexTable.Cell>
                    <Text variant="bodyMd" fontWeight="bold" as="span">
                        #{numericId}
                    </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <Text variant="bodyMd" fontWeight="bold" as="span">{customerName}</Text>
                        <Text variant="bodySm" tone="subdued" as="span">{customerEmail}</Text>
                    </div>
                </IndexTable.Cell>
                <IndexTable.Cell>
                    {/* Frequency - we usually derive this from planType or sellingPlanName */}
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
                <IndexTable.Cell>{getStatusBadge(status)}</IndexTable.Cell>
                <IndexTable.Cell>
                    <InlineStack gap="200" align="end">
                        {status === "ACTIVE" && (
                            <Button
                                size="slim"
                                onClick={() => fetcher.submit({ _action: "pause", subscriptionId: id }, { method: "POST" })}
                                loading={fetcher.state === "submitting" && fetcher.formData?.get("subscriptionId") === id && fetcher.formData?.get("_action") === "pause"}
                            >
                                Pause

                            </Button>
                        )}
                        {status === "PAUSED" && (
                            <Button
                                size="slim"
                                variant="primary"
                                onClick={() => fetcher.submit({ _action: "activate", subscriptionId: id }, { method: "POST" })}
                                loading={fetcher.state === "submitting" && fetcher.formData?.get("subscriptionId") === id && fetcher.formData?.get("_action") === "activate"}
                            >
                                Resume

                            </Button>
                        )}
                        {(status === "ACTIVE" || status === "PAUSED") && (
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
                    </InlineStack>
                </IndexTable.Cell>
            </IndexTable.Row>
        )
    );

    return (
        <Page fullWidth title="Recurring Donation Management">
            <Layout>
                <Layout.Section>
                    <Card padding="0">
                        {contracts.length > 0 ? (
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
                                action={{ content: "Setup Selling Plans", url: "/app/recurring-donation" }}
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
