import { useState, useCallback, useEffect } from "react";
import { useLoaderData, Link, useNavigate } from "react-router";
import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get("status") || "all";
    const search = url.searchParams.get("search") || "";
    const contractFilter = url.searchParams.get("contract") || "";

    const where: any = { shop };
    if (statusFilter !== "all") where.status = statusFilter;
    if (search) {
        where.OR = [
            { customerEmail: { contains: search } },
            { customerName: { contains: search } },
            { orderNumber: { contains: search } },
        ];
    }
    if (contractFilter) where.subscriptionContractId = contractFilter;

    const [attempts, counts, recoveryLogs] = await Promise.all([
        prisma.billingAttemptLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 100,
        }),
        Promise.all([
            prisma.billingAttemptLog.count({ where: { shop, status: "failed" } }),
            prisma.billingAttemptLog.count({ where: { shop, status: "success" } }),
            prisma.billingAttemptLog.count({ where: { shop, status: "pending" } }),
            prisma.paymentRecoveryLog.count({ where: { shop, status: "exhausted" } }),
            prisma.paymentRecoveryLog.count({ where: { shop, status: { in: ["pending", "retrying"] } } }),
        ]),
        prisma.paymentRecoveryLog.findMany({
            where: { shop },
            orderBy: { updatedAt: "desc" },
            take: 50,
        }),
    ]);

    return {
        attempts: attempts.map((a: any) => ({ ...a, createdAt: a.createdAt.toISOString() })),
        recoveryLogs: recoveryLogs.map((r: any) => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
            nextRetryDate: r.nextRetryDate?.toISOString() || null,
        })),
        summary: {
            failed: counts[0],
            recovered: counts[1],
            pending: counts[2],
            exhausted: counts[3],
            activeRecoveries: counts[4],
        },
        filters: { status: statusFilter, search, contract: contractFilter },
    };
};

export default function BillingAttemptsPage() {
    const { attempts, recoveryLogs, summary, filters } = useLoaderData<typeof loader>();
    const navigate = useNavigate();

    const [statusFilter, setStatusFilter] = useState(filters.status);
    const [searchQuery, setSearchQuery] = useState(filters.search);
    const [expandedContract, setExpandedContract] = useState<string | null>(filters.contract || null);
    const [activeTab, setActiveTab] = useState<"attempts" | "recovery">("attempts");

    const THEME = "#51395c";

    useEffect(() => {
        setStatusFilter(filters.status);
        setSearchQuery(filters.search);
        setExpandedContract(filters.contract || null);
    }, [filters.status, filters.search, filters.contract]);

    const applyFilters = useCallback(() => {
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (searchQuery) params.set("search", searchQuery);
        if (expandedContract) params.set("contract", expandedContract);
        navigate(`/app/billing-attempts?${params.toString()}`);
    }, [statusFilter, searchQuery, expandedContract, navigate]);

    const viewTimeline = (contractId: string) => {
        const params = new URLSearchParams();
        params.set("contract", contractId);
        navigate(`/app/billing-attempts?${params.toString()}`);
    };

    const clearTimeline = () => {
        navigate("/app/billing-attempts");
    };

    const fmtDate = (d: string) => new Date(d).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

    const shortContract = (id: string) => {
        const num = id.split("/").pop() || id;
        return `#${num}`;
    };

    const statusBadge = (status: string) => {
        const colors: Record<string, { bg: string; fg: string }> = {
            failed: { bg: "#fde8e8", fg: "#c53030" },
            success: { bg: "#e6ffed", fg: "#22863a" },
            pending: { bg: "#fff8e1", fg: "#b7791f" },
            recovered: { bg: "#e6ffed", fg: "#22863a" },
            retrying: { bg: "#fff8e1", fg: "#b7791f" },
            exhausted: { bg: "#fde8e8", fg: "#c53030" },
            fallback_executed: { bg: "#f0e6f6", fg: THEME },
        };
        const c = colors[status] || { bg: "#eee", fg: "#333" };
        return `background:${c.bg};color:${c.fg};padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;text-transform:capitalize;display:inline-block`;
    };

    return (
        <s-page heading="Billing Attempts">
            <div className="ba-layout">
                {/* Summary Cards */}
                <div className="ba-cards">
                    <div className="ba-card">
                        <div className="ba-card-icon" style={{ background: "#fde8e8", color: "#c53030" }}>✕</div>
                        <div className="ba-card-body">
                            <div className="ba-card-value">{summary.failed}</div>
                            <div className="ba-card-label">Failed Attempts</div>
                        </div>
                    </div>
                    <div className="ba-card">
                        <div className="ba-card-icon" style={{ background: "#e6ffed", color: "#22863a" }}>✓</div>
                        <div className="ba-card-body">
                            <div className="ba-card-value">{summary.recovered}</div>
                            <div className="ba-card-label">Recovered</div>
                        </div>
                    </div>
                    <div className="ba-card">
                        <div className="ba-card-icon" style={{ background: "#fff8e1", color: "#b7791f" }}>⏳</div>
                        <div className="ba-card-body">
                            <div className="ba-card-value">{summary.activeRecoveries}</div>
                            <div className="ba-card-label">Active Recoveries</div>
                        </div>
                    </div>
                    <div className="ba-card">
                        <div className="ba-card-icon" style={{ background: "#f0e6f6", color: THEME }}>⚠</div>
                        <div className="ba-card-body">
                            <div className="ba-card-value">{summary.exhausted}</div>
                            <div className="ba-card-label">Exhausted</div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="ba-tabs">
                    <button className={`ba-tab ${activeTab === "attempts" ? "active" : ""}`} onClick={() => setActiveTab("attempts")}>
                        Billing Attempt Log
                    </button>
                    <button className={`ba-tab ${activeTab === "recovery" ? "active" : ""}`} onClick={() => setActiveTab("recovery")}>
                        Recovery Status
                    </button>
                </div>

                {activeTab === "attempts" && (
                    <>
                        {/* Filters */}
                        <div className="ba-filters">
                            <div className="ba-filter-group">
                                <label>Status</label>
                                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                    <option value="all">All Statuses</option>
                                    <option value="failed">Failed</option>
                                    <option value="success">Success</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>
                            <div className="ba-filter-group">
                                <label>Search</label>
                                <input
                                    type="text"
                                    placeholder="Customer email, name, or order #"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                                />
                            </div>
                            <button className="ba-filter-btn" onClick={applyFilters}>Apply</button>
                            {filters.contract && (
                                <button className="ba-filter-btn ba-clear" onClick={clearTimeline}>✕ Clear Timeline</button>
                            )}
                        </div>

                        {filters.contract && (
                            <div className="ba-timeline-banner">
                                <span>📋 Showing retry timeline for contract <strong>{shortContract(filters.contract)}</strong></span>
                            </div>
                        )}

                        {/* Attempts Table */}
                        <div className="ba-table-wrap">
                            {attempts.length === 0 ? (
                                <div className="ba-empty">
                                    <div className="ba-empty-icon">📊</div>
                                    <h3>No billing attempts found</h3>
                                    <p>Billing attempt events will appear here when Shopify triggers recurring billing cycles.</p>
                                </div>
                            ) : (
                                <table className="ba-table">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Customer</th>
                                            <th>Contract</th>
                                            <th>Amount</th>
                                            <th>Retry #</th>
                                            <th>Status</th>
                                            <th>Error</th>
                                            <th>Order</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attempts.map((a: any) => (
                                            <tr key={a.id} className={`ba-row ba-row-${a.status}`}>
                                                <td className="ba-cell-time">{fmtDate(a.createdAt)}</td>
                                                <td>
                                                    <div className="ba-customer">
                                                        <strong>{a.customerName || "—"}</strong>
                                                        <span>{a.customerEmail || "—"}</span>
                                                    </div>
                                                </td>
                                                <td className="ba-cell-mono">{shortContract(a.subscriptionContractId)}</td>
                                                <td className="ba-cell-amount">
                                                    {a.currency} {a.amount.toFixed(2)}
                                                    {a.donationName && <span className="ba-donation-name">{a.donationName}</span>}
                                                </td>
                                                <td className="ba-cell-center">{a.retryNumber > 0 ? `#${a.retryNumber}` : "Initial"}</td>
                                                <td><span style={Object.fromEntries(statusBadge(a.status).split(";").map(s => { const [k, v] = s.split(":"); return [k.trim(), v?.trim()]; }))}>{a.status}</span></td>
                                                <td className="ba-cell-error">
                                                    {a.errorCode && <span className="ba-error-code">{a.errorCode}</span>}
                                                    {a.errorMessage && <span className="ba-error-msg">{a.errorMessage.substring(0, 60)}{a.errorMessage.length > 60 ? "…" : ""}</span>}
                                                    {!a.errorCode && !a.errorMessage && "—"}
                                                </td>
                                                <td>{a.orderNumber || "—"}</td>
                                                <td>
                                                    {!filters.contract && (
                                                        <button className="ba-timeline-btn" onClick={() => viewTimeline(a.subscriptionContractId)} title="View retry timeline">
                                                            📋
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                )}

                {activeTab === "recovery" && (
                    <div className="ba-table-wrap">
                        {recoveryLogs.length === 0 ? (
                            <div className="ba-empty">
                                <div className="ba-empty-icon">🛡️</div>
                                <h3>No recovery records</h3>
                                <p>When billing failures occur and recovery is enabled, contract-level recovery tracking will appear here.</p>
                            </div>
                        ) : (
                            <table className="ba-table">
                                <thead>
                                    <tr>
                                        <th>Contract</th>
                                        <th>Customer</th>
                                        <th>Amount</th>
                                        <th>Donation</th>
                                        <th>Retries</th>
                                        <th>Next Retry</th>
                                        <th>Error</th>
                                        <th>Fallback</th>
                                        <th>Status</th>
                                        <th>Updated</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recoveryLogs.map((r: any) => (
                                        <tr key={r.id} className={`ba-row ba-row-${r.status}`}>
                                            <td className="ba-cell-mono">{shortContract(r.subscriptionContractId)}</td>
                                            <td>
                                                <div className="ba-customer">
                                                    <strong>{r.customerName || "—"}</strong>
                                                    <span>{r.customerEmail || "—"}</span>
                                                </div>
                                            </td>
                                            <td className="ba-cell-amount">{r.currency} {r.amount.toFixed(2)}</td>
                                            <td>{r.donationName || "—"}</td>
                                            <td className="ba-cell-center">
                                                <span className="ba-retry-badge">{r.retryCount} / {r.maxRetries}</span>
                                            </td>
                                            <td className="ba-cell-time">{r.nextRetryDate ? fmtDate(r.nextRetryDate) : "—"}</td>
                                            <td className="ba-cell-error">
                                                {r.errorCode && <span className="ba-error-code">{r.errorCode}</span>}
                                                {r.errorMessage && <span className="ba-error-msg">{r.errorMessage.substring(0, 50)}</span>}
                                                {!r.errorCode && !r.errorMessage && "—"}
                                            </td>
                                            <td><span className="ba-fallback">{r.fallbackAction}</span></td>
                                            <td><span style={Object.fromEntries(statusBadge(r.status).split(";").map(s => { const [k, v] = s.split(":"); return [k.trim(), v?.trim()]; }))}>{r.status}</span></td>
                                            <td className="ba-cell-time">{fmtDate(r.updatedAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                <div className="ba-footer">
                    <p>Configure retry strategy and fallback actions in <Link to="/app/payment-recovery">Payment Recovery Settings</Link>.</p>
                    <p className="ba-retention">Billing attempt logs are automatically purged after 180 days.</p>
                </div>
            </div>

            <style>{`
                .ba-layout { max-width: 1200px; margin: 24px auto 60px; padding: 0 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

                .ba-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
                .ba-card { background: #fff; border: 1px solid #e1e3e5; border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: transform 0.2s, box-shadow 0.2s; }
                .ba-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
                .ba-card-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; flex-shrink: 0; }
                .ba-card-value { font-size: 28px; font-weight: 800; color: #1a1c1d; line-height: 1; }
                .ba-card-label { font-size: 13px; color: #6d7175; margin-top: 4px; }

                .ba-tabs { display: flex; gap: 0; border-bottom: 2px solid #e1e3e5; margin-bottom: 20px; }
                .ba-tab { padding: 12px 24px; background: none; border: none; cursor: pointer; font-size: 14px; font-weight: 600; color: #6d7175; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
                .ba-tab.active { color: ${THEME}; border-bottom-color: ${THEME}; }
                .ba-tab:hover { color: ${THEME}; }

                .ba-filters { display: flex; gap: 12px; align-items: flex-end; margin-bottom: 16px; flex-wrap: wrap; }
                .ba-filter-group { display: flex; flex-direction: column; gap: 4px; }
                .ba-filter-group label { font-size: 12px; font-weight: 600; color: #6d7175; text-transform: uppercase; letter-spacing: 0.5px; }
                .ba-filter-group select, .ba-filter-group input { padding: 8px 12px; border: 1px solid #c9cccf; border-radius: 8px; font-size: 14px; min-width: 160px; outline: none; transition: border-color 0.2s; }
                .ba-filter-group select:focus, .ba-filter-group input:focus { border-color: ${THEME}; }
                .ba-filter-btn { padding: 8px 20px; background: ${THEME}; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; height: 38px; }
                .ba-filter-btn:hover { opacity: 0.9; }
                .ba-filter-btn.ba-clear { background: #e1e3e5; color: #1a1c1d; }

                .ba-timeline-banner { background: ${THEME}0a; border: 1px solid ${THEME}25; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 14px; color: ${THEME}; }

                .ba-table-wrap { background: #fff; border: 1px solid #e1e3e5; border-radius: 12px; overflow-x: auto; -webkit-overflow-scrolling: touch; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
                .ba-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 1000px; }
                .ba-table thead { background: #f6f6f7; }
                .ba-table th { padding: 12px 14px; text-align: left; font-weight: 600; color: #6d7175; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e1e3e5; white-space: nowrap; }
                .ba-table td { padding: 12px 14px; border-bottom: 1px solid #f0f1f2; vertical-align: top; }
                .ba-row:last-child td { border-bottom: none; }
                .ba-row:hover { background: #fafbfc; }
                .ba-row-failed { border-left: 3px solid #c53030; }
                .ba-row-success { border-left: 3px solid #22863a; }
                .ba-row-pending, .ba-row-retrying { border-left: 3px solid #b7791f; }
                .ba-row-exhausted, .ba-row-fallback_executed { border-left: 3px solid ${THEME}; }
                .ba-row-recovered { border-left: 3px solid #22863a; }

                .ba-customer { display: flex; flex-direction: column; gap: 2px; }
                .ba-customer strong { font-size: 13px; color: #1a1c1d; }
                .ba-customer span { font-size: 12px; color: #6d7175; }

                .ba-cell-mono { font-family: 'SF Mono', SFMono-Regular, Consolas, monospace; font-size: 12px; color: ${THEME}; font-weight: 600; }
                .ba-cell-amount { font-weight: 700; color: #1a1c1d; white-space: nowrap; }
                .ba-cell-center { text-align: center; }
                .ba-cell-time { white-space: nowrap; font-size: 12px; color: #6d7175; }
                .ba-donation-name { display: block; font-size: 11px; font-weight: 400; color: #6d7175; margin-top: 2px; }

                .ba-error-code { display: inline-block; background: #fde8e8; color: #c53030; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-family: monospace; margin-right: 4px; }
                .ba-error-msg { font-size: 12px; color: #6d7175; display: block; margin-top: 2px; }

                .ba-retry-badge { background: #f0e6f6; color: ${THEME}; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
                .ba-fallback { font-size: 12px; text-transform: capitalize; color: #6d7175; font-weight: 600; }

                .ba-timeline-btn { background: none; border: 1px solid #e1e3e5; border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 14px; transition: all 0.2s; }
                .ba-timeline-btn:hover { background: ${THEME}0a; border-color: ${THEME}40; }

                .ba-empty { text-align: center; padding: 60px 20px; }
                .ba-empty-icon { font-size: 48px; margin-bottom: 16px; }
                .ba-empty h3 { font-size: 18px; color: #1a1c1d; margin-bottom: 8px; }
                .ba-empty p { font-size: 14px; color: #6d7175; }

                .ba-footer { text-align: center; padding-top: 32px; border-top: 1px solid #e1e3e5; margin-top: 32px; color: #6d7175; font-size: 14px; }
                .ba-footer a { color: ${THEME}; text-decoration: none; font-weight: 600; }
                .ba-retention { font-size: 12px; margin-top: 8px; color: #8c9196; }

                @media (max-width: 900px) {
                    .ba-cards { grid-template-columns: repeat(2, 1fr); }
                }
                @media (max-width: 500px) {
                    .ba-cards { grid-template-columns: 1fr; }
                }
            `}</style>
        </s-page>
    );
}

export const headers: HeadersFunction = (headersArgs) => {
    return boundary.headers(headersArgs);
};
