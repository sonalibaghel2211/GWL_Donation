import { useState, useRef, useEffect, useCallback } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { data, useSubmit, useNavigation, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session, admin } = await authenticate.admin(request);
    const shop = session.shop;

    // Fetch all campaigns for this shop, sorted alphabetically
    const campaigns = await prisma.campaign.findMany({
        where: { shop },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });

    // Generate years from 2020 up to the current year (ascending)
    const START_YEAR = 2020;
    const currentYear = new Date().getFullYear();
    const years = Array.from(
        { length: currentYear - START_YEAR + 1 },
        (_, i) => (START_YEAR + i).toString()
    );

    const url = new URL(request.url);
    const typeFilter = url.searchParams.get("type") || "all";
    const campaign_name = url.searchParams.get("campaign_name");
    const requestYear = url.searchParams.get("year") || currentYear.toString();

    let allDonations: { amount: number; createdAt: Date }[] = [];
    let monthlyAmounts: number[] = Array(12).fill(0);

    // Fetch shop currency first so we can use it as default fallback
    let currency = "USD";
    try {
        const currencyResponse = await admin.graphql(`
            query {
                shop {
                    currencyCode
                }
            }
        `);
        const currencyData = await currencyResponse.json();
        currency = currencyData.data?.shop?.currencyCode || "USD";
    } catch (e) {
        console.error("Error fetching shop currency:", e);
    }

    try {
        const startDate = new Date(parseInt(requestYear), 0, 1);
        const endDate = new Date(parseInt(requestYear) + 1, 0, 1);

        const where: any = {
            createdAt: {
                gte: startDate,
                lt: endDate,
            }
        };

        // Fetch Campaign Donations
        if (typeFilter === "all" || typeFilter === "preset") {
            const campaignWhere = { ...where };
            if (campaign_name && campaign_name !== "all") {
                campaignWhere.campaign = { name: campaign_name };
            }
            const presetDonations = await prisma.donation.findMany({
                where: {
                    ...campaignWhere,
                    campaign: { shop },
                    status: "active"
                },
                select: { amount: true, createdAt: true }
            });
            allDonations = [
                ...allDonations,
                ...presetDonations.map(d => ({ amount: d.amount, createdAt: d.createdAt }))
            ];
        }

        // Fetch POS Donations
        if (typeFilter === "all" || typeFilter === "pos") {
            const rawLogs = await prisma.posDonationLog.findMany({ 
                where: { 
                    shop,
                    status: "active"
                },
                select: { donationAmount: true, createdAt: true }
            });

            const filteredPos = rawLogs.filter((l: any) => {
                const dDate = new Date(l.createdAt);
                return dDate >= startDate && dDate < endDate;
            });

            allDonations = [
                ...allDonations,
                ...filteredPos.map((d: any) => ({ amount: d.donationAmount, createdAt: new Date(d.createdAt) }))
            ];
        }

        // Fetch Round-Up Donations
        if (typeFilter === "all" || typeFilter === "roundup") {
            const rawRoundup = await prisma.roundUpDonationLog.findMany({ 
                where: { 
                    shop,
                    status: "active"
                },
                select: { donationAmount: true, createdAt: true }
            });

            const filteredRoundup = rawRoundup.filter((l: any) => {
                const dDate = new Date(l.createdAt);
                return dDate >= startDate && dDate < endDate;
            });

            allDonations = [
                ...allDonations,
                ...filteredRoundup.map((d: any) => ({ amount: d.donationAmount, createdAt: new Date(d.createdAt) }))
            ];
        }

        // Fetch Recurring Donations
        if (typeFilter === "all" || typeFilter === "recurring") {
            const rawRecurring = await prisma.recurringDonationLog.findMany({ 
                where: { 
                    shop,
                    status: "active",
                    frequency: { in: ["monthly", "weekly"] }
                },
                select: { donationAmount: true, createdAt: true }
            });
            const filteredRecurring = rawRecurring.filter((l: any) => {
                const dDate = new Date(l.createdAt);
                return dDate >= startDate && dDate < endDate;
            });
            allDonations = [
                ...allDonations,
                ...filteredRecurring.map((d: any) => ({ amount: d.donationAmount, createdAt: new Date(d.createdAt) }))
            ];
        }

        monthlyAmounts = MONTHS.map((_, monthIndex) => {
            return allDonations
                .filter((d) => d.createdAt.getMonth() === monthIndex)
                .reduce((sum, d) => sum + d.amount, 0);
        });

    } catch (error) {
        console.error("Error fetching donation filter metrics:", error);
    }

    return data({ campaigns, years, monthlyAmounts, months: MONTHS, query: { campaign_name, requestYear, typeFilter }, currency });
};

export default function TrackDonationPage() {
    const { campaigns: trackCampaigns, years, monthlyAmounts, months, query, currency } = useLoaderData<typeof loader>();
    
    const moneyFormatter = useCallback((val: number) => {
        try {
            return new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: currency || "USD",
            }).format(val);
        } catch (e) {
            return `${currency || "USD"} ${val.toFixed(2)}`;
        }
    }, [currency]);

    const submit = useSubmit();
    const navigation = useNavigation();

    const [selectedType, setSelectedType] = useState(query.typeFilter || "all");
    const [selectedDonationName, setSelectedDonationName] = useState(query.campaign_name || "all");
    const [selectedYear, setSelectedYear] = useState(query.requestYear || "all");
    const chartInstance = useRef<Chart | null>(null);

    const isLoading = navigation.state === "loading" || navigation.state === "submitting";

    // Draw / redraw the Chart.js chart whenever monthlyAmounts changes
    useEffect(() => {
        const canvas = document.getElementById(
            "donation-chart",
        ) as HTMLCanvasElement | null;

        if (canvas && monthlyAmounts) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }

            const ctx = canvas.getContext("2d");
            if (ctx) {
                chartInstance.current = new Chart(ctx, {
                    type: "line",
                    data: {
                        labels: months || MONTHS,
                        datasets: [
                            {
                                label: `Donation Amount (${currency})`,
                                data: monthlyAmounts,
                                borderColor: "#6C4A79",
                                backgroundColor: "rgba(108, 74, 121, 0.1)",
                                borderWidth: 2,
                                fill: true,
                                tension: 0.3,
                                pointBackgroundColor: "#6C4A79",
                                pointBorderColor: "#ffffff",
                                pointBorderWidth: 2,
                                pointRadius: 5,
                                pointHoverRadius: 7,
                            }
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: "top",
                                labels: { usePointStyle: true, padding: 20 },
                            },
                            tooltip: {
                                backgroundColor: "#202223",
                                titleColor: "#ffffff",
                                bodyColor: "#ffffff",
                                padding: 12,
                                cornerRadius: 8,
                                displayColors: false,
                                callbacks: {
                                    label: (context: any) => {
                                        return moneyFormatter(context.parsed.y);
                                    },
                                },
                            },
                        },
                        scales: {
                            x: {
                                grid: { display: false },
                                ticks: { color: "#6d7175" },
                            },
                            y: {
                                beginAtZero: true,
                                grid: { color: "#e3e3e3" },
                                title: {
                                    display: true,
                                    text: `Amount (${currency})`,
                                    color: "#6d7175",
                                    font: { weight: "bold", size: 12 }
                                },
                                ticks: {
                                    color: "#6d7175",
                                    callback: (value: any) => moneyFormatter(value),
                                },
                            },
                        },
                        interaction: { intersect: false, mode: "index" },
                    },
                });
            }
        }

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [monthlyAmounts, currency, months, moneyFormatter]);

    const handleTrack = useCallback(() => {
        const formData = new FormData();
        formData.append("type", selectedType);
        formData.append("campaign_name", selectedDonationName);
        formData.append("year", selectedYear);
        submit(formData, { method: "get" });
    }, [selectedType, selectedDonationName, selectedYear, submit]);

    return (
        <s-page heading="Track Donation">
            <s-block-stack gap="base">
                <div style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e1e3e5", marginBottom: "20px" }}>
                    <div style={{ display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: "200px" }}>
                            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>Donation Type</label>
                            <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #e1e3e5" }}
                            >
                                <option value="all">All Donations</option>
                                <option value="preset">Preset Donation</option>
                                <option value="recurring">Recurring (Subscriptions)</option>
                                <option value="roundup">Round Up</option>
                                <option value="pos">POS</option>
                            </select>
                        </div>

                        {selectedType === "preset" && (
                            <div style={{ flex: 1, minWidth: "200px" }}>
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>Campaign Name</label>
                                <select
                                    value={selectedDonationName}
                                    onChange={(e) => setSelectedDonationName(e.target.value)}
                                    style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #e1e3e5" }}
                                >
                                    <option value="all">All Campaigns</option>
                                    {trackCampaigns.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                        )}

                        <div style={{ flex: 1, minWidth: "200px" }}>
                            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>Year</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #e1e3e5" }}
                            >
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>

                        <button
                            onClick={handleTrack}
                            disabled={isLoading}
                            style={{
                                background: "#6C4A79",
                                color: "white",
                                border: "none",
                                padding: "10px 24px",
                                borderRadius: "8px",
                                fontWeight: "600",
                                cursor: isLoading ? "not-allowed" : "pointer",
                                opacity: isLoading ? 0.7 : 1,
                                height: "40px"
                            }}
                        >
                            {isLoading ? "Loading..." : "Track"}
                        </button>
                    </div>
                </div>

                <div style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e1e3e5", minHeight: "420px" }}>
                    <div style={{ height: "360px", width: "100%" }}>
                        <canvas id="donation-chart"></canvas>
                    </div>
                </div>
            </s-block-stack>
        </s-page>
    );
}
