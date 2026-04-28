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
    const { session } = await authenticate.admin(request);
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

    let chartData: { month: string; amount: number }[] = [];

    try {
        const startDate = new Date(parseInt(requestYear), 0, 1);
        const endDate = new Date(parseInt(requestYear) + 1, 0, 1);

        const where: any = {
            createdAt: {
                gte: startDate,
                lt: endDate,
            }
        };

        let allDonations: { amount: number, createdAt: Date }[] = [];

        // Fetch Campaign Donations
        if (typeFilter === "all" || typeFilter === "preset") {
            const campaignWhere = { ...where };
            if (campaign_name && campaign_name !== "all") {
                campaignWhere.campaign = { name: campaign_name };
            }
            const presetDonations = await prisma.donation.findMany({
                where: {
                    ...campaignWhere,
                    campaign: { shop }
                },
                select: { amount: true, createdAt: true }
            });
            allDonations = [...allDonations, ...presetDonations];
        }

        // Fetch POS & Round-Up Donations (Aggregate in memory to bypass Prisma validation issue)
        if (typeFilter === "all" || typeFilter === "pos" || typeFilter === "roundup") {
            // Using raw SQL because Prisma Client doesn't recognize 'type' column
            const rawLogs = await prisma.$queryRaw<any[]>`SELECT * FROM PosDonationLog WHERE shop = ${shop}`;

            const filteredPos = rawLogs.filter(l => {
                const dDate = new Date(l.createdAt);
                if (dDate < startDate || dDate >= endDate) return false;
                if (typeFilter === "all") return true;
                return l.type === typeFilter;
            });

            allDonations = [...allDonations, ...filteredPos.map(d => ({ amount: d.donationAmount, createdAt: new Date(d.createdAt) }))];
        }

        // Fetch Recurring Donations
        if (typeFilter === "all" || typeFilter === "recurring") {
            const rawRecurring = await prisma.$queryRaw<any[]>`SELECT * FROM RecurringDonationLog WHERE shop = ${shop}`;
            const filteredRecurring = rawRecurring.filter(l => {
                const dDate = new Date(l.createdAt);
                return dDate >= startDate && dDate < endDate;
            });
            allDonations = [...allDonations, ...filteredRecurring.map(d => ({ amount: d.donationAmount, createdAt: new Date(d.createdAt) }))];
        }

        chartData = MONTHS.map((month, index) => {
            const monthDonations = allDonations.filter(
                (d: any) => d.createdAt.getMonth() === index
            );
            const totalAmount = monthDonations.reduce((sum: number, d: any) => sum + d.amount, 0);
            return { month, amount: totalAmount };
        });
    } catch (error) {
        console.error("Error fetching donation filter metrics:", error);
    }

    return data({ campaigns, years, chartData, query: { campaign_name, requestYear, typeFilter } });
};

export default function TrackDonationPage() {
    const { campaigns: trackCampaigns, years, chartData, query } = useLoaderData<typeof loader>();
    const submit = useSubmit();
    const navigation = useNavigation();

    const [selectedType, setSelectedType] = useState(query.typeFilter || "all");
    const [selectedDonationName, setSelectedDonationName] = useState(query.campaign_name || "all");
    const [selectedYear, setSelectedYear] = useState(query.requestYear || "all");
    const chartInstance = useRef<Chart | null>(null);

    const isLoading = navigation.state === "loading" || navigation.state === "submitting";

    // Draw / redraw the Chart.js chart whenever chartData changes
    useEffect(() => {
        const canvas = document.getElementById(
            "donation-chart",
        ) as HTMLCanvasElement | null;

        if (canvas && chartData.length > 0) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }

            const ctx = canvas.getContext("2d");
            if (ctx) {
                chartInstance.current = new Chart(ctx, {
                    type: "line",
                    data: {
                        labels: chartData.map((d) => d.month),
                        datasets: [
                            {
                                label: "Donation Amount ($)",
                                data: chartData.map((d) => d.amount),
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
                            },
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
                                    label: (context: any) => `$${context.parsed.y.toFixed(2)}`,
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
                                ticks: {
                                    color: "#6d7175",
                                    callback: (value: any) => `$${value}`,
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
    }, [chartData]);

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
                                <option value="preset">Preset Donations</option>
                                <option value="pos">POS Donations</option>
                                <option value="roundup">Round Up Donations</option>
                                <option value="recurring">Recurring Donations</option>
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

                <div style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e1e3e5", height: "400px" }}>
                    <canvas id="donation-chart"></canvas>
                </div>
            </s-block-stack>
        </s-page>
    );
}
