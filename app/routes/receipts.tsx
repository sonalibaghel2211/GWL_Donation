import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import {
    fetchDonationsByOrderIds,
    normalizeOrderIdToNumeric,
} from "../utils/donation-helpers.server";

import { hasActiveSubscription } from "../utils/features";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const url = new URL(request.url);

    const isProxyRequest = url.searchParams.has("signature");
    if (!isProxyRequest) {
        await authenticate.admin(request);
        return redirect("/app/donation-activity");
    }

    let liquid: any;
    let admin: any;
    let session: any;

    try {
        const authResult = await authenticate.public.appProxy(request);
        liquid = authResult.liquid;
        admin = authResult.admin;
        session = authResult.session;
    } catch (authErr) {
        console.error("[ReceiptsAppProxy] Auth Error:", authErr);
        let errorMessage = authErr instanceof Error ? authErr.message : String(authErr);
        if (authErr instanceof Response) {
            errorMessage = `Shopify AppProxy authentication threw a Response with Status ${authErr.status}. This usually means proxy verification failed.`;
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
            { status: 200, headers: { "Content-Type": "text/html" } }
        );
    }

    if (!admin) {
        return liquid(`
            <div style="max-width:600px;margin:60px auto;font-family:sans-serif;text-align:center;">
                <h2>Error: Store connection not found or app unauthenticated.</h2>
            </div>
        `);
    }

    const customerId = url.searchParams.get("logged_in_customer_id");
    const shop = session?.shop || "";

    // ── Check merchant plan is active and has receipt download feature ──
    try {
        const planSub = await prisma.planSubscription.findUnique({ where: { shop } });
        if (!hasActiveSubscription(planSub, "canDownloadReceipt")) {
            return liquid(`
                <div style="max-width:600px;margin:60px auto;font-family:sans-serif;text-align:center;">
                    <h2>Service Unavailable</h2>
                    <p style="color:#666;">Donation receipt downloads are available on Advanced and Pro plans.</p>
                </div>
            `);
        }
    } catch (e) {
        console.error("[Receipts] Plan check error:", e);
    }

    if (!customerId) {
        return liquid(`
            <div style="max-width:600px;margin:60px auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;padding:0 16px;">
                <div style="margin-bottom:24px;">
                    <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#999" style="margin-bottom:12px;">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                </div>
                <h2 style="margin:0 0 8px;font-size:20px;color:#222;">Please log in to continue</h2>
                <p style="color:#666;margin:0 0 24px;">You need to be logged in to view your donation receipts.</p>
                <a href="{{ routes.account_login_url }}" style="display:inline-block;padding:10px 24px;background:#000;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Log In</a>
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
        console.error("[Receipts] Customer verification failed:", custErr);
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

    const customerGid = `gid://shopify/Customer/${customerId}`;
    let orderIds: string[] = [];
    let contracts: any[] = [];
    let orderMap: Map<string, { name: string; email: string }> = new Map();

    try {
        const response = await admin.graphql(
            `#graphql
            query getCustomerOrdersAndSubscriptions($customerId: ID!) {
                customer(id: $customerId) {
                    displayName
                    orders(first: 50, sortKey: CREATED_AT, reverse: true) {
                        edges {
                            node {
                                id
                                name
                                email
                            }
                        }
                    }
                    subscriptionContracts(first: 50) {
                        edges {
                            node {
                                id
                                status
                                lines(first: 10) {
                                    edges {
                                        node {
                                            title
                                            quantity
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
            console.error("[ReceiptsAppProxy] GraphQL Errors:", json.errors);
            return liquid(`
                <div style="max-width:700px;margin:40px auto;font-family:sans-serif;padding:0 16px;">
                    <h2 style="margin:0 0 8px;font-size:22px;color:#991b1b;">Error accessing orders</h2>
                    <div style="background:#fee2e2;border:1px solid #f87171;color:#991b1b;padding:16px;border-radius:8px;">
                        <p style="margin:0;font-weight:bold;">${json.errors[0]?.message || "Unknown error"}</p>
                    </div>
                </div>
            `);
        }

        const orders = json?.data?.customer?.orders?.edges?.map((e: any) => e.node) ?? [];
        contracts = json?.data?.customer?.subscriptionContracts?.edges?.map((e: any) => e.node) ?? [];

        for (const order of orders) {
            const numericId = normalizeOrderIdToNumeric(order.id);
            orderIds.push(numericId);
            orderMap.set(numericId, { name: order.name, email: order.email || "" });
            orderMap.set(order.id, { name: order.name, email: order.email || "" });
        }
    } catch (err) {
        console.error("[ReceiptsAppProxy] Failed to fetch customer orders:", err);
    }

    const donations = await fetchDonationsByOrderIds(orderIds, shop);

    const fmtDate = (d: Date | string) =>
        new Date(d).toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric",
        });

    const badgeStyle = (type: string) => {
        const map: Record<string, string> = {
            "Portion of Sale": "background:#e4f0f6;color:#03080e;",
            "Round Up": "background:#fff4e5;color:#965b00;",
            "Preset": "background:#e6fff1;color:#008060;",
            "Recurring (Monthly)": "background:#f4ebf8;color:#6C4A79;",
            "Recurring (Weekly)": "background:#f4ebf8;color:#6C4A79;",
            "One-time": "background:#e6fff1;color:#008060;",
        };
        return map[type] ?? "background:#f3f4f6;color:#374151;";
    };

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            active: "background:#d1fae5;color:#065f46;",
            paused: "background:#fef3c7;color:#92400e;",
            cancelled: "background:#fee2e2;color:#991b1b;",
        };
        return map[status?.toLowerCase()] ?? "background:#f3f4f6;color:#374151;";
    };

    let html = `
        <div style="max-width:700px;margin:40px auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:0 16px;color:#111;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
                <div>
                    <h2 style="margin:0 0 4px;font-size:22px;font-weight:700;">My Donation Receipts</h2>
                    <p style="margin:0;color:#666;font-size:14px;">View and download receipts for all your donations</p>
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <a href="/apps/smart-donate-enhancement/subscriptions?logged_in_customer_id=${customerId}" style="font-size:13px;color:#6C4A79;text-decoration:none;padding:6px 12px;border:1px solid #e5e5e5;border-radius:6px;font-weight:500;">My Subscriptions</a>
                    <a href="{{ routes.account_url }}" style="font-size:13px;color:#555;text-decoration:none;">← Account</a>
                </div>
            </div>
    `;

    if (!donations.length) {
        html += `
            <div style="text-align:center;padding:48px 24px;border:1px dashed #ddd;border-radius:12px;color:#888;">
                <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#ccc" style="margin-bottom:12px;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <p style="margin:0;font-size:15px;">No donation receipts found.</p>
                <p style="margin:8px 0 0;font-size:13px;">Your donation receipts will appear here once you make a donation.</p>
            </div>
        `;
    } else {
        const normalizeId = (id?: string) => {
            if (!id) return "";
            return id.replace("gid://shopify/SubscriptionContract/", "").trim();
        };

        for (const donation of donations) {
            const receiptNumber = `RCP-${donation.id.substring(0, 8).toUpperCase()}`;

            let displayTitle = donation.campaignName || donation.donationType;
            if (donation.donationSource === "recurring") {
                const matchingContract = contracts.find((c: any) => {
                    if (donation.subscriptionContractId) {
                        return normalizeId(c.id) === normalizeId(donation.subscriptionContractId);
                    }
                    const contractOrderId = c.originOrder?.id ? c.originOrder.id.replace("gid://shopify/Order/", "").trim() : "";
                    const donationOrderId = donation.orderId ? donation.orderId.replace("gid://shopify/Order/", "").trim() : "";
                    if (contractOrderId && donationOrderId && contractOrderId === donationOrderId) {
                        return true;
                    }
                    const contractOrderName = c.originOrder?.name || "";
                    if (contractOrderName && donation.orderNumber && contractOrderName === donation.orderNumber) {
                        return true;
                    }
                    return false;
                });

                if (matchingContract) {
                    const lines = matchingContract.lines?.edges?.map((e: any) => e.node) ?? [];
                    const productTitles = lines
                        .map((l: any) => `${l.quantity > 1 ? l.quantity + "× " : ""}${l.title}`)
                        .join(", ");
                    if (productTitles) {
                        displayTitle = productTitles;
                    }
                }
            }

            const isCancelled = donation.status === "cancelled" || donation.status === "refunded";
            const cardBorderStyle = isCancelled ? "border-left:3px solid #dc2626;" : "";

            html += `
                <div style="border:1px solid #e5e5e5;border-radius:12px;padding:20px;margin-bottom:12px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.04);${cardBorderStyle}">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                        <div>
                            <div style="font-size:15px;font-weight:600;margin-bottom:2px;">
                                ${displayTitle}
                            </div>
                            <div style="font-size:12px;color:#888;">
                                Order ${donation.orderNumber} • ${fmtDate(donation.createdAt)}
                            </div>
                            <div style="font-size:11px;color:#aaa;margin-top:2px;">Receipt: ${receiptNumber}</div>
                        </div>
                        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                            ${isCancelled ? `
                            <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#fee2e2;color:#991b1b;letter-spacing:0.5px;">VOID</span>
                            ` : ""}
                            <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;${badgeStyle(donation.donationType)}">
                                ${donation.donationType}
                            </span>
                            ${donation.donationSource === "recurring" ? `
                            <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;text-transform:capitalize;${statusBadge(donation.status)}">
                                ${donation.status}
                            </span>
                            ` : ""}
                        </div>
                    </div>

                    <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid #f0f0f0;">
                        <div>
                            <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">Amount</div>
                            <div style="font-size:18px;font-weight:700;color:${isCancelled ? '#991b1b' : '#6C4A79'};${isCancelled ? 'text-decoration:line-through;' : ''}">$${donation.donationAmount.toFixed(2)}</div>
                        </div>
                        <a href="/apps/smart-donate-enhancement/api/customer/receipt-download?id=${donation.id}&source=${donation.donationSource}&logged_in_customer_id=${customerId}"
                           style="display:inline-flex;align-items:center;gap:6px;padding:10px 20px;background:${isCancelled ? '#991b1b' : '#6C4A79'};color:#fff;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;"
                           onmouseover="this.style.background='${isCancelled ? '#7f1d1d' : '#5a3a66'}'"
                           onmouseout="this.style.background='${isCancelled ? '#991b1b' : '#6C4A79'}'"
                        >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            ${isCancelled ? 'Download Void Receipt' : 'Download Receipt'}
                        </a>
                    </div>
                </div>
            `;
        }
    }

    html += `</div>`;
    return liquid(html);
};
