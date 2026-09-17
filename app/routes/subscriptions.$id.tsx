import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  let liquid: any;
  let admin: any;
  let shop = "";

  try {
    const authResult = await authenticate.public.appProxy(request);
    liquid = authResult.liquid;
    admin = authResult.admin;
    shop = authResult.session?.shop || "";
  } catch (authErr) {
    console.error("[SubscriptionDetailAppProxy] Auth Error:", authErr);
    let errorMessage = authErr instanceof Error ? authErr.message : String(authErr);
    if (authErr instanceof Response) {
      errorMessage = `Shopify AppProxy authentication threw a Response with Status ${authErr.status}. This usually means proxy verification failed due to signature mismatch, incorrect app client secret in env variables, or missing offline session.`;
    }
    return new Response(
      `
      <div style="max-width:700px;margin:60px auto;font-family:sans-serif;padding:0 24px;text-align:center;">
        <h2 style="color:#dc2626;font-size:24px;margin-bottom:8px;">App Proxy Authentication Failed</h2>
        <p style="color:#555;margin:0 0 24px;font-size:15px;">Your store could not authenticate the app proxy request.</p>
        <div style="background:#fee2e2;border:1px solid #fecaca;color:#991b1b;padding:20px;border-radius:8px;text-align:left;font-family:monospace;margin-top:16px;">
          <strong style="display:block;margin-bottom:8px;font-size:14px;">Error Details:</strong>
          <pre style="margin:0;white-space:pre-wrap;font-size:13px;line-height:1.5;">${errorMessage}</pre>
        </div>
      </div>
      `,
      {
        status: 200,
        headers: { "Content-Type": "text/html" }
      }
    );
  }
  const url = new URL(request.url);
  const customerId = url.searchParams.get("logged_in_customer_id");
  const subscriptionId = params.id;
  const successMsg = url.searchParams.get("success");
  const errorMsg = url.searchParams.get("error");

  // ── Check merchant plan is active ──
  try {
    const planSub = await prisma.planSubscription.findUnique({ where: { shop } });
    if (!planSub || planSub.status !== "active") {
      return liquid(`
        <div style="max-width:600px;margin:60px auto;font-family:sans-serif;text-align:center;">
          <h2>Service Unavailable</h2>
          <p style="color:#666;">Subscription management is currently unavailable. Please try again later.</p>
        </div>
      `);
    }
  } catch (e) {
    // If plan check fails, allow access (fail-open for plan check only)
    console.error("[SubscriptionDetail] Plan check error:", e);
  }

  if (!customerId) {
    return liquid(`
      <div style="max-width:600px;margin:60px auto;font-family:sans-serif;text-align:center;">
        <h2>Please log in</h2>
        <a href="{{ routes.account_login_url }}">Log In</a>
      </div>
    `);
  }

  // ── Verify customer ID is real ──
  try {
    const customerCheckRes = await admin.graphql(
      `#graphql
      query verifyCustomerExists($id: ID!) {
        customer(id: $id) { id }
      }`,
      { variables: { id: `gid://shopify/Customer/${customerId}` } }
    );
    const customerCheckJson: any = await customerCheckRes.json();
    if (!customerCheckJson?.data?.customer?.id) {
      return new Response(
        `
        <div style="max-width:700px;margin:40px auto;text-align:center;font-family:sans-serif;">
          <h2 style="color:#d32f2f;">Access Denied</h2>
          <p>Invalid customer identity. Please log in to your account.</p>
          <a href="/account/login" style="color:#6C4A79;text-decoration:none;">Log In</a>
        </div>
        `,
        { status: 403, headers: { "Content-Type": "text/html" } }
      );
    }
  } catch (custErr) {
    console.error("[SubscriptionDetail] Customer verification failed:", custErr);
    return new Response(
      `
      <div style="max-width:700px;margin:40px auto;text-align:center;font-family:sans-serif;">
        <h2 style="color:#d32f2f;">Access Denied</h2>
        <p>Could not verify your identity. Please log in to your account.</p>
        <a href="/account/login" style="color:#6C4A79;text-decoration:none;">Log In</a>
      </div>
      `,
      { status: 403, headers: { "Content-Type": "text/html" } }
    );
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
          customer {
            id
          }
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
          customerPaymentMethod {
            id
            instrument {
              __typename
              ... on CustomerCreditCard {
                brand
                lastDigits
                expiryMonth
                expiryYear
              }
              ... on CustomerPaypalBillingAgreement {
                paypalAccountEmail
              }
            }
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
          <a href="/apps/smart-donate-enhancement/subscriptions?logged_in_customer_id=${customerId}">← Back</a>
        </div>
      `);
    }

    const contractCustomerId = contract.customer?.id;
    const requestedCustomerGid = `gid://shopify/Customer/${customerId}`;

    if (!contractCustomerId || contractCustomerId !== requestedCustomerGid) {
      return new Response(
        `
        <div style="max-width:700px;margin:40px auto;text-align:center;font-family:sans-serif;">
          <h2 style="color:#d32f2f;">Access Denied</h2>
          <p>You do not have permission to view or manage this subscription.</p>
          <a href="/apps/smart-donate-enhancement/subscriptions?logged_in_customer_id=${customerId}" style="color:#6C4A79;text-decoration:none;">← Back to Subscriptions</a>
        </div>
        `,
        {
          status: 403,
          headers: { "Content-Type": "text/html" }
        }
      );
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

    const paymentMethod = contract.customerPaymentMethod;
    let paymentMethodString = "No payment method on file";
    if (paymentMethod?.instrument) {
      const type = paymentMethod.instrument.__typename;
      if (type === "CustomerCreditCard") {
        const { brand, lastDigits, expiryMonth, expiryYear } = paymentMethod.instrument;
        paymentMethodString = `${brand ? brand.toUpperCase() : "Card"} ending in ${lastDigits || "****"} (expires ${expiryMonth}/${expiryYear})`;
      } else if (type === "CustomerPaypalBillingAgreement") {
        const email = paymentMethod.instrument.paypalAccountEmail;
        paymentMethodString = email ? `PayPal (${email})` : `PayPal Account`;
      } else {
        paymentMethodString = "Linked payment account";
      }
    }

    const canPause = contract.status === "ACTIVE";
    const canActivate = contract.status === "PAUSED";
    const canCancel = contract.status === "ACTIVE" || contract.status === "PAUSED";

    const html = `
      <div style="max-width:700px;margin:40px auto;font-family:sans-serif;padding:0 16px;">
        <div style="margin-bottom:20px;">
          <a href="/apps/smart-donate-enhancement/subscriptions?logged_in_customer_id=${customerId}" style="color:#555;text-decoration:none;">← Back to Subscriptions</a>
        </div>

        ${successMsg ? `
          <div id="subscription-success-msg" style="position:relative;background:#d1fae5;color:#065f46;padding:12px 40px 12px 12px;border-radius:8px;margin-bottom:20px;transition:opacity 0.5s ease;display:flex;align-items:center;">
            <span style="flex:1;">✓ ${successMsg}</span>
            <button type="button" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:#065f46;font-size:20px;cursor:pointer;padding:4px;line-height:1;">&times;</button>
          </div>
        ` : ''}
        
        ${errorMsg ? `
          <div id="subscription-error-msg" style="position:relative;background:#fee2e2;color:#991b1b;padding:12px 40px 12px 12px;border-radius:8px;margin-bottom:20px;transition:opacity 0.5s ease;display:flex;align-items:center;">
            <span style="flex:1;">✗ ${errorMsg}</span>
            <button type="button" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:#991b1b;font-size:20px;cursor:pointer;padding:4px;line-height:1;">&times;</button>
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
            <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
              <span style="color:#666;">Started:</span>
              <span>${fmtDate(contract.createdAt)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:#666;">Payment Method:</span>
              <span>${paymentMethodString}</span>
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

        ${paymentMethod?.id ? `
          <div style="margin-top:16px;">
            <form method="POST">
              <input type="hidden" name="_action" value="update_payment_method">
              <input type="hidden" name="customerPaymentMethodId" value="${paymentMethod.id}">
              <button type="submit" style="width:100%;padding:12px;background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
                💳 Update Payment Method
              </button>
            </form>
          </div>
        ` : ''}
      </div>
    `;

    const finalHtml = `
      ${html}
      <script>
        (function() {
          function setupMsg(id) {
            var el = document.getElementById(id);
            if (!el) return;
            
            // Auto-hide after 5 seconds
            setTimeout(function() {
              el.style.opacity = '0';
              setTimeout(function() { el.style.display = 'none'; }, 500);
            }, 5000);
            
            // Close button handler
            var btn = el.querySelector('button');
            if (btn) {
              btn.onclick = function() { el.style.display = 'none'; };
            }
          }
          
          setupMsg('subscription-success-msg');
          setupMsg('subscription-error-msg');
          
          // Clean URL parameters
          if (window.history.replaceState) {
            var url = new URL(window.location.href);
            var changed = false;
            if (url.searchParams.has('success')) { url.searchParams.delete('success'); changed = true; }
            if (url.searchParams.has('error')) { url.searchParams.delete('error'); changed = true; }
            if (changed) {
              window.history.replaceState({}, '', url.toString());
            }
          }
        })();
      </script>
    `;

    return liquid(finalHtml);
  } catch (err) {
    console.error("Error:", err);
    return liquid(`
      <div style="max-width:700px;margin:40px auto;text-align:center;">
        <h2>Error loading subscription</h2>
        <p style="color:#666;">${err instanceof Error ? err.message : 'Unknown error'}</p>
        <a href="/apps/smart-donate-enhancement/subscriptions?logged_in_customer_id=${customerId}">← Back to Subscriptions</a>
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

  if (!customerId) {
    return new Response("Missing customer authentication", { status: 401 });
  }

  // Verify customer ownership of the subscription contract
  try {
    const fullGid = `gid://shopify/SubscriptionContract/${subscriptionId}`;
    const checkResponse = await admin.graphql(
      `#graphql
      query verifyContractOwner($id: ID!) {
        subscriptionContract(id: $id) {
          customer {
            id
          }
        }
      }`,
      { variables: { id: fullGid } }
    );
    const checkJson: any = await checkResponse.json();
    const contract = checkJson?.data?.subscriptionContract;
    if (!contract) {
      return new Response("Subscription not found", { status: 404 });
    }
    const contractCustomerId = contract.customer?.id;
    const requestedCustomerGid = `gid://shopify/Customer/${customerId}`;
    if (!contractCustomerId || contractCustomerId !== requestedCustomerGid) {
      return new Response("Forbidden: You do not own this subscription", { status: 403 });
    }
  } catch (err) {
    console.error("Verification error:", err);
    return new Response("Verification error", { status: 500 });
  }

  const formData = await request.formData();
  const actionType = formData.get("_action") as any;

  try {
    if (actionType === "update_payment_method") {
      const customerPaymentMethodId = formData.get("customerPaymentMethodId") as string;
      if (!customerPaymentMethodId) {
        throw new Error("No customer payment method found for this subscription.");
      }

      const response = await admin.graphql(
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
      const json = await response.json();
      const errors = json.data?.customerPaymentMethodSendUpdateEmail?.userErrors || [];

      if (errors.length > 0) {
        throw new Error(errors[0].message);
      }

      return new Response(null, {
        status: 302,
        headers: {
          Location: `/apps/smart-donate-enhancement/subscriptions/${subscriptionId}?logged_in_customer_id=${customerId}&success=${encodeURIComponent("Update payment link has been sent to your email.")}`,
        },
      });
    }

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
        Location: `/apps/smart-donate-enhancement/subscriptions/${subscriptionId}?logged_in_customer_id=${customerId}&success=${encodeURIComponent(result.message)}`,
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to update subscription";
    console.error(`Failed to ${actionType}:`, err);

    return new Response(null, {
      status: 302,
      headers: {
        Location: `/apps/smart-donate-enhancement/subscriptions/${subscriptionId}?logged_in_customer_id=${customerId}&error=${encodeURIComponent(errorMessage)}`,
      },
    });
  }
};