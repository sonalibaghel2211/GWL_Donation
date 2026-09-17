import { useState, useCallback, useEffect, useRef } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import { hasActiveSubscription } from "../utils/features";
import { Link } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session, admin } = await authenticate.admin(request);
    const shop = session.shop;

    const logs = await prisma.posDonationLog.findMany({
        where: { shop },
        orderBy: { createdAt: "desc" },
    });
    const recurringLogs = await prisma.recurringDonationLog.findMany({
        where: { shop },
        orderBy: { createdAt: "desc" },
    });
    const roundupLogs = await prisma.roundUpDonationLog.findMany({
        where: { shop },
        orderBy: { createdAt: "desc" },
    });

    const presetDonations = await prisma.donation.findMany({
        where: {
            campaign: {
                shop: shop
            }
        },
        include: {
            campaign: {
                select: { name: true }
            }
        },
        orderBy: { createdAt: "desc" },
    });

    const response = await admin.graphql(`
      query {
        shop {
          currencyCode
        }
      }
    `);
    const shopData = await response.json();
    const currency = shopData.data?.shop?.currencyCode || "USD";

    const subscription = await prisma.planSubscription.findUnique({
        where: { shop },
    });

    const config = await prisma.recurringDonationConfig.findUnique({
        where: { shop },
    });

    return {
        logs,
        recurringLogs,
        roundupLogs,
        presetDonations,
        config,
        currency,
        plan: subscription?.plan ?? "basic",
        subscription: subscription ? { plan: subscription.plan, status: subscription.status } : null,
    };
};

export default function DonationActivity() {
    const loaderData = useLoaderData<typeof loader>();
    const resendFetcher = useFetcher();
    const shopify = useAppBridge();

    const { logs, recurringLogs, roundupLogs, presetDonations, config, currency: currencyCode, plan, subscription } = loaderData;

    const formatLogAmount = (amount: number, currency: string) => {
        try {
            return new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: currency || currencyCode || 'USD',
            }).format(amount);
        } catch (e) {
            return `${currency || 'USD'} ${amount.toFixed(2)}`;
        }
    };

    const [selectedTab, setSelectedTab] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const handleTabChange = useCallback((id: string) => {
        setSelectedTab(id);
        setCurrentPage(1);
    }, []);

    const handleResend = useCallback((logId: string) => {
        resendFetcher.submit({ logId }, { method: "POST", action: "/api/resend-donation-email" });
        shopify.toast.show("Attempting to resend receipt...");
    }, [resendFetcher, shopify]);

    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const handleDownload = useCallback(async (logId: string, source: string) => {
        const param = source === "preset" ? "donationId" : "logId";
        const downloadUrl = `/api/download-receipt?${param}=${encodeURIComponent(logId)}`;

        setDownloadingId(logId);
        shopify.toast.show("Generating receipt PDF...");

        try {
            const response = await fetch(downloadUrl);

            if (!response.ok) {
                const errorText = await response.text();
                shopify.toast.show(errorText || "Failed to generate receipt", { isError: true } as any);
                setDownloadingId(null);
                return;
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            // Extract filename from Content-Disposition header or fallback
            const disposition = response.headers.get("Content-Disposition");
            let filename = "receipt.pdf";
            if (disposition) {
                const match = disposition.match(/filename="?([^";\s]+)"?/);
                if (match) filename = match[1];
            }

            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);

            shopify.toast.show("Receipt downloaded!");
        } catch (error: any) {
            console.error("[DownloadReceipt] Error:", error);
            shopify.toast.show("Failed to download receipt", { isError: true } as any);
        } finally {
            setDownloadingId(null);
        }
    }, [shopify]);


    // Track last resend response to show feedback only once

    const lastResendRef = useRef<string | null>(null);
    useEffect(() => {
        if (resendFetcher.state === "idle" && resendFetcher.data) {
            const key = JSON.stringify(resendFetcher.data);
            if (key !== lastResendRef.current) {
                lastResendRef.current = key;
                if ((resendFetcher.data as any).success) {
                    shopify.toast.show("Receipt resent successfully!");
                } else {
                    shopify.toast.show((resendFetcher.data as any).error || "Failed to resend receipt", { isError: true } as any);
                }
            }
        }
    }, [resendFetcher.state, resendFetcher.data, shopify]);

    // Helper to map frequency to readable name
    const getFrequencyLabel = (freq: string | null) => {
        if (freq === "monthly") return "Monthly";
        if (freq === "weekly") return "Weekly";
        if (freq === "one_time") return "Preset";
        return "Donation";
    };

    // Derived filtered logs
    let filteredLogs: any[] = [];

    // Normalize all types to a common structure
    const normalizedLogs = [
        ...logs.map((l: any) => ({
            ...l,
            visualType: "POS",
            source: "pos"
        })),
        ...roundupLogs.map((l: any) => ({
            ...l,
            visualType: "Round Up",
            source: "roundup"
        })),
        ...recurringLogs.map((l: any) => ({
            ...l,
            visualType: getFrequencyLabel(l.frequency),
            source: "recurring"
        })),
        ...presetDonations.map((d: any) => ({
            id: d.id,
            createdAt: d.createdAt,
            orderNumber: d.orderNumber || (d.orderId ? `#${d.orderId.split("-").pop()}` : "Preset"),
            donationAmount: d.amount,
            orderTotal: 0,
            currency: d.currency,
            status: d.status || "active",
            receiptStatus: d.receiptStatus || "sent",
            isResent: d.isResent || false,
            visualType: "Preset",
            source: "preset"
        }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (selectedTab === "all") {
        filteredLogs = normalizedLogs;
    } else if (selectedTab === "pos") {
        filteredLogs = normalizedLogs.filter(l => l.source === "pos");
    } else if (selectedTab === "recurring") {
        // Only show actual subscriptions (Monthly/Weekly)
        filteredLogs = normalizedLogs.filter(l => l.source === "recurring" && l.frequency !== "one_time");
    } else if (selectedTab === "roundup") {
        filteredLogs = normalizedLogs.filter(l => l.source === "roundup");
    } else if (selectedTab === "preset") {
        // Includes both original Preset and the new Unified One-time global donations
        filteredLogs = normalizedLogs.filter(l => l.source === "preset" || (l.source === "recurring" && l.frequency === "one_time"));
    }

    const totalPages = Math.ceil(filteredLogs.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const visibleLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

    return (
        <div style={{ paddingBottom: "40px" }}>
            <s-page heading="Donation Activity">
                <div className="polaris-tabs">
                    <div className="polaris-tabs-list" role="tablist">
                        {[
                            { id: "all", label: "All" },
                            { id: "preset", label: "Preset Donation" },
                            { id: "recurring", label: "Recurring" },
                            { id: "roundup", label: "Round Up" },
                            { id: "pos", label: "POS" },
                        ].map((tab) => {
                            const isSelected = selectedTab === tab.id;
                            const hasAccess = tab.id === "all" || tab.id === "pos" || tab.id === "recurring" || hasActiveSubscription(subscription, "canUseFilters");
                            return (
                                <button
                                    key={tab.id}
                                    role="tab"
                                    aria-selected={isSelected}
                                    className={`polaris-tab ${isSelected ? "active" : ""}`}
                                    style={{
                                        cursor: hasAccess ? "pointer" : "not-allowed",
                                        opacity: hasAccess ? 1 : 0.6
                                    }}
                                    onClick={() => {
                                        if (!hasAccess) {
                                            shopify.toast.show("Upgrade to Advanced to use filters");
                                            return;
                                        }
                                        handleTabChange(tab.id);
                                    }}
                                >
                                    {tab.label}
                                    {!hasAccess && (
                                        <span style={{ marginLeft: "6px", fontSize: "10px", background: "#f4f4f4", padding: "2px 4px", borderRadius: "4px", color: "#6D7175" }}>ADV</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div style={{ backgroundColor: "#fff", border: "1px solid #EBEBEB", borderRadius: "0 0 8px 8px", padding: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#202223" }}>
                            <span>Show</span>

                            <select
                                value={pageSize}
                                disabled={!hasActiveSubscription(subscription, "canUseFilters")}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                style={{
                                    padding: "4px 8px",
                                    borderRadius: "4px",
                                    border: "1px solid #EBEBEB",
                                    background: hasActiveSubscription(subscription, "canUseFilters") ? "white" : "#f4f4f4",
                                    cursor: hasActiveSubscription(subscription, "canUseFilters") ? "pointer" : "not-allowed"
                                }}
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={15}>15</option>
                                <option value={20}>20</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>

                            </select>
                            <span>entries</span>
                            {!hasActiveSubscription(subscription, "canUseFilters") && (
                                <Link to="/app/pricing" style={{ color: "#6C4A79", textDecoration: "none", fontSize: "12px", marginLeft: "12px" }}>
                                    Upgrade to unlock filters ↗
                                </Link>
                            )}
                        </div>
                    </div>

                    {filteredLogs.length === 0 ? (
                        <div style={{ padding: "40px", textAlign: "center" }}>
                            <s-text color="subdued">
                                No {selectedTab === "roundup" ? "Round Up" : selectedTab === "preset" ? "Preset" : selectedTab === "recurring" ? "Recurring" : ""} donation data available.
                            </s-text>
                        </div>
                    ) : (
                        <>
                            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", background: "white" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid #EBEBEB" }}>
                                        <th style={{ padding: "12px 10px", fontWeight: "bold", fontSize: "13px" }}>Date</th>
                                        <th style={{ padding: "12px 10px", fontWeight: "bold", fontSize: "13px" }}>Order</th>
                                        <th style={{ padding: "12px 10px", fontWeight: "bold", fontSize: "13px", textAlign: "center" }}>Type</th>
                                        <th style={{ padding: "12px 10px", fontWeight: "bold", fontSize: "13px", textAlign: "right" }}>Donation Amount</th>
                                        <th style={{ padding: "12px 10px", fontWeight: "bold", fontSize: "13px", textAlign: "center" }}>Receipt</th>
                                        <th style={{ padding: "12px 10px", fontWeight: "bold", fontSize: "13px", textAlign: "right" }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleLogs.map((log: any) => (
                                        <tr key={log.id} style={{ borderBottom: "1px solid #f0f0f0", opacity: 1, background: "white" }}>
                                            <td style={{ padding: "12px 10px", fontSize: "13px", background: "white" }}>
                                                {new Date(log.createdAt).toLocaleDateString()}
                                                {log.status && (
                                                    <span style={{
                                                        marginLeft: "8px",
                                                        display: "inline-block",
                                                        padding: "2px 8px",
                                                        borderRadius: "10px",
                                                        fontSize: "11px",
                                                        fontWeight: "600",
                                                        textTransform: "capitalize",
                                                        background: log.status === "active" ? "#e6fff1" : log.status === "paused" ? "#fff4e5" : log.status === "cancelled" ? "#fff0f0" : "#EAEAEA",
                                                        color: log.status === "active" ? "#008060" : log.status === "paused" ? "#965b00" : log.status === "cancelled" ? "#d72c0d" : "#5C5F62",
                                                        border: log.status === "active" ? "1px solid #a3e5c0" : log.status === "paused" ? "1px solid #ffcc7e" : log.status === "cancelled" ? "1px solid #ffd5d5" : "none"
                                                    }}>
                                                        {log.status}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: "12px 10px", fontSize: "13px", background: "white" }}>{log.orderNumber || "Unknown"}</td>
                                            <td style={{ padding: "12px 10px", textAlign: "center", background: "white" }}>
                                                <span style={{
                                                    display: "inline-block",
                                                    padding: "2px 8px",
                                                    borderRadius: "10px",
                                                    fontSize: "11px",
                                                    color: (log.visualType === "Monthly" || log.visualType === "Weekly") ? "#6C4A79" :
                                                        (log.visualType === "Preset" ? "#008060" :
                                                            (log.visualType === "Round Up" ? "#965b00" : "#03080eff")),
                                                    background: (log.visualType === "Monthly" || log.visualType === "Weekly") ? "#f4ebf8" :
                                                        (log.visualType === "Preset" ? "#e6fff1" :
                                                            (log.visualType === "Round Up" ? "#fff4e5" : "#e4f0f6"))
                                                }}>
                                                    {log.visualType || "POS"}
                                                </span>
                                            </td>
                                            <td style={{ padding: "12px 10px", textAlign: "right", fontWeight: "bold", fontSize: "13px", color: log.status !== "active" ? "#6D7175" : "#6C4A79", textDecoration: log.status !== "active" ? "line-through" : "none", background: "white" }}>{formatLogAmount(log.donationAmount || 0, log.currency)}</td>
                                            <td style={{ padding: "12px 10px", textAlign: "center", background: "white" }}>
                                                <div style={{
                                                    display: "inline-block",
                                                    padding: "4px 14px",
                                                    borderRadius: "25px",
                                                    fontSize: "11px",
                                                    fontWeight: "600",
                                                    background: log.receiptStatus === "sent" ? "#affebf " : log.receiptStatus === "failed" ? "#fbeae5" : "#f1f1f1",
                                                    color: log.receiptStatus === "sent" ? "#2e5648" : log.receiptStatus === "failed" ? "#8e1f0b" : "#5C5F62"
                                                }}>
                                                    {log.receiptStatus === "sent" ? "Sent" : log.receiptStatus === "failed" ? "Failed" : "Pending"}
                                                </div>
                                            </td>
                                            <td style={{ padding: "12px 10px", textAlign: "right", background: "white" }}>
                                                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px" }}>
                                                    <button
                                                        onClick={() => handleDownload(log.id, log.source)}
                                                        disabled={downloadingId === log.id}
                                                        title={log.status === "cancelled" || log.status === "refunded" ? "Download void receipt as PDF" : "Download receipt as PDF"}
                                                        style={{
                                                            cursor: downloadingId === log.id ? "wait" : "pointer",
                                                            background: log.status === "cancelled" || log.status === "refunded" ? "#991b1b" : "#6C4A79",
                                                            color: "white",
                                                            border: "none",
                                                            padding: "8px 14px",
                                                            borderRadius: "8px",
                                                            fontSize: "12px",
                                                            fontWeight: "600",
                                                            opacity: downloadingId === log.id ? 0.7 : 1,
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "4px"
                                                        }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                        {downloadingId === log.id ? "Generating..." : (log.status === "cancelled" || log.status === "refunded" ? "Void Receipt" : "Download")}
                                                    </button>

                                                    <div
                                                        title={log.isResent ? "Already resent. You can resend only once" : "You can resend only once"}
                                                        style={{ display: "inline-block" }}
                                                    >
                                                        <button
                                                            onClick={() => handleResend(log.id)}
                                                            disabled={(resendFetcher.state !== "idle" && resendFetcher.formData?.get("logId") === log.id) || log.isResent}
                                                            style={{
                                                                cursor: log.isResent ? "not-allowed" : "pointer",
                                                                background: "#202223",
                                                                color: "white",
                                                                border: "none",
                                                                padding: "8px 14px",
                                                                borderRadius: "8px",
                                                                fontSize: "12px",
                                                                fontWeight: "600",
                                                                opacity: log.isResent ? 0.4 : (resendFetcher.state !== "idle" && resendFetcher.formData?.get("logId") === log.id ? 0.7 : 1),
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "4px"
                                                            }}
                                                        >
                                                            {resendFetcher.state !== "idle" && resendFetcher.formData?.get("logId") === log.id ? "Sending..." : "Resend"}
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {totalPages > 1 && (
                                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginTop: "20px", borderTop: "1px solid #f0f0f0", paddingTop: "20px" }}>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        style={{
                                            cursor: currentPage === 1 ? "not-allowed" : "pointer",
                                            padding: "8px 16px",
                                            borderRadius: "8px",
                                            border: currentPage === 1 ? "1px solid #8b8585" : "1px solid #202223",
                                            background: "white",
                                            color: "#202223",
                                            fontSize: "13px",
                                            fontWeight: "500",
                                            opacity: currentPage === 1 ? 0.6 : 1
                                        }}
                                    >
                                        Previous
                                    </button>
                                    <span style={{ fontSize: "14px", color: "#202223", fontWeight: "500" }}>
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        style={{
                                            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                                            padding: "8px 16px",
                                            borderRadius: "8px",
                                            border: currentPage === totalPages ? "1px solid #8b8585" : "1px solid #202223",
                                            background: "white",
                                            color: "#202223",
                                            fontSize: "13px",
                                            fontWeight: "500",
                                            opacity: currentPage === totalPages ? 0.6 : 1
                                        }}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
                <style>{`
                .polaris-tabs {
                  border-bottom: 1px solid #dfe3e8;
                  margin-bottom: 20px;
                }
                .polaris-tabs-list {
                  display: flex;
                  gap: 0;
                  overflow-x: auto;
                }
                .polaris-tab {
                  padding: 12px 16px;
                  background: none;
                  border: none;
                  border-bottom: 3px solid transparent;
                  color: #000000;
                  font-size: 14px;
                  font-weight: 500;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  white-space: nowrap;
                }
                .polaris-tab:hover {
                  color: #6C4A79;
                }
                .polaris-tab.active {
                  color: #6C4A79;
                  border-bottom-color: #6C4A79;
                }
            `}</style>
            </s-page>
        </div>
    );
}

export const headers: HeadersFunction = (headersArgs) => {
    return boundary.headers(headersArgs);
};
