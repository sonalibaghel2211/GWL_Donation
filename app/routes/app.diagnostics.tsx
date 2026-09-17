import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  BlockStack,
  Banner,
  List,
  Box,
} from "@shopify/polaris";
import shopify, { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Check current webhooks via GraphQL
  const response = await admin.graphql(
    `#graphql
    query {
      webhookSubscriptions(first: 50) {
        edges {
          node {
            id
            topic
            endpoint {
              __typename
              ... on WebhookHttpEndpoint {
                callbackUrl
              }
            }
          }
        }
      }
      subscriptionContracts(first: 5, reverse: true) {
        edges {
          node {
            id
            status
            originOrder {
              name
            }
          }
        }
      }
    }`
  );

  const jsonResponse = await response.json();
  const webhooks = jsonResponse.data?.webhookSubscriptions?.edges?.map((e: any) => e.node) || [];
  const nativeContracts = jsonResponse.data?.subscriptionContracts?.edges?.map((e: any) => e.node) || [];

  // Get local DB sync logs
  const syncLogs = await db.recurringDonationLog.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      orderId: true,
      orderNumber: true,
      subscriptionContractId: true,
      createdAt: true,
    }
  });

  return {
    shop: session.shop,
    scopes: session.scope,
    webhooks,
    nativeContracts,
    syncLogs,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "register") {
    try {
      const results = await shopify.registerWebhooks({ session });
      return { success: true, message: "Webhook registration attempt completed. Check server logs." };
    } catch (e: any) {
      return { success: false, message: `Registration failed: ${e.message}` };
    }
  }

  if (action === "sync") {
    try {
      // Find all records with NULL contract ID
      const pending = await db.recurringDonationLog.findMany({
        where: { shop: session.shop, subscriptionContractId: null },
        take: 20
      });

      if (pending.length === 0) return { success: true, message: "No pending records found." };

      let syncCount = 0;
      
      // Fetch recent contracts from Shopify to match
      const response = await admin.graphql(
        `#graphql
        query {
          subscriptionContracts(first: 50, reverse: true) {
            edges {
              node {
                id
                originOrder {
                  id
                  name
                }
              }
            }
          }
        }`
      );
      const json = await response.json();
      const contracts = json.data?.subscriptionContracts?.edges?.map((e: any) => e.node) || [];

      for (const log of pending) {
        const match = contracts.find((c: any) => 
          c.originOrder?.id === log.orderId || 
          c.originOrder?.name === log.orderNumber
        );

        if (match) {
          await db.recurringDonationLog.update({
            where: { orderId: log.orderId },
            data: { subscriptionContractId: match.id }
          });
          syncCount++;
        }
      }

      return { success: true, message: `Successfully synced ${syncCount} of ${pending.length} pending records.` };
    } catch (e: any) {
      return { success: false, message: `Sync failed: ${e.message}` };
    }
  }

  return { success: false, message: "Unknown action" };
};

export default function DiagnosticsPage() {
  const { shop, scopes, webhooks, nativeContracts, syncLogs } = useLoaderData<typeof loader>();
  const syncFetcher = useFetcher<any>();
  const webhookFetcher = useFetcher<any>();

  const isSyncing = syncFetcher.state !== "idle";
  const isRegistering = webhookFetcher.state !== "idle";

  return (
    <Page title="App Diagnostics">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Store Information</Text>
              <Text as="p"><strong>Shop:</strong> {shop}</Text>
              <Box paddingBlockStart="200">
                <Text as="p"><strong>Active Scopes:</strong></Text>
                <Text as="p" tone="subdued">{scopes}</Text>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Banner tone="info" title="About Subscription Scopes">
            <p>
              This app uses <code>write_own_subscription_contracts</code> scope, which means <strong>only this app</strong> can
              query and manage subscription contracts it created. If you test queries in Shopify's GraphiQL app or another tool,
              contracts will appear empty or return "invalid" — this is expected behavior, not a bug.
              The contracts shown below are fetched by this app's own authenticated API and confirm everything is working correctly.
            </p>
          </Banner>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card title="Raw Shopify Contracts">
             <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Native Shopify API Data</Text>
                <Text as="p" tone="subdued">Top 5 recent contracts from Shopify GraphQL</Text>
                {nativeContracts.length > 0 ? (
                  <List type="bullet">
                    {nativeContracts.map((c: any) => (
                      <List.Item key={c.id}>
                        <strong>Order {c.originOrder?.name || "N/A"}:</strong> <br/>
                        <code>{c.id}</code> ({c.status})
                      </List.Item>
                    ))}
                  </List>
                ) : (
                  <Text as="p" tone="critical">No native contracts returned from Shopify API.</Text>
                )}
             </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="400">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="headingMd" as="h2">Database Sync Logs</Text>
                <syncFetcher.Form method="post">
                  <input type="hidden" name="action" value="sync" />
                  <Button 
                    variant="primary" 
                    loading={isSyncing}
                    submit
                  >
                    Sync All Missing Contracts
                  </Button>
                </syncFetcher.Form>
              </div>

              {syncFetcher.data?.message && (
                <Banner tone={syncFetcher.data.success ? "success" : "critical"}>
                  <p>{syncFetcher.data.message}</p>
                </Banner>
              )}

              <Text as="p" tone="subdued">Latest 10 records in recurringDonationLog</Text>
              {syncLogs.length > 0 ? (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <List type="bullet">
                    {syncLogs.map((log: any, i: number) => (
                      <List.Item key={i}>
                        <strong>Order Name: {log.orderNumber || "N/A"}</strong><br/>
                        <Text as="span" tone="subdued">DB OrderID: {log.orderId || "MISSING"}</Text><br/>
                        {log.subscriptionContractId ? (
                          <Text as="span" tone="success">Synced: <code>{log.subscriptionContractId}</code></Text>
                        ) : (
                          <Text as="span" tone="critical">Sync Pending (NULL)</Text>
                        )}
                      </List.Item>
                    ))}
                  </List>
                </div>
              ) : (
                <Text as="p" tone="subdued">No local logs found.</Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="headingMd" as="h2">Registered Webhooks</Text>
                <webhookFetcher.Form method="post">
                  <input type="hidden" name="action" value="register" />
                  <Button 
                    variant="primary" 
                    loading={isRegistering}
                    submit
                  >
                    Force Webhook Registration
                  </Button>
                </webhookFetcher.Form>
              </div>

              {webhookFetcher.data?.message && (
                <Banner tone={webhookFetcher.data.success ? "success" : "critical"}>
                  <p>{webhookFetcher.data.message}</p>
                </Banner>
              )}

              <List type="bullet">
                {webhooks.map((wh: any) => (
                  <List.Item key={wh.id}>
                    <strong>{wh.topic}</strong> → {wh.endpoint.callbackUrl || wh.endpoint.__typename}
                  </List.Item>
                ))}
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
