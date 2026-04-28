export type PlanType = "basic" | "advanced" | "pro";

export interface PlanFeatures {
    maxDonationAmount?: number;
    canUsePercentageDonation: boolean;
    canSendReceiptEmail: boolean;
    canSendRefundEmail: boolean;
    canSendCancelEmail: boolean;
    canEditTemplates: boolean;
    canUseFilters: boolean;
    canUseCustomBranding: boolean;
}

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
    basic: {
        canUsePercentageDonation: false,
        canSendReceiptEmail: true,
        canSendRefundEmail: false,
        canSendCancelEmail: false,
        canEditTemplates: false,
        canUseFilters: false,
        canUseCustomBranding: false,
    },
    advanced: {
        canUsePercentageDonation: true,
        canSendReceiptEmail: true,
        canSendRefundEmail: true,
        canSendCancelEmail: false,
        canEditTemplates: false,
        canUseFilters: true,
        canUseCustomBranding: false,
    },
    pro: {
        canUsePercentageDonation: true,
        canSendReceiptEmail: true,
        canSendRefundEmail: true,
        canSendCancelEmail: true,
        canEditTemplates: true,
        canUseFilters: true,
        canUseCustomBranding: true,
    },
};

export function checkFeatureAccess(plan: string | null | undefined, feature: keyof PlanFeatures): boolean {
    const planType = (plan as PlanType) || "basic";
    const features = PLAN_FEATURES[planType] || PLAN_FEATURES.basic;
    return !!features[feature];
}

export const PLAN_DETAILS = {
    basic: {
        name: "Basic",
        price: "$1.99",
        description: "Starter level (minimum usable)",
    },
    advanced: {
        name: "Advanced",
        price: "$4.99",
        description: "For growing merchants",
    },
    pro: {
        name: "Pro",
        price: "$9",
        description: "Full power for your store",
    },
};
