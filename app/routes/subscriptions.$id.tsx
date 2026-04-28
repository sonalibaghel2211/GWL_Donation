import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { liquid, admin } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const customerId = url.searchParams.get("logged_in_customer_id");
  const subscriptionId = params.id;
  const successMsg = url.searchParams.get("success");
  const errorMsg = url.searchParams.get("error");

  if (!customerId) {
    return liquid(`
      <div style="max-width:600px;margin:60px auto;font-family:sans-serif;text-align:center;">
        <h2>Please log in</h2>
        <a href="{{ routes.account_login_url }}">Log In</a>
      </div>
    `);
  }

  try {
    const fullGid = `gid://shopify/SubscriptionContract/${subscriptionId}`;

    const response = await admin.graphql(
      `#graphql
      query getSubscriptionDetails($id: ID!) {
        subscriptionContract(id: $id) {
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
      }`,
      { variables: { id: fullGid } }
    );

    const json = await response.json();
    const contract = json?.data?.subscriptionContract;

    if (!contract) {
      return liquid(`
        <div style="max-width:700px;margin:40px auto;text-align:center;">
          <h2>Subscription not found</h2>
          <a href="/apps/pos-donation/subscriptions?logged_in_customer_id=${customerId}">← Back</a>
        </div>
      `);
    }

    const lines = contract.lines?.edges?.map((e: any) => e.node) ?? [];
    const total = lines.reduce((sum: number, line: any) => {
      return sum + (parseFloat(line.currentPrice?.amount ?? "0") * (line.quantity ?? 1));
    }, 0);

    const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

    const productNames = lines.map((l: any) => l.title).join(", ");
    const orderNumber = contract.originOrder?.name || 'N/A';

    const canPause = contract.status === "ACTIVE";
    const canActivate = contract.status === "PAUSED";
    const canCancel = contract.status === "ACTIVE" || contract.status === "PAUSED";

    const html = `
      <div style="max-width:700px;margin:40px auto;font-family:sans-serif;padding:0 16px;">
        <div style="margin-bottom:20px;">
          <a href="/apps/pos-donation/subscriptions?logged_in_customer_id=${customerId}" style="color:#555;text-decoration:none;">← Back to Subscriptions</a>
        </div>

        ${successMsg ? `
          <div style="background:#d1fae5;color:#065f46;padding:12px;border-radius:8px;margin-bottom:20px;">
            ✓ ${successMsg}
          </div>
        ` : ''}
        
        ${errorMsg ? `
          <div style="background:#fee2e2;color:#991b1b;padding:12px;border-radius:8px;margin-bottom:20px;">
            ✗ ${errorMsg}
          </div>
        ` : ''}

        <div style="background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:24px;">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:20px;">
            <div>
              <h2 style="margin:0 0 8px;font-size:22px;">Subscription Details</h2>
              <p style="margin:0;color:#666;">${productNames}</p>
              <p style="margin:4px 0 0;color:#999;font-size:12px;">Order ${orderNumber}</p>
            </div>
            <span style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;background:${contract.status === 'ACTIVE' ? '#d1fae5' :
        contract.status === 'PAUSED' ? '#fef3c7' : '#fee2e2'
      };color:${contract.status === 'ACTIVE' ? '#065f46' :
        contract.status === 'PAUSED' ? '#92400e' : '#991b1b'
      }">
              ${contract.status.toLowerCase()}
            </span>
          </div>

          <div style="border-top:1px solid #eee;padding-top:16px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
              <span style="color:#666;">Amount:</span>
              <span style="font-weight:600;">${contract.currencyCode} ${total.toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
              <span style="color:#666;">Next billing:</span>
              <span>${contract.nextBillingDate ? fmtDate(contract.nextBillingDate) : '—'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:#666;">Started:</span>
              <span>${fmtDate(contract.createdAt)}</span>
            </div>
          </div>
        </div>

        <div style="display:flex;gap:12px;margin-top:20px;">
          ${canPause ? `
            <form method="POST" style="flex:1;">
              <input type="hidden" name="_action" value="pause">
              <button type="submit" style="width:100%;padding:12px;background:#fef3c7;color:#92400e;border:1px solid #fde68a;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
                ⏸️ Pause
              </button>
            </form>
          ` : ''}
          
          ${canActivate ? `
            <form method="POST" style="flex:1;">
              <input type="hidden" name="_action" value="activate">
              <button type="submit" style="width:100%;padding:12px;background:#d1fae5;color:#065f46;border:1px solid #a7f3d0;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
                ▶️ Resume
              </button>
            </form>
          ` : ''}
          
          ${canCancel ? `
            <form method="POST" style="flex:1;" onsubmit="return confirm('Cancel this subscription? This cannot be undone.');">
              <input type="hidden" name="_action" value="cancel">
              <button type="submit" style="width:100%;padding:12px;background:#fee2e2;color:#991b1b;border:1px solid #fecaca;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
                🗑️ Cancel
              </button>
            </form>
          ` : ''}
        </div>
      </div>
    `;

    return liquid(html);
  } catch (err) {
    console.error("Error:", err);
    return liquid(`
      <div style="max-width:700px;margin:40px auto;text-align:center;">
        <h2>Error loading subscription</h2>
        <p style="color:#666;">${err instanceof Error ? err.message : 'Unknown error'}</p>
        <a href="/apps/pos-donation/subscriptions?logged_in_customer_id=${customerId}">← Back to Subscriptions</a>
      </div>
    `);
  }
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const url = new URL(request.url);
  const { admin, session } = await authenticate.public.appProxy(request);
  const shop = session?.shop || url.searchParams.get("shop");

  if (!admin) {
    return new Response("Unauthorized", { status: 401 });
  }
  const customerId = url.searchParams.get("logged_in_customer_id");
  const subscriptionId = params.id;

  const formData = await request.formData();
  const actionType = formData.get("_action") as any;

  try {
    const { performSubscriptionAction } = await import("../utils/subscription-actions.server");
    const result = await performSubscriptionAction({
      admin,
      shop: shop || "",
      subscriptionId: subscriptionId!,
      actionType,
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: `/apps/pos-donation/subscriptions/${subscriptionId}?logged_in_customer_id=${customerId}&success=${encodeURIComponent(result.message)}`,
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to update subscription";
    console.error(`Failed to ${actionType}:`, err);

    return new Response(null, {
      status: 302,
      headers: {
        Location: `/apps/pos-donation/subscriptions/${subscriptionId}?logged_in_customer_id=${customerId}&error=${encodeURIComponent(errorMessage)}`,
      },
    });
  }
};