export type PlanType = "basic" | "advanced" | "pro";

export interface PlanFeatures {
    maxDonationAmount?: number;
    maxCampaigns: number | null; // null = unlimited
    canUsePercentageDonation: boolean;
    canUseRecurringDonations: boolean;
    canSendReceiptEmail: boolean;
    canSendRefundEmail: boolean;
    canSendCancelEmail: boolean;
    canEditTemplates: boolean;
    canUseFilters: boolean;
    canUseCustomBranding: boolean;
    canSendReminders: boolean;
    canUsePaymentRecovery: boolean;
    showBranding: boolean;
}

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
    basic: {
        maxCampaigns: 1,
        canUsePercentageDonation: false,
        canUseRecurringDonations: false,
        canSendReceiptEmail: true,
        canSendRefundEmail: false,
        canSendCancelEmail: false,
        canEditTemplates: false,
        canUseFilters: false,
        canUseCustomBranding: false,
        canSendReminders: false,
        canUsePaymentRecovery: false,
        showBranding: true,
    },
    advanced: {
        maxCampaigns: null,
        canUsePercentageDonation: true,
        canUseRecurringDonations: true,
        canSendReceiptEmail: true,
        canSendRefundEmail: true,
        canSendCancelEmail: false,
        canEditTemplates: false,
        canUseFilters: true,
        canUseCustomBranding: false,
        canSendReminders: true,
        canUsePaymentRecovery: false,
        showBranding: false,
    },
    pro: {
        maxCampaigns: null,
        canUsePercentageDonation: true,
        canUseRecurringDonations: true,
        canSendReceiptEmail: true,
        canSendRefundEmail: true,
        canSendCancelEmail: true,
        canEditTemplates: true,
        canUseFilters: true,
        canUseCustomBranding: true,
        canSendReminders: true,
        canUsePaymentRecovery: true,
        showBranding: false,
    },
};

export function checkFeatureAccess(plan: string | null | undefined, feature: keyof PlanFeatures, status?: string | null): boolean {
    if (status && status !== "active" && status !== "pending") {
        return false;
    }
    const planType = (plan as PlanType) || "basic";
    const features = PLAN_FEATURES[planType] || PLAN_FEATURES.basic;
    return !!features[feature];
}

export function hasActiveSubscription(
    subscription: { plan?: string | null; status?: string | null } | null | undefined,
    requiredFeature: keyof PlanFeatures
): boolean {
    if (!subscription || subscription.status !== "active") {
        return false;
    }
    const planType = (subscription.plan as PlanType) || "basic";
    const features = PLAN_FEATURES[planType] || PLAN_FEATURES.basic;
    return !!features[requiredFeature];
}


export const PLAN_DETAILS = {
    basic: {
        name: "Basic",
        price: "$0.00",
        description: "Starter level (minimum usable)",
    },
    advanced: {
        name: "Advanced",
        price: "$4.99",
        description: "For growing merchants",
    },
    pro: {
        name: "Pro",
        price: "$9.99",
        description: "Full power for your store",
    },
};
