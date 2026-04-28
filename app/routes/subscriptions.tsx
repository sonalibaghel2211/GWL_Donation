import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { liquid, admin } = await authenticate.public.appProxy(request);

  if (!admin) {
    return liquid(`
      <div style="max-width:600px;margin:60px auto;font-family:sans-serif;text-align:center;">
        <h2>Error: Store connection not found or app unauthenticated.</h2>
      </div>
    `);
  }

  const url = new URL(request.url);
  const customerId = url.searchParams.get("logged_in_customer_id");

  if (!customerId) {
    return liquid(`
      <div style="max-width:600px;margin:60px auto;font-family:sans-serif;text-align:center;padding:0 16px;">
        <h2 style="margin:0 0 8px;font-size:20px;color:#222;">Please log in to continue</h2>
        <p style="color:#666;margin:0 0 24px;">You need to be logged in to view your subscriptions.</p>
        <a href="{{ routes.account_login_url }}" style="display:inline-block;padding:10px 24px;background:#000;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Log In</a>
      </div>
    `);
  }

  const customerGid = `gid://shopify/Customer/${customerId}`;
  let contracts: any[] = [];

  try {
    const response = await admin.graphql(
      `#graphql
      query getCustomerSubscriptions($customerId: ID!) {
        customer(id: $customerId) {
          displayName
          subscriptionContracts(first: 20) {
            edges {
              node {
                id
                status
                createdAt
                nextBillingDate
                currencyCode
                lines(first: 10) {
                  edges {
                    node {
                      title
                      quantity
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
        }
      }`,
      { variables: { customerId: customerGid } }
    );

    const json: any = await response.json();

    if (json.errors) {
      console.error("GraphQL Errors:", json.errors);
      return liquid(`
        <div style="max-width:700px;margin:40px auto;font-family:sans-serif;padding:0 16px;">
          <h2 style="margin:0 0 8px;font-size:22px;color:#991b1b;">Error accessing subscriptions</h2>
          <div style="background:#fee2e2;border:1px solid #f87171;color:#991b1b;padding:16px;border-radius:8px;">
            <p style="margin:0 0 8px;font-weight:bold;">${json.errors[0]?.message}</p>
            <p style="margin:0;font-size:14px;">If you see an "Access denied" error, it means your app has not been granted the required subscription permissions. Please add the subscription scopes to <code>shopify.app.toml</code> and request access to the Subscription API in the Shopify Partner Dashboard.</p>
          </div>
        </div>
      `);
    }

    contracts =
      json?.data?.customer?.subscriptionContracts?.edges?.map(
        (e: any) => e.node
      ) ?? [];

    contracts.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (err) {
    console.error("Failed to fetch subscription contracts:", err);
  }

  const badgeStyle = (status: string) => {
    const map: Record<string, string> = {
      active: "background:#d1fae5;color:#065f46;",
      paused: "background:#fef3c7;color:#92400e;",
      cancelled: "background:#fee2e2;color:#991b1b;",
      pending: "background:#e0e7ff;color:#3730a3;",
      failed: "background:#fee2e2;color:#991b1b;",
      expired: "background:#f3f4f6;color:#6b7280;",
    };
    return map[status?.toLowerCase()] ?? "background:#f3f4f6;color:#374151;";
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

  const fmtDateShort = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });

  let html = `
    <div style="max-width:700px;margin:40px auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:0 16px;color:#111;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <div>
          <h2 style="margin:0 0 4px;font-size:22px;font-weight:700;">My Subscriptions</h2>
          <p style="margin:0;color:#666;font-size:14px;">Manage your active donation subscriptions</p>
        </div>
        <a href="{{ routes.account_url }}" style="font-size:13px;color:#555;text-decoration:none;">← Back to Account</a>
      </div>
  `;

  if (!contracts.length) {
    html += `
      <div style="text-align:center;padding:48px 24px;border:1px dashed #ddd;border-radius:12px;color:#888;">
        <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#ccc" style="margin-bottom:12px;">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p style="margin:0;font-size:15px;">No subscriptions found.</p>
        <p style="margin:8px 0 0;font-size:13px;">Your donation subscriptions will appear here once created.</p>
      </div>
    `;
  } else {
    for (const contract of contracts) {
      const lines = contract.lines?.edges?.map((e: any) => e.node) ?? [];
      const subscriptionNumericId = contract.id.split('/').pop();
      const orderNumber = contract.originOrder?.name || 'N/A';

      const total = lines.reduce((sum: number, line: any) => {
        return sum + (parseFloat(line.currentPrice?.amount ?? "0") * (line.quantity ?? 1));
      }, 0);

      const currency = contract.currencyCode ?? lines[0]?.currentPrice?.currencyCode ?? "USD";
      const nextBilling = contract.nextBillingDate ? fmtDate(contract.nextBillingDate) : "—";
      const createdAt = fmtDateShort(contract.createdAt);

      const productTitles = lines
        .map((l: any) => `${l.quantity > 1 ? l.quantity + "× " : ""}${l.title}`)
        .join(", ");

      html += `
        <div style="border:1px solid #e5e5e5;border-radius:12px;padding:20px;margin-bottom:16px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
            <div>
              <div style="font-size:15px;font-weight:600;margin-bottom:4px;">${productTitles}</div>
              <div style="font-size:12px;color:#888;">Order ${orderNumber} • Since ${createdAt}</div>
            </div>
            <span style="display:inline-block;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;text-transform:capitalize;${badgeStyle(contract.status)}">
              ${contract.status.toLowerCase()}
            </span>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:16px;">
            <div>
              <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Amount</div>
              <div style="font-size:14px;font-weight:500;">${currency} ${total.toFixed(2)}</div>
            </div>
            <div>
              <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Next Billing</div>
              <div style="font-size:14px;font-weight:500;">${nextBilling}</div>
            </div>
          </div>
          
          <div style="margin-top:8px;padding-top:12px;border-top:1px solid #f0f0f0;">
            <a href="/apps/pos-donation/subscriptions/${subscriptionNumericId}?logged_in_customer_id=${customerId}" 
               style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:#f3f4f6;color:#374151;border-radius:8px;text-decoration:none;font-size:13px;font-weight:500;">
              View Details → 
            </a>
          </div>
        </div>
      `;
    }
  }

  html += `</div>`;
  return liquid(html);
};