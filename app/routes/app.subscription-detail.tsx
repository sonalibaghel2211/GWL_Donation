import { useState, useCallback, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, useNavigate } from "react-router";
import {
    Page,
    Layout,
    Card,
    Text,
    Badge,
    Button,
    InlineStack,
    BlockStack,
    Box,
    Banner,
    Divider,
    DescriptionList,
    Modal,
    Spinner,
    EmptyState,
    Icon,
    Checkbox,
    Link,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { performSubscriptionAction } from "../utils/subscription-actions.server";

// ─── Types ──────────────────────────────────────────────────

interface ContractLine {
    title: string;
    quantity: number;
    currentPrice: { amount: string; currencyCode: string };
    variantTitle?: string;
    sellingPlanName?: string;
}

interface ContractData {
    id: string;
    status: string;
    createdAt: string;
    nextBillingDate: string | null;
    currencyCode: string;
    deliveryPolicy?: { interval: string; intervalCount: number };
    billingPolicy?: { interval: string; intervalCount: number };
    lines: ContractLine[];
    customer: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    } | null;
    originOrder: {
        id: string;
        name: string;
    } | null;
}

// ─── Loader ─────────────────────────────────────────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { admin, session } = await authenticate.admin(request);
    const url = new URL(request.url);

    let contractId = url.searchParams.get("id") || "";
    const customerId = url.searchParams.get("customer_id") || "";

    if (!contractId) {
        return {
            contract: null,
            localLogs: [],
            billingAttempts: [],
            error: "No subscription contract ID provided.",
            shop: session.shop,
        };
    }

    // Ensure proper GID format
    const fullGid = contractId.startsWith("gid://shopify/SubscriptionContract/")
        ? contractId
        : `gid://shopify/SubscriptionContract/${contractId}`;

    const numericId = fullGid.split("/").pop() || contractId;



    let contract: ContractData | null = null;
    let graphqlError: string | null = null;

    try {
        const response = await admin.graphql(
            `#graphql
            query getSubscriptionContractDetail($id: ID!) {
                subscriptionContract(id: $id) {
                    id
                    status
                    createdAt
                    nextBillingDate
                    currencyCode
                    deliveryPolicy {
                        interval
                        intervalCount
                    }
                    billingPolicy {
                        interval
                        intervalCount
                    }
                    lines(first: 20) {
                        edges {
                            node {
                                title
                                quantity
                                variantTitle
                                sellingPlanName
                                currentPrice {
                                    amount
                                    currencyCode
                                }
                            }
                        }
                    }
                    customer {
                        id
                        firstName
                        lastName
                        email
                    }
                    originOrder {
                        id
                        name
                    }
                }
            }`,
            { variables: { id: fullGid } }
        );

        const json: any = await response.json();

        if (json.errors && json.errors.length > 0) {
            graphqlError = json.errors.map((e: any) => e.message).join("; ");
            console.error(`[SubscriptionDetail] GraphQL errors:`, json.errors);
        }

        const node = json?.data?.subscriptionContract;
        if (node) {
            contract = {
                id: node.id,
                status: node.status,
                createdAt: node.createdAt,
                nextBillingDate: node.nextBillingDate,
                currencyCode: node.currencyCode,
                deliveryPolicy: node.deliveryPolicy,
                billingPolicy: node.billingPolicy,
                lines: node.lines?.edges?.map((e: any) => e.node) ?? [],
                customer: node.customer,
                originOrder: node.originOrder,
            };
        }
    } catch (err: any) {
        console.error(`[SubscriptionDetail] Failed to fetch contract ${fullGid}:`, err);
        graphqlError = err.message || "Unknown error fetching contract";
    }

    // Fetch local DB records
    let localLogs: any[] = [];
    let billingAttempts: any[] = [];

    try {
        const { default: db } = await import("../db.server");

        // Find matching recurring donation logs
        localLogs = await db.recurringDonationLog.findMany({
            where: {
                shop: session.shop,
                OR: [
                    { subscriptionContractId: fullGid },
                    ...(contract?.originOrder?.id ? [{ orderId: contract.originOrder.id }] : []),
                ],
            },
            orderBy: { createdAt: "desc" },
            take: 10,
        });

        // Find billing attempts for this contract
        billingAttempts = await db.billingAttemptLog.findMany({
            where: {
                shop: session.shop,
                subscriptionContractId: fullGid,
            },
            orderBy: { createdAt: "desc" },
            take: 20,
        });
    } catch (dbErr: any) {
        console.error(`[SubscriptionDetail] DB query failed:`, dbErr.message);
    }

    return {
        contract,
        localLogs: localLogs.map((l: any) => ({
            id: l.id,
            orderId: l.orderId,
            orderNumber: l.orderNumber,
            donationAmount: l.donationAmount,
            currency: l.currency,
            status: l.status,
            frequency: l.frequency,
            receiptStatus: l.receiptStatus,
            createdAt: l.createdAt?.toISOString?.() || l.createdAt,
        })),
        billingAttempts: billingAttempts.map((b: any) => ({
            id: b.id,
            status: b.status,
            source: b.source,
            amount: b.amount,
            currency: b.currency,
            errorMessage: b.errorMessage,
            retryNumber: b.retryNumber,
            orderNumber: b.orderNumber,
            createdAt: b.createdAt?.toISOString?.() || b.createdAt,
        })),
        error: graphqlError,
        shop: session.shop,
    };
};

// ─── Action ─────────────────────────────────────────────────

export const action = async ({ request }: ActionFunctionArgs) => {
    const { admin, session } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("_action") as any;
    const subscriptionId = formData.get("subscriptionId") as string;

    try {
        if (actionType === "set_billing_date") {
            const date = formData.get("date") as string;
            if (!date) throw new Error("No date provided");
            const fullGid = subscriptionId.startsWith("gid://shopify/SubscriptionContract/")
                ? subscriptionId
                : `gid://shopify/SubscriptionContract/${subscriptionId}`;

            const response = await admin.graphql(
                `#graphql
                mutation subscriptionContractSetNextBillingDate($date: DateTime!, $contractId: ID!) {
                    subscriptionContractSetNextBillingDate(date: $date, contractId: $contractId) {
                        contract {
                            id
                            nextBillingDate
                        }
                        userErrors {
                            field
                            message
                        }
                    }
                }`,
                { variables: { date, contractId: fullGid } }
            );

            const json: any = await response.json();
            const errors = json?.data?.subscriptionContractSetNextBillingDate?.userErrors;
            if (errors && errors.length > 0) {
                throw new Error(errors[0].message);
            }

            return {
                success: true,
                message: "Successfully updated Next Billing Date",
                date: date,
            };
        }
        if (actionType === "trigger_billing_attempt") {
            const fullGid = subscriptionId.startsWith("gid://shopify/SubscriptionContract/")
                ? subscriptionId
                : `gid://shopify/SubscriptionContract/${subscriptionId}`;

            const now = new Date();
            const idempotencyKey = `billing-attempt-${fullGid.split("/").pop()}-${now.getTime()}`;

            let attempt: any = null;
            let billingAttemptId = "";

            const response = await admin.graphql(
                `#graphql
                mutation subscriptionBillingAttemptCreate($subscriptionContractId: ID!, $subscriptionBillingAttemptInput: SubscriptionBillingAttemptInput!) {
                    subscriptionBillingAttemptCreate(
                        subscriptionContractId: $subscriptionContractId
                        subscriptionBillingAttemptInput: $subscriptionBillingAttemptInput
                    ) {
                        subscriptionBillingAttempt {
                            id
                            completedAt
                            errorCode
                            errorMessage
                            order {
                                id
                                name
                            }
                        }
                        userErrors {
                            field
                            message
                        }
                    }
                }`,
                {
                    variables: {
                        subscriptionContractId: fullGid,
                        subscriptionBillingAttemptInput: {
                            idempotencyKey,
                            originTime: now.toISOString(),
                        },
                    },
                }
            );

            const json: any = await response.json();
            const errors = json?.data?.subscriptionBillingAttemptCreate?.userErrors;
            if (errors && errors.length > 0) {
                throw new Error(errors[0].message);
            }

            attempt = json?.data?.subscriptionBillingAttemptCreate?.subscriptionBillingAttempt;
            billingAttemptId = attempt?.id || `gid://shopify/SubscriptionBillingAttempt/${now.getTime()}`;

            // ─── Instant Database Logging for Manual Executions ───
            let contractDetails: any = null;
            try {
                const contractResponse = await admin.graphql(
                    `#graphql
                    query getContractForManualLog($id: ID!) {
                        subscriptionContract(id: $id) {
                            id
                            status
                            nextBillingDate
                            currencyCode
                            customer {
                                email
                                firstName
                                lastName
                            }
                            lines(first: 1) {
                                edges {
                                    node {
                                        title
                                        sellingPlanName
                                        currentPrice { amount }
                                    }
                                }
                            }
                            originOrder {
                                id
                                name
                            }
                        }
                    }`,
                    { variables: { id: fullGid } }
                );

                const contractJson = await contractResponse.json();
                contractDetails = contractJson.data?.subscriptionContract;
            } catch (gqlErr) {
                console.error(`[SubscriptionDetail] Failed to fetch contract details for manual log:`, gqlErr);
            }

            const db = (await import("../db.server")).default;
            const customer = contractDetails?.customer;
            const line = contractDetails?.lines?.edges?.[0]?.node;
            const originOrder = contractDetails?.originOrder;
            const amount = parseFloat(line?.currentPrice?.amount || "0");
            const currency = contractDetails?.currencyCode || "USD";
            const donationName = line?.title || "Recurring Donation";
            const frequency = line?.sellingPlanName || "Subscription";
            const customerEmail = customer?.email || "";
            const customerName = `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() || "Customer";

            if (attempt?.errorCode) {
                const errorCode = attempt.errorCode;
                const errorMessage = attempt.errorMessage || "Payment failed";

                // Get retry count for database tracking
                const existingLogForRetryNum = await db.paymentRecoveryLog.findUnique({
                    where: {
                        shop_subscriptionContractId: {
                            shop: session.shop,
                            subscriptionContractId: fullGid,
                        },
                    },
                });
                const currentRetryCount = existingLogForRetryNum && (existingLogForRetryNum.status === "pending" || existingLogForRetryNum.status === "retrying")
                    ? existingLogForRetryNum.retryCount + 1
                    : 0;

                try {
                    await db.billingAttemptLog.create({
                        data: {
                            shop: session.shop,
                            subscriptionContractId: fullGid,
                            billingAttemptId,
                            source: "manual",
                            status: "failed",
                            errorCode,
                            errorMessage,
                            orderId: originOrder?.id || null,
                            orderNumber: originOrder?.name || null,
                            customerEmail,
                            customerName,
                            amount,
                            currency,
                            donationName,
                            frequency,
                            retryNumber: currentRetryCount,
                            rawPayload: JSON.stringify(attempt),
                        },
                    });

                } catch (dbErr) {
                    console.error(`[SubscriptionDetail] Failed to create instant database log:`, dbErr);
                }

                // If Smart Recovery is enabled, upsert recovery settings and queue retries
                const recoverySettings = await db.paymentRecoverySettings.findUnique({
                    where: { shop: session.shop },
                });

                if (recoverySettings?.enabled) {
                    const nextRetryDate = new Date();
                    nextRetryDate.setDate(nextRetryDate.getDate() + recoverySettings.retryInterval);

                    let recoveryLog;
                    if (existingLogForRetryNum && (existingLogForRetryNum.status === "pending" || existingLogForRetryNum.status === "retrying")) {
                        recoveryLog = await db.paymentRecoveryLog.update({
                            where: { id: existingLogForRetryNum.id },
                            data: {
                                retryCount: existingLogForRetryNum.retryCount + 1,
                                errorCode,
                                errorMessage,
                                nextRetryDate,
                                status: existingLogForRetryNum.retryCount + 1 >= existingLogForRetryNum.maxRetries ? "exhausted" : "retrying",
                            },
                        });

                        // Execute native Shopify pause/cancel action if exhausted
                        if (recoveryLog.status === "exhausted") {
                            const fallbackAction = recoverySettings.fallbackAction;
                            let mutation = "";
                            let mutationName = "";

                            if (fallbackAction === "pause") {
                                mutation = `mutation { subscriptionContractPause(subscriptionContractId: "${fullGid}") { contract { id status } userErrors { field message } } }`;
                                mutationName = "subscriptionContractPause";
                            } else if (fallbackAction === "cancel") {
                                mutation = `mutation { subscriptionContractCancel(subscriptionContractId: "${fullGid}") { contract { id status } userErrors { field message } } }`;
                                mutationName = "subscriptionContractCancel";
                            }

                            if (mutation) {
                                try {
                                    const fallbackResponse = await admin.graphql(mutation);
                                    const fallbackJson: any = await fallbackResponse.json();
                                    const fallbackResult = fallbackJson.data?.[mutationName];
                                    if (fallbackResult?.userErrors?.length > 0) {
                                        console.error(`[SubscriptionDetail] Manual Fallback ${fallbackAction} userErrors:`, fallbackResult.userErrors[0].message);
                                    } else {

                                        recoveryLog = await db.paymentRecoveryLog.update({
                                            where: { id: recoveryLog.id },
                                            data: { status: "fallback_executed" },
                                        });
                                    }
                                } catch (gqlErr) {
                                    console.error(`[SubscriptionDetail] Manual Fallback mutation execution failed:`, gqlErr);
                                }
                            }
                        }
                    } else {
                        recoveryLog = await db.paymentRecoveryLog.upsert({
                            where: {
                                shop_subscriptionContractId: {
                                    shop: session.shop,
                                    subscriptionContractId: fullGid,
                                },
                            },
                            create: {
                                shop: session.shop,
                                subscriptionContractId: fullGid,
                                orderId: originOrder?.id || null,
                                orderNumber: originOrder?.name || null,
                                customerEmail,
                                customerName,
                                amount,
                                currency,
                                errorCode,
                                errorMessage,
                                retryCount: 0,
                                maxRetries: recoverySettings.retryAttempts,
                                retryInterval: recoverySettings.retryInterval,
                                nextRetryDate,
                                fallbackAction: recoverySettings.fallbackAction,
                                status: "pending",
                                donationName,
                                frequency,
                            },
                            update: {
                                retryCount: 0,
                                errorCode,
                                errorMessage,
                                nextRetryDate,
                                maxRetries: recoverySettings.retryAttempts,
                                retryInterval: recoverySettings.retryInterval,
                                fallbackAction: recoverySettings.fallbackAction,
                                status: "pending",
                            },
                        });
                    }

                    if (recoverySettings.sendNotifications && customerEmail) {
                        try {
                            const { sendDonationReceipt } = await import("../utils/sendgrid.server");
                            await sendDonationReceipt({
                                email: customerEmail,
                                name: customerName,
                                amount: amount.toFixed(2),
                                orderNumber: originOrder?.name || "N/A",
                                type: (recoveryLog.status === "exhausted" ? (recoverySettings.fallbackAction === "cancel" ? "cancellation" : "pause") : "recovery") as any,
                                shop: session.shop,
                                frequency: frequency.toLowerCase().includes("month") ? "Monthly" : frequency.toLowerCase().includes("week") ? "Weekly" : "Subscription",
                                nextBillingDate: nextRetryDate.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                }),
                                donationName,
                                manageUrl: `https://${session.shop}/account/subscriptions`,
                            });
                        } catch (emailErr) {
                            console.error(`[SubscriptionDetail] Failed to send instant recovery notification:`, emailErr);
                        }
                    }
                }

                throw new Error(`Billing attempt failed: ${errorMessage}`);
            }

            // Success manual execution logging
            const orderId = attempt?.order?.id || null;
            const orderName = attempt?.order?.name || "";

            try {
                await db.billingAttemptLog.create({
                    data: {
                        shop: session.shop,
                        subscriptionContractId: fullGid,
                        billingAttemptId,
                        source: "manual",
                        status: "success",
                        orderId,
                        orderNumber: orderName || null,
                        customerEmail,
                        customerName,
                        amount,
                        currency,
                        donationName,
                        frequency,
                    },
                });

                const recoveryLog = await db.paymentRecoveryLog.findUnique({
                    where: {
                        shop_subscriptionContractId: {
                            shop: session.shop,
                            subscriptionContractId: fullGid,
                        },
                    },
                });
                if (recoveryLog && (recoveryLog.status === "pending" || recoveryLog.status === "retrying")) {
                    await db.paymentRecoveryLog.update({
                        where: { id: recoveryLog.id },
                        data: { status: "recovered", orderId },
                    });
                }
            } catch (dbErr) {
                console.error(`[SubscriptionDetail] Failed to log successful attempt:`, dbErr);
            }

            return {
                success: true,
                message: `Billing attempt completed successfully! ${orderName ? `Created Order ${orderName}.` : "Successful attempt logged."}`,
            };
        }

        const result = await performSubscriptionAction({
            admin,
            shop: session.shop,
            subscriptionId,
            actionType,
        });
        return { success: true, message: result.message };
    } catch (err) {
        return {
            success: false,
            message: err instanceof Error ? err.message : "Action failed",
        };
    }
};

// ─── Component ──────────────────────────────────────────────

export default function SubscriptionDetailPage() {
    const { contract, localLogs, billingAttempts, error, shop } =
        useLoaderData<typeof loader>();
    const fetcher = useFetcher<any>();
    const shopify = useAppBridge();
    const navigate = useNavigate();

    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [activeLoader, setActiveLoader] = useState<string | null>(null);

    useEffect(() => {
        if (fetcher.state === "idle") {
            setActiveLoader(null);
        }
    }, [fetcher.state]);

    useEffect(() => {
        if (fetcher.data?.message) {
            let toastMessage = fetcher.data.message;
            if (fetcher.data.success && fetcher.data.date) {
                const formatted = new Date(fetcher.data.date).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                });
                toastMessage = `${fetcher.data.message} to ${formatted}`;
            }
            shopify.toast.show(toastMessage, {
                isError: !fetcher.data.success,
            });
        }
    }, [fetcher.data, shopify]);

    const isSubmitting = fetcher.state === "submitting";



    // ─── No contract found ────────────────────────────────────

    if (!contract) {
        return (
            <Page
                title="Subscription Detail"
                backAction={{ content: "Back", onAction: () => navigate("/app/recurring-subscriptions") }}
            >
                <Layout>
                    {error && (
                        <Layout.Section>
                            <Banner tone="critical" title="Error loading subscription">
                                <p>{error}</p>
                                <Box paddingBlockStart="200">
                                    <Text as="p" variant="bodySm" tone="subdued">
                                        If the contract exists in Shopify Admin but cannot be loaded here,
                                        it may be because the contract was created by a different app.
                                        This app can only access contracts it created (due to <code>write_own_subscription_contracts</code> scope).
                                    </Text>
                                </Box>
                            </Banner>
                        </Layout.Section>
                    )}
                    <Layout.Section>
                        <Card>
                            <EmptyState
                                heading="Subscription not found"
                                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                            >
                                <p>
                                    The subscription contract could not be loaded. It may have been
                                    deleted or you may not have permission to access it.
                                </p>
                            </EmptyState>
                        </Card>
                    </Layout.Section>
                </Layout>
            </Page>
        );
    }

    // ─── Helpers ───────────────────────────────────────────────

    const numericId = contract.id.split("/").pop();
    const totalAmount = contract.lines.reduce((sum, line) => {
        return sum + parseFloat(line.currentPrice?.amount ?? "0") * (line.quantity ?? 1);
    }, 0);

    const currency = contract.currencyCode ?? contract.lines[0]?.currentPrice?.currencyCode ?? "USD";
    const fmtCurrency = (amount: number, cur?: string) =>
        new Intl.NumberFormat(undefined, { style: "currency", currency: cur || currency }).format(amount);

    const fmtDate = (d: string | null) => {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const fmtDateTime = (d: string | null) => {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const frequencyLabel = (() => {
        const policy = contract.billingPolicy || contract.deliveryPolicy;
        if (!policy) {
            // Fallback: check local log
            const log = localLogs[0];
            if (log?.frequency) {
                return log.frequency.charAt(0).toUpperCase() + log.frequency.slice(1);
            }
            return "Recurring";
        }
        const interval = policy.interval?.toLowerCase();
        const count = policy.intervalCount || 1;
        if (interval === "week" && count === 1) return "Weekly";
        if (interval === "month" && count === 1) return "Monthly";
        if (interval === "year" && count === 1) return "Yearly";
        return `Every ${count} ${interval}${count > 1 ? "s" : ""}`;
    })();

    const getStatusBadge = (status: string) => {
        switch (status.toUpperCase()) {
            case "ACTIVE":
                return <Badge tone="success">Active</Badge>;
            case "PAUSED":
                return <Badge tone="attention">Paused</Badge>;
            case "CANCELLED":
                return <Badge tone="critical">Cancelled</Badge>;
            case "EXPIRED":
                return <Badge tone="critical">Expired</Badge>;
            case "FAILED":
                return <Badge tone="critical">Failed</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const canPause = contract.status === "ACTIVE";
    const canActivate = contract.status === "PAUSED";
    const canCancel = contract.status === "ACTIVE" || contract.status === "PAUSED";

    const handleAction = (actionType: string) => {
        setActiveLoader(actionType);
        fetcher.submit(
            { _action: actionType, subscriptionId: contract.id },
            { method: "POST" }
        );
    };

    const customerName = contract.customer
        ? `${contract.customer.firstName || ""} ${contract.customer.lastName || ""}`.trim() || "N/A"
        : "N/A";

    const orderNumber = contract.originOrder?.name || "N/A";
    const productNames = contract.lines.map((l) => l.title).join(", ") || "Donation";

    const customerNumericId = contract.customer?.id?.split("/").pop();
    const orderNumericId = contract.originOrder?.id?.split("/").pop();

    const customerLink = contract.customer && customerNumericId ? (
        <a
            href={`https://${shop}/admin/customers/${customerNumericId}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#005bd3", textDecoration: "none", fontWeight: 500 }}
        >
            {customerName}
        </a>
    ) : "N/A";

    const orderLink = contract.originOrder && orderNumericId ? (
        <a
            href={`https://${shop}/admin/orders/${orderNumericId}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#005bd3", textDecoration: "none", fontWeight: 500 }}
        >
            {orderNumber}
        </a>
    ) : "N/A";

    // ─── Render ───────────────────────────────────────────────

    return (
        <Page
            title={`Subscription #${numericId}`}
            subtitle={productNames}
            backAction={{ content: "Subscriptions", onAction: () => navigate("/app/recurring-subscriptions") }}
            titleMetadata={getStatusBadge(contract.status)}
        >
            <Layout>
                {/* Error banner */}
                {error && (
                    <Layout.Section>
                        <Banner tone="warning" title="Partial data loaded">
                            <p>{error}</p>
                        </Banner>
                    </Layout.Section>
                )}

                {/* Action result banner */}
                {fetcher.data && !isSubmitting && (
                    <Layout.Section>
                        <Banner
                            tone={fetcher.data.success ? "success" : "critical"}
                            title={fetcher.data.success ? "Action completed" : "Action failed"}
                        >
                            <p>{fetcher.data.message}</p>
                        </Banner>
                    </Layout.Section>
                )}

                {/* ─── Main Details ───────────────────────────────── */}
                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            <Text variant="headingMd" as="h2">
                                Subscription Details
                            </Text>
                            <DescriptionList
                                items={[
                                    {
                                        term: "Contract ID",
                                        description: (
                                            <Text as="span" variant="bodyMd">
                                                <code>{contract.id}</code>
                                            </Text>
                                        ),
                                    },
                                    {
                                        term: "Status",
                                        description: getStatusBadge(contract.status),
                                    },
                                    {
                                        term: "Amount",
                                        description: (
                                            <Text as="span" fontWeight="semibold" variant="bodyMd">
                                                {fmtCurrency(totalAmount)}
                                            </Text>
                                        ),
                                    },
                                    {
                                        term: "Frequency",
                                        description: frequencyLabel,
                                    },
                                    {
                                        term: "Next Billing Date",
                                        description: (
                                            <Text as="span" variant="bodyMd">
                                                {fmtDate(contract.nextBillingDate)}
                                            </Text>
                                        ),
                                    },
                                    {
                                        term: "Created",
                                        description: fmtDate(contract.createdAt),
                                    },
                                    {
                                        term: "Origin Order",
                                        description: orderLink,
                                    },
                                ]}
                            />
                        </BlockStack>
                    </Card>
                </Layout.Section>

                {/* ─── Customer Info ──────────────────────────────── */}
                <Layout.Section variant="oneHalf">
                    <Card>
                        <BlockStack gap="400">
                            <Text variant="headingMd" as="h2">
                                Customer
                            </Text>
                            {contract.customer ? (
                                <DescriptionList
                                    items={[
                                        { term: "Name", description: customerLink },
                                        {
                                            term: "Email",
                                            description: contract.customer.email || "N/A",
                                        },
                                    ]}
                                />
                            ) : (
                                <Text as="p" tone="subdued">
                                    Customer information not available.
                                </Text>
                            )}
                        </BlockStack>
                    </Card>
                </Layout.Section>

                {/* ─── Line Items ─────────────────────────────────── */}
                <Layout.Section variant="oneHalf">
                    <Card>
                        <BlockStack gap="400">
                            <Text variant="headingMd" as="h2">
                                Subscription Items
                            </Text>
                            {contract.lines.length > 0 ? (
                                <BlockStack gap="300">
                                    {contract.lines.map((line, idx) => (
                                        <Box
                                            key={idx}
                                            padding="300"
                                            borderRadius="200"
                                            background="bg-surface-secondary"
                                        >
                                            <InlineStack align="space-between" blockAlign="center">
                                                <BlockStack gap="100">
                                                    <Text as="span" fontWeight="semibold" variant="bodyMd">
                                                        {line.title}
                                                    </Text>
                                                    {line.variantTitle && (
                                                        <Text as="span" tone="subdued" variant="bodySm">
                                                            {line.variantTitle}
                                                        </Text>
                                                    )}
                                                    {line.sellingPlanName && (
                                                        <Text as="span" tone="subdued" variant="bodySm">
                                                            Plan: {line.sellingPlanName}
                                                        </Text>
                                                    )}
                                                </BlockStack>
                                                <Text as="span" variant="bodyMd">
                                                    {line.quantity} × {fmtCurrency(
                                                        parseFloat(line.currentPrice?.amount || "0"),
                                                        line.currentPrice?.currencyCode
                                                    )}
                                                </Text>
                                            </InlineStack>
                                        </Box>
                                    ))}
                                </BlockStack>
                            ) : (
                                <Text as="p" tone="subdued">
                                    No line items found.
                                </Text>
                            )}
                        </BlockStack>
                    </Card>
                </Layout.Section>

                {/* ─── Actions ────────────────────────────────────── */}
                {(canPause || canActivate || canCancel) && (
                    <Layout.Section>
                        <Card>
                            <BlockStack gap="400">
                                <Text variant="headingMd" as="h2">
                                    Subscription Actions
                                </Text>
                                <InlineStack gap="300">
                                    {canPause && (
                                        <Button
                                            onClick={() => handleAction("pause")}
                                            loading={activeLoader === "pause"}
                                            disabled={activeLoader !== null}
                                        >
                                            ⏸️ Pause Subscription
                                        </Button>
                                    )}
                                    {canActivate && (
                                        <Button
                                            variant="primary"
                                            onClick={() => handleAction("activate")}
                                            loading={activeLoader === "activate"}
                                            disabled={activeLoader !== null}
                                        >
                                            ▶️ Resume Subscription
                                        </Button>
                                    )}
                                    {canCancel && (
                                        <Button
                                            tone="critical"
                                            onClick={() => setCancelModalOpen(true)}
                                            loading={activeLoader === "cancel"}
                                            disabled={activeLoader !== null}
                                        >
                                            🗑️ Cancel Subscription
                                        </Button>
                                    )}
                                </InlineStack>
                            </BlockStack>
                        </Card>
                    </Layout.Section>
                )}


                {/* ─── Billing Attempt History ────────────────────── */}
                {billingAttempts.length > 0 && (
                    <Layout.Section>
                        <Card>
                            <BlockStack gap="400">
                                <Text variant="headingMd" as="h2">
                                    Billing Attempt History
                                </Text>
                                <div style={{ overflowX: "auto" }}>
                                    <table
                                        style={{
                                            width: "100%",
                                            borderCollapse: "collapse",
                                            fontSize: "13px",
                                        }}
                                    >
                                        <thead>
                                            <tr
                                                style={{
                                                    borderBottom: "1px solid #e1e3e5",
                                                    textAlign: "left",
                                                }}
                                            >
                                                <th style={{ padding: "8px 12px", fontWeight: 600 }}>Date</th>
                                                <th style={{ padding: "8px 12px", fontWeight: 600 }}>Status</th>
                                                <th style={{ padding: "8px 12px", fontWeight: 600 }}>Source</th>
                                                <th style={{ padding: "8px 12px", fontWeight: 600 }}>Amount</th>
                                                <th style={{ padding: "8px 12px", fontWeight: 600 }}>Retry #</th>
                                                <th style={{ padding: "8px 12px", fontWeight: 600 }}>Order</th>
                                                <th style={{ padding: "8px 12px", fontWeight: 600 }}>Error</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {billingAttempts.map((attempt: any) => (
                                                <tr
                                                    key={attempt.id}
                                                    style={{ borderBottom: "1px solid #f1f2f3" }}
                                                >
                                                    <td style={{ padding: "8px 12px" }}>
                                                        {fmtDateTime(attempt.createdAt)}
                                                    </td>
                                                    <td style={{ padding: "8px 12px" }}>
                                                        {attempt.status === "success" ? (
                                                            <Badge tone="success">Success</Badge>
                                                        ) : attempt.status === "failed" ? (
                                                            <Badge tone="critical">Failed</Badge>
                                                        ) : (
                                                            <Badge>{attempt.status}</Badge>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: "8px 12px" }}>{attempt.source}</td>
                                                    <td style={{ padding: "8px 12px" }}>
                                                        {fmtCurrency(attempt.amount, attempt.currency)}
                                                    </td>
                                                    <td style={{ padding: "8px 12px" }}>{attempt.retryNumber}</td>
                                                    <td style={{ padding: "8px 12px" }}>
                                                        {attempt.orderNumber || "—"}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: "8px 12px",
                                                            color: "#b91c1c",
                                                            maxWidth: "200px",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                        title={attempt.errorMessage || ""}
                                                    >
                                                        {attempt.errorMessage || "—"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </BlockStack>
                        </Card>
                    </Layout.Section>
                )}

                {/* ─── Local Donation Logs ─────────────────────────── */}
                {localLogs.length > 0 && (
                    <Layout.Section>
                        <Card>
                            <BlockStack gap="400">
                                <Text variant="headingMd" as="h2">
                                    Donation Activity Log
                                </Text>
                                <div style={{ overflowX: "auto" }}>
                                    <table
                                        style={{
                                            width: "100%",
                                            borderCollapse: "collapse",
                                            fontSize: "13px",
                                        }}
                                    >
                                        <thead>
                                            <tr
                                                style={{
                                                    borderBottom: "1px solid #e1e3e5",
                                                    textAlign: "left",
                                                }}
                                            >
                                                <th style={{ padding: "8px 12px", fontWeight: 600 }}>Date</th>
                                                <th style={{ padding: "8px 12px", fontWeight: 600 }}>Order</th>
                                                <th style={{ padding: "8px 12px", fontWeight: 600 }}>Amount</th>
                                                <th style={{ padding: "8px 12px", fontWeight: 600 }}>Frequency</th>
                                                <th style={{ padding: "8px 12px", fontWeight: 600 }}>Status</th>
                                                <th style={{ padding: "8px 12px", fontWeight: 600 }}>Receipt</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {localLogs.map((log: any) => (
                                                <tr
                                                    key={log.id}
                                                    style={{ borderBottom: "1px solid #f1f2f3" }}
                                                >
                                                    <td style={{ padding: "8px 12px" }}>
                                                        {fmtDateTime(log.createdAt)}
                                                    </td>
                                                    <td style={{ padding: "8px 12px" }}>
                                                        {log.orderNumber || "—"}
                                                    </td>
                                                    <td style={{ padding: "8px 12px" }}>
                                                        {fmtCurrency(log.donationAmount, log.currency)}
                                                    </td>
                                                    <td style={{ padding: "8px 12px" }}>
                                                        {(log.frequency || "one_time").replace("_", " ")}
                                                    </td>
                                                    <td style={{ padding: "8px 12px" }}>
                                                        {log.status === "active" ? (
                                                            <Badge tone="success">Active</Badge>
                                                        ) : log.status === "paused" ? (
                                                            <Badge tone="attention">Paused</Badge>
                                                        ) : log.status === "cancelled" ? (
                                                            <Badge tone="critical">Cancelled</Badge>
                                                        ) : (
                                                            <Badge>{log.status}</Badge>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: "8px 12px" }}>
                                                        {log.receiptStatus === "sent" ? (
                                                            <Badge tone="success">Sent</Badge>
                                                        ) : (
                                                            <Badge>{log.receiptStatus}</Badge>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </BlockStack>
                        </Card>
                    </Layout.Section>
                )}

                {/* ─── No activity state ──────────────────────────── */}
                {localLogs.length === 0 && billingAttempts.length === 0 && (
                    <Layout.Section>
                        <Card>
                            <Box padding="400">
                                <Text as="p" tone="subdued" alignment="center">
                                    No billing attempts or donation activity logs found for this subscription yet.
                                </Text>
                            </Box>
                        </Card>
                    </Layout.Section>
                )}
            </Layout>

            {/* ─── Cancel Confirmation Modal ──────────────────── */}
            <Modal
                open={cancelModalOpen}
                onClose={() => setCancelModalOpen(false)}
                title="Cancel Subscription"
                primaryAction={{
                    content: "Yes, Cancel Subscription",
                    destructive: true,
                    loading: activeLoader === "cancel",
                    onAction: () => {
                        handleAction("cancel");
                        setCancelModalOpen(false);
                    },
                }}
                secondaryActions={[
                    {
                        content: "Keep Subscription",
                        onAction: () => setCancelModalOpen(false),
                    },
                ]}
            >
                <Modal.Section>
                    <BlockStack gap="300">
                        <Text as="p">
                            Are you sure you want to cancel this subscription? This action cannot be undone.
                        </Text>
                        <Text as="p" tone="subdued">
                            The customer will receive a cancellation email notification, and no further billing
                            attempts will be made.
                        </Text>
                    </BlockStack>
                </Modal.Section>
            </Modal>
        </Page>
    );
}
