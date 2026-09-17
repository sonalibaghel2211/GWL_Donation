import prisma from "../db.server";

export interface NormalizedDonation {
    id: string;
    orderId: string;
    orderNumber: string;
    donationAmount: number;
    currency: string;
    status: string;
    receiptStatus: string;
    donationType: string;
    donationSource: string;
    frequency: string;
    campaignName: string;
    createdAt: Date;
    subscriptionContractId?: string;
}

export function mapFrequencyLabel(freq: string | null | undefined): string {
    if (freq === "monthly") return "Monthly";
    if (freq === "weekly") return "Weekly";
    return "One-time";
}

export function mapDonationType(source: string, frequency?: string | null): string {
    switch (source) {
        case "recurring": {
            const freq = mapFrequencyLabel(frequency);
            return freq !== "One-time" ? `Recurring (${freq})` : "One-time";
        }
        case "roundup": return "Round Up";
        case "preset": return "Preset";
        case "pos": default: return "Portion of Sale";
    }
}

export function normalizeOrderIdToNumeric(orderId: string): string {
    if (!orderId) return "";
    if (orderId.startsWith("gid://")) return orderId.split("/").pop() || orderId;
    return orderId;
}

export function toOrderGid(orderId: string): string {
    if (!orderId) return "";
    if (orderId.startsWith("gid://")) return orderId;
    return `gid://shopify/Order/${orderId}`;
}

export async function fetchDonationsByOrderIds(
    orderIds: string[],
    shop: string
): Promise<NormalizedDonation[]> {
    if (!orderIds.length) return [];

    const gidVariants = orderIds.map(id => `gid://shopify/Order/${id}`);
    const allVariants = [...orderIds, ...gidVariants];

    const [posLogs, recurringLogs, roundupLogs, presetDonations] = await Promise.all([
        prisma.posDonationLog.findMany({
            where: { shop, orderId: { in: allVariants } },
            orderBy: { createdAt: "desc" },
        }),
        prisma.recurringDonationLog.findMany({
            where: { shop, orderId: { in: allVariants } },
            orderBy: { createdAt: "desc" },
        }),
        prisma.roundUpDonationLog.findMany({
            where: { shop, orderId: { in: allVariants } },
            orderBy: { createdAt: "desc" },
        }),
        prisma.donation.findMany({
            where: { campaign: { shop }, orderId: { in: allVariants } },
            include: { campaign: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    const normalized: NormalizedDonation[] = [
        ...posLogs.map((l: any) => normalizeDonationRecord(l, "pos")),
        ...recurringLogs.map((l: any) => normalizeDonationRecord(l, "recurring")),
        ...roundupLogs.map((l: any) => normalizeDonationRecord(l, "roundup")),
        ...presetDonations.map((d: any) => normalizeDonationRecord(d, "preset")),
    ];

    normalized.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return normalized;
}

export function normalizeDonationRecord(
    record: any,
    source: "pos" | "recurring" | "roundup" | "preset"
): NormalizedDonation {
    if (source === "preset") {
        return {
            id: record.id,
            orderId: record.orderId || "",
            orderNumber: record.orderNumber || (record.orderId ? `#${normalizeOrderIdToNumeric(record.orderId)}` : "N/A"),
            donationAmount: record.amount || 0,
            currency: record.currency || "USD",
            status: record.status || "active",
            receiptStatus: record.receiptStatus || "pending",
            donationType: "Preset",
            donationSource: "preset",
            frequency: "One-time",
            campaignName: record.campaign?.name || "Donation",
            createdAt: record.createdAt,
        };
    }

    return {
        id: record.id,
        orderId: record.orderId || "",
        orderNumber: record.orderNumber || "N/A",
        donationAmount: record.donationAmount || 0,
        currency: record.currency || "USD",
        status: record.status || "active",
        receiptStatus: record.receiptStatus || "pending",
        donationType: mapDonationType(source, record.frequency),
        donationSource: source,
        frequency: source === "recurring" ? mapFrequencyLabel(record.frequency) : "One-time",
        campaignName: "",
        createdAt: record.createdAt,
        subscriptionContractId: source === "recurring" ? record.subscriptionContractId || undefined : undefined,
    };
}

export async function findDonationById(id: string): Promise<{
    record: any;
    source: "pos" | "recurring" | "roundup" | "preset";
} | null> {
    let record = await prisma.posDonationLog.findUnique({ where: { id } });
    if (record) return { record, source: "pos" };

    record = await (prisma as any).recurringDonationLog.findUnique({ where: { id } });
    if (record) return { record, source: "recurring" };

    record = await (prisma as any).roundUpDonationLog.findUnique({ where: { id } });
    if (record) return { record, source: "roundup" };

    const donation = await prisma.donation.findUnique({
        where: { id },
        include: { campaign: true },
    });
    if (donation) return { record: donation, source: "preset" };

    return null;
}
