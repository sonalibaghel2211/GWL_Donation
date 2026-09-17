import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { sendDonationReceipt, formatCurrency } from "../utils/sendgrid.server";
import { hasActiveSubscription } from "../utils/features";

export const action = async ({ request }: ActionFunctionArgs) => {
    let shop = "unknown";
    let topic = "unknown";
    let payload: any;
    let admin: any;
    let session: any;

    try {
        const auth = await authenticate.webhook(request);
        payload = auth.payload;
        admin = auth.admin;
        session = auth.session;
        shop = auth.shop;
        topic = auth.topic;

        if (topic !== "ORDERS_CREATE" && topic !== "ORDERS_PAID") {
            console.warn(`[Webhook] Unexpected topic: ${topic}`);
            return new Response(null, { status: 400 });
        }

        if (!admin) {
            console.error("Admin context is not available for this webhook request.");
            return new Response();
        }

        const order = payload as any;
        const orderId = payload.id?.toString();
        const orderIdStr = order.admin_graphql_api_id || `gid://shopify/Order/${order.id}`;

        // COD Guard: Skip pending payments; processed via orders/paid webhook
        if (topic === "ORDERS_CREATE" && order.financial_status === "pending") {
            return new Response("OK - pending payment, awaiting orders/paid", { status: 200 });
        }

        // Skip if already processed to prevent duplicates
        const [posExists, recExists, roundExists, presetExists] = await Promise.all([
            db.posDonationLog.findFirst({ where: { OR: [{ orderId: orderIdStr }, { orderId: orderId }] } }),
            db.recurringDonationLog.findFirst({ where: { OR: [{ orderId: orderIdStr }, { orderId: orderId }] } }),
            db.roundUpDonationLog.findFirst({ where: { OR: [{ orderId: orderIdStr }, { orderId: orderId }] } }),
            db.donation.findFirst({ where: { OR: [{ orderId: orderIdStr }, { orderId: orderId }] } }),
        ]);

        if (posExists || recExists || roundExists || presetExists) {
            console.log(`[Webhook] ${topic} skipped — order ${order.name} was already processed`);
            return new Response("OK - already processed", { status: 200 });
        }

        const appSettings = await db.appSettings.findUnique({ where: { shop } });
        const isAppEnabled = appSettings?.enabled ?? true;
        if (!isAppEnabled) {
            return new Response("OK - app globally disabled", { status: 200 });
        }

        let subscription = await db.planSubscription.findUnique({ where: { shop } });
        if (!subscription) {
            subscription = {
                id: "default-basic",
                shop,
                plan: "basic",
                subscriptionId: null,
                status: "active",
                createdAt: new Date(),
                updatedAt: new Date(),
                pendingPlan: null,
            };
        }
        if (subscription.status !== "active") {
            return new Response("OK - no active subscription", { status: 200 });
        }

        // Acquire concurrency lock safely (non-blocking if table is missing or fails)
        let lockAcquired = false;
        try {
            const tenSecsAgo = new Date(Date.now() - 10 * 1000);
            await db.webhookProcessingLock.deleteMany({
                where: {
                    OR: [
                        { orderId: orderIdStr, createdAt: { lt: tenSecsAgo } },
                        { orderId: orderId, createdAt: { lt: tenSecsAgo } },
                        { createdAt: { lt: new Date(Date.now() - 30 * 1000) } }
                    ]
                }
            }).catch(() => { });

            await db.webhookProcessingLock.create({
                data: {
                    orderId: orderIdStr,
                    shop,
                    topic,
                }
            });
            lockAcquired = true;
        } catch (lockError: any) {
            // Check if table missing error (P2021) or unknown table
            if (lockError?.code === "P2021" || String(lockError?.message).includes("does not exist")) {
                console.warn("[Webhook] WebhookProcessingLock table does not exist in DB; proceeding without locking.");
                lockAcquired = true;
            } else {
                try {
                    const existingLock = await db.webhookProcessingLock.findFirst({
                        where: { OR: [{ orderId: orderIdStr }, { orderId: orderId }] }
                    }).catch(() => null);
                    if (existingLock && (Date.now() - new Date(existingLock.createdAt).getTime() > 5000)) {
                        await db.webhookProcessingLock.deleteMany({
                            where: { OR: [{ orderId: orderIdStr }, { orderId: orderId }] }
                        }).catch(() => { });
                        try {
                            await db.webhookProcessingLock.create({
                                data: { orderId: orderIdStr, shop, topic }
                            });
                            lockAcquired = true;
                        } catch {
                            console.log(`[Webhook] Concurrency lock active for order ${order.name || orderIdStr}. Topic: ${topic}. Skipping.`);
                            return new Response("OK - processing in progress", { status: 200 });
                        }
                    } else if (!existingLock) {
                        lockAcquired = true;
                    } else {
                        console.log(`[Webhook] Concurrency lock active for order ${order.name || orderIdStr}. Topic: ${topic}. Skipping.`);
                        return new Response("OK - processing in progress", { status: 200 });
                    }
                } catch {
                    // Fallback on any DB lock query failure: proceed with processing rather than crashing
                    lockAcquired = true;
                }
            }
        }

        try {

            const customerName = payload.customer
                ? `${payload.customer.first_name || ""} ${payload.customer.last_name || ""}`.trim()
                : (order.billing_address?.name || "Anonymous");
            const customerEmail = payload.email || payload.contact_email || payload.customer?.email || "No Email provided";
            const currency = payload.currency || "USD";
            const createdAt = payload.created_at ? new Date(payload.created_at) : new Date();

            let hasCampaignDonation = false;
            let hasCampaignRecurring = false;  // campaign product ordered WITH a selling plan
            let campaignRecurringNames: string[] = [];    // carry campaign names from HEAD LOGIC to STAGING (supports multi-product)
            let donationAmtCents = 0;

            let hasDirectDonationProduct = false;
            let directDonationName = "Charity Donation";
            let directDonationAmountCents = 0;
            let hasRoundUpDonation = false;
            let roundUpAmountCents = 0;
            let directOneTimeDonationAmtCents = 0;
            let recurringDonationAmtCents = 0;

            // Collect all donation line items for multi-product email support
            let donationLineItems: Array<{ title: string; amount: string; image?: string; sellingPlan?: string }> = [];

            const config = await (db as any).recurringDonationConfig.findUnique({ where: { shop } });

            // -------------------------
            // HEAD LOGIC: Campaign Donations 
            // -------------------------
            if (payload.line_items && Array.isArray(payload.line_items)) {
                for (const item of payload.line_items) {
                    if (!item.product_id) continue;

                    if (config && String(item.product_id) === String(config.productId)) {
                        continue;
                    }

                    try {
                        const productIdStr = item.product_id.toString();
                        const variantIdStr = item.variant_id?.toString() || null;

                        // Check line item properties for campaign name or donation indicators
                        const campaignProp = (item.properties || []).find(
                            (p: any) => ["Donation Campaign", "_donation_campaign", "Campaign", "_campaign"].includes(p.name)
                        );
                        const donationAmountProp = (item.properties || []).find(
                            (p: any) => ["_Donation Amount", "Donation Amount", "donation_amount", "_donation_amount"].includes(p.name)
                        );
                        const widgetActiveProp = (item.properties || []).find(
                            (p: any) => ["_donation_widget_active", "donation_widget_active"].includes(p.name)
                        );

                        let matchingCampaign: any = null;

                        // 1. Match by campaign name from line item property
                        if (campaignProp?.value) {
                            matchingCampaign = await db.campaign.findFirst({
                                where: { shop, name: String(campaignProp.value) }
                            });
                        }

                        // 2. Match by shopifyProductId
                        if (!matchingCampaign && productIdStr) {
                            matchingCampaign = await db.campaign.findFirst({
                                where: {
                                    shop: shop,
                                    shopifyProductId: { endsWith: productIdStr },
                                },
                            });
                        }

                        // 3. Match by line item title
                        if (!matchingCampaign && item.title) {
                            matchingCampaign = await db.campaign.findFirst({
                                where: { shop, name: String(item.title) }
                            });
                        }

                        // 4. Match by variant ID in shopifyVariantIds
                        if (!matchingCampaign && variantIdStr) {
                            matchingCampaign = await db.campaign.findFirst({
                                where: {
                                    shop,
                                    shopifyVariantIds: { contains: variantIdStr }
                                }
                            });
                        }

                        // 5. Fallback: line item has explicit donation properties or donation title
                        const hasDonationProp = (item.properties || []).some((p: any) =>
                            ["Donation Campaign", "_donation_campaign", "_Donation Amount", "Donation Amount", "_donation_widget_active", "Custom Amount"].includes(p.name)
                        );
                        if (!matchingCampaign && (hasDonationProp || (item.title && item.title.toLowerCase().includes("donation")))) {
                            matchingCampaign = await db.campaign.findFirst({ where: { shop } });
                        }

                        if (matchingCampaign) {
                            const hasSellingPlan = !!(item.selling_plan_allocation);
                            const hasSellingPlanProp = (item.properties || []).some(
                                (p: any) => ["selling_plan", "_selling_plan_id"].includes(p.name)
                            );
                            if (hasSellingPlan || hasSellingPlanProp) {
                                const basePrice = parseFloat(item.price || "0") * (item.quantity || 1);
                                const lineDiscount = parseFloat(item.total_discount || "0");
                                const recurringAmt = Math.max(0, basePrice - lineDiscount);
                                donationAmtCents += Math.round(recurringAmt * 100);
                                recurringDonationAmtCents += Math.round(recurringAmt * 100);
                                hasCampaignDonation = true;
                                hasCampaignRecurring = true;
                                campaignRecurringNames.push(matchingCampaign.name || "Campaign Donation");
                                // Collect for multi-product email
                                donationLineItems.push({
                                    title: item.title || matchingCampaign.name || "Campaign Donation",
                                    amount: recurringAmt.toFixed(2),
                                    sellingPlan: item.selling_plan_allocation?.selling_plan_name || "Recurring Donation",
                                });
                                continue;
                            }

                            const basePrice = parseFloat(item.price || "0") * (item.quantity || 1);
                            const lineDiscount = parseFloat(item.total_discount || "0");
                            const donationAmount = Math.max(0, basePrice - lineDiscount);
                            donationAmtCents += Math.round(donationAmount * 100);
                            const donationAmtFormatted = donationAmount.toFixed(2);

                            try {
                                await db.donation.upsert({
                                    where: {
                                        orderId_shopifyVariantId: {
                                            orderId: orderId,
                                            shopifyVariantId: variantIdStr || "unknown",
                                        },
                                    },
                                    create: {
                                        campaignId: matchingCampaign.id,
                                        orderId: orderId,
                                        orderNumber: order.name,
                                        amount: donationAmount,
                                        currency: currency,
                                        donorName: customerName,
                                        donorEmail: customerEmail,
                                        shopifyProductId: productIdStr,
                                        shopifyVariantId: variantIdStr || "unknown",
                                        createdAt: createdAt,
                                    },
                                    update: {
                                        amount: donationAmount,
                                        orderNumber: order.name,
                                    },
                                });
                                hasCampaignDonation = true;
                                // Set a descriptive name for consolidated email
                                if (!hasDirectDonationProduct && !hasRoundUpDonation) {
                                    directDonationName = matchingCampaign.name || "Preset Donation";
                                }
                                // Collect for multi-product email
                                donationLineItems.push({
                                    title: item.title || matchingCampaign.name || "Preset Donation",
                                    amount: donationAmount.toFixed(2),
                                });
                            } catch (dbError) {
                                console.error("Error inserting donation record:", dbError);
                            }
                        }
                    } catch (error) {
                        console.error("Error processing line item:", error);
                    }
                }
            }

            // -------------------------
            // STAGING LOGIC: POS / Recurring / Round-up
            // -------------------------
            const settings = await (db as any).posDonationSettings.findUnique({ where: { shop } });
            const roundupSettings = await (db as any).roundUpDonationSettings.findUnique({ where: { shop } });

            const defaultSettings = {
                enabled: true, // Default to true for POS discovery if settings missing
                donationType: "fixed",
                donationBasis: "order",
                donationValue: 5,
                minimumValue: 0,
                orderTag: "galaxy_pos_donation"
            };

            const effectiveSettings = settings || defaultSettings;
            const isSettingsEnabled = effectiveSettings.enabled;
            const plan = subscription?.plan || "basic";

            const DONATION_PRODUCT_ID = config?.productId || "9946640679159";

            let isRecurring = false;
            let recurringSellingPlanId: string | null = null;
            let subscriptionContractId: string | null = null;
            // hasDirectDonationProduct, directDonationName, directDonationAmountCents,
            // hasRoundUpDonation, roundUpAmountCents are now declared before HEAD LOGIC (line ~52)

            // Detection Loop
            for (const lineItem of (order.line_items || [])) {
                const isItemRecurring = !!(lineItem.selling_plan_allocation) || (lineItem.properties || []).some(
                    (p: any) => ["selling_plan", "_selling_plan_id"].includes(p.name)
                );

                // Check for explicit donation product (Preset/Recurring)
                if (String(lineItem.product_id) === String(DONATION_PRODUCT_ID)) {
                    hasDirectDonationProduct = true;
                    directDonationName = lineItem.title || "Charity Donation";
                    const itemPriceCents = Math.round(parseFloat(lineItem.price || 0) * 100) * (lineItem.quantity || 1);
                    directDonationAmountCents += itemPriceCents;

                    if (isItemRecurring) {
                        recurringDonationAmtCents += itemPriceCents;
                    } else {
                        directOneTimeDonationAmtCents += itemPriceCents;
                    }

                    // Collect for multi-product email
                    const itemAmt = (parseFloat(lineItem.price || 0) * (lineItem.quantity || 1)).toFixed(2);
                    donationLineItems.push({
                        title: lineItem.title || "Charity Donation",
                        amount: itemAmt,
                        sellingPlan: isItemRecurring ? (lineItem.selling_plan_allocation?.selling_plan_name || "Recurring Donation") : undefined,
                    });
                } else if (isItemRecurring) {
                    // Robust Fallback: Any other product with a selling plan that was not captured by campaign logic
                    const alreadyProcessed = donationLineItems.some(dl => dl.title === lineItem.title);
                    if (!alreadyProcessed) {
                        const itemPriceCents = Math.round(parseFloat(lineItem.price || 0) * 100) * (lineItem.quantity || 1);
                        donationAmtCents += itemPriceCents;
                        recurringDonationAmtCents += itemPriceCents;

                        const itemAmt = (parseFloat(lineItem.price || 0) * (lineItem.quantity || 1)).toFixed(2);
                        donationLineItems.push({
                            title: lineItem.title || "Charity Donation",
                            amount: itemAmt,
                            sellingPlan: lineItem.selling_plan_allocation?.selling_plan_name || "Recurring Donation",
                        });
                    }
                }

                // Check for Round-Up properties (Standard 'roundup' or Custom 'extra')
                const typeProp = (lineItem.properties || []).find((p: any) => {
                    const nameLower = String(p.name).toLowerCase();
                    return nameLower === "type" || nameLower === "_type";
                });

                if (typeProp) {
                    const valLower = String(typeProp.value).toLowerCase();
                    if (valLower === "roundup" || valLower === "extra") {
                        hasRoundUpDonation = true;
                        const basePrice = parseFloat(lineItem.price || 0) * (lineItem.quantity || 1);
                        const lineDiscount = parseFloat(lineItem.total_discount || 0);
                        roundUpAmountCents += Math.round(Math.max(0, basePrice - lineDiscount) * 100);
                    }
                }

                if (lineItem.selling_plan_allocation) {
                    isRecurring = true;
                    recurringSellingPlanId = lineItem.selling_plan_allocation.selling_plan_id
                        ? `gid://shopify/SellingPlan/${lineItem.selling_plan_allocation.selling_plan_id}`
                        : null;

                    if (lineItem.selling_plan_allocation.subscription_contract_id) {
                        subscriptionContractId = lineItem.selling_plan_allocation.subscription_contract_id.includes("gid://")
                            ? lineItem.selling_plan_allocation.subscription_contract_id
                            : `gid://shopify/SubscriptionContract/${lineItem.selling_plan_allocation.subscription_contract_id}`;
                    }
                } else {
                    const spProp = (lineItem.properties || []).find((p: any) => p.name === "selling_plan" || p.name === "_selling_plan_id");
                    if (spProp) {
                        isRecurring = true;
                        recurringSellingPlanId = String(spProp.value).includes("gid://") ? String(spProp.value) : `gid://shopify/SellingPlan/${spProp.value}`;
                    }

                    const subProp = (lineItem.properties || []).find((p: any) => p.name === "subscription_id" || p.name === "_subscription_id");
                    if (subProp) {
                        isRecurring = true;
                        subscriptionContractId = String(subProp.value).includes("gid://") ? String(subProp.value) : `gid://shopify/SubscriptionContract/${subProp.value}`;
                    }
                }
            }

            // Apply Tagging and Logic (Consolidated Section)
            let isApplicable = false;
            let isPosDonationSource = false;
            let frequency: "one_time" | "monthly" | "weekly" = "one_time";
            let samplePriceCents = 0;

            // Check if this is a renewal order from a billing attempt
            // Shopify uses "subscription_contract" in docs but actually sends
            // "subscription_contract_checkout_one" for auto-renewal orders.
            const isSubscriptionRenewal = order.source_name === "subscription_contract"
                || order.source_name === "subscription_contract_checkout_one";
            if (isSubscriptionRenewal) {
                isRecurring = true;
                isApplicable = true;

                // Shopify renewal orders store contract numeric ID in source_identifier
                if (!subscriptionContractId && order.source_identifier) {
                    const sourceId = String(order.source_identifier);
                    subscriptionContractId = sourceId.startsWith("gid://")
                        ? sourceId
                        : `gid://shopify/SubscriptionContract/${sourceId}`;
                    console.log(`[Webhook] Extracted subscriptionContractId from source_identifier: ${subscriptionContractId}`);
                }

                // Try to find the billing attempt log to copy frequency and contract details
                try {
                    // Build search criteria — subscriptionContractId is most reliable
                    // Include "pending" status since the billing success webhook may not have fired yet
                    const searchCriteria: any[] = [];
                    if (subscriptionContractId) {
                        searchCriteria.push({ subscriptionContractId, shop, status: { in: ["success", "pending"] } });
                    }
                    searchCriteria.push({ orderId: orderIdStr });
                    if (customerEmail && customerEmail !== "No Email provided") {
                        searchCriteria.push({ customerEmail, shop, status: { in: ["success", "pending"] } });
                    }

                    const billingLog = await db.billingAttemptLog.findFirst({
                        where: { OR: searchCriteria },
                        orderBy: { createdAt: "desc" }
                    });

                    if (billingLog) {
                        subscriptionContractId = subscriptionContractId || billingLog.subscriptionContractId;
                        if (billingLog.frequency?.toLowerCase().includes("week")) {
                            frequency = "weekly";
                        } else if (billingLog.frequency?.toLowerCase().includes("month")) {
                            frequency = "monthly";
                        }
                        console.log(`[Webhook] Renewal frequency from billingLog: ${frequency}`);
                    } else {
                        if (subscriptionContractId) {
                            const recLog = await db.recurringDonationLog.findFirst({
                                where: { shop, subscriptionContractId },
                                orderBy: { createdAt: "desc" }
                            });
                            if (recLog) {
                                if (recLog.frequency === "weekly") frequency = "weekly";
                                else if (recLog.frequency === "monthly") frequency = "monthly";
                                console.log(`[Webhook] Renewal frequency from RecurringDonationLog: ${frequency}`);
                            }
                        }
                    }

                    // Fallback: Query Shopify for contract frequency
                    if (frequency === "one_time" && subscriptionContractId && admin) {
                        try {
                            const contractResp = await admin.graphql(`#graphql
                            query getContractFrequency($id: ID!) {
                                subscriptionContract(id: $id) {
                                    id
                                    status
                                    billingPolicy {
                                        interval
                                        intervalCount
                                    }
                                    lines(first: 1) {
                                        edges {
                                            node {
                                                sellingPlanName
                                                currentPrice { amount }
                                            }
                                        }
                                    }
                                }
                            }`, { variables: { id: subscriptionContractId } });
                            const contractJson: any = await contractResp.json();
                            const contractData = contractJson.data?.subscriptionContract;
                            const sellingPlanName = contractData?.lines?.edges?.[0]?.node?.sellingPlanName || "";
                            const billingInterval = contractData?.billingPolicy?.interval || "";

                            // Try selling plan name first (e.g. "Weekly Donation", "Monthly Donation")
                            if (sellingPlanName.toLowerCase().includes("week")) {
                                frequency = "weekly";
                            } else if (sellingPlanName.toLowerCase().includes("month")) {
                                frequency = "monthly";
                            }
                            // Fallback to billingPolicy.interval ("WEEK" or "MONTH")
                            else if (billingInterval.toUpperCase() === "WEEK") {
                                frequency = "weekly";
                            } else if (billingInterval.toUpperCase() === "MONTH") {
                                frequency = "monthly";
                            }
                            console.log(`[Webhook] Renewal frequency from GraphQL contract (sellingPlan: "${sellingPlanName}", billingInterval: "${billingInterval}"): ${frequency}`);
                        } catch (gqlErr) {
                            console.error("[Webhook] Error querying contract for frequency:", gqlErr);
                        }
                    }
                } catch (err) {
                    console.error("Error matching renewal order details from db:", err);
                }
            }

            if (isRecurring && recurringSellingPlanId) {
                isApplicable = true; // Subscriptions are always donations
                if (config) {
                    const spId = recurringSellingPlanId.split('/').pop() || "";
                    if (config.monthlyPlanId?.includes(spId)) frequency = "monthly";
                    else if (config.weeklyPlanId?.includes(spId)) frequency = "weekly";
                }
            }

            // Detect properties-based subscriptions
            for (const lineItem of (order.line_items || [])) {
                const spProp = (lineItem.properties || []).find((p: any) => p.name === "selling_plan" || p.name === "_selling_plan_id");
                if (spProp) {
                    isRecurring = true;
                    isApplicable = true;
                }
                const subProp = (lineItem.properties || []).find((p: any) => p.name === "subscription_id" || p.name === "_subscription_id");
                if (subProp) {
                    isRecurring = true;
                    isApplicable = true;
                }
            }
            // donationAmtCents already initialized at top
            const totalCents = parseFloat(order.total_price || 0) * 100;
            const minValCents = (effectiveSettings.minimumValue || 0) * 100;

            // Flow A: Explicit Product (Preset/Recurring)
            if (hasDirectDonationProduct) {
                isApplicable = true;
                donationAmtCents += directDonationAmountCents;
                samplePriceCents = totalCents;
            }

            // Flow B: Round-Up Donation
            if (hasRoundUpDonation) {
                isApplicable = true;
                donationAmtCents += roundUpAmountCents;
                if (!hasDirectDonationProduct) {
                    directDonationName = roundupSettings?.campaignTitle || "Round-Up Donation";
                }
            }

            if (!isApplicable && isSettingsEnabled) {
                if (effectiveSettings.donationType === "percentage" && !hasActiveSubscription(subscription, "canUsePercentageDonation")) {
                } else {
                    const widgetActive = (order.note_attributes || []).some((attr: any) => attr.name === "_donation_widget_active" && attr.value === "true");
                    const isWeb = order.source_name === "web";
                    const isPos = order.source_name === "pos";

                    if (isWeb && !widgetActive) {
                        // Skip
                    } else if (isPos || widgetActive) {
                        if (effectiveSettings.donationBasis === 'product') {
                            for (const lineItem of (order.line_items || [])) {
                                const itemPriceCents = parseFloat(lineItem.price || 0) * 100;
                                const quantity = lineItem.quantity || 1;
                                const lineTotalCents = itemPriceCents * quantity;

                                if (lineTotalCents >= minValCents) {
                                    isApplicable = true;
                                    isPosDonationSource = true;
                                    donationAmtCents += effectiveSettings.donationType === "percentage"
                                        ? (effectiveSettings.donationValue / 100) * lineTotalCents
                                        : effectiveSettings.donationValue * 100 * quantity;
                                }
                            }
                        } else if (totalCents >= minValCents) {
                            isApplicable = true;
                            isPosDonationSource = true;
                            samplePriceCents = totalCents;
                            const calculatedDonation = effectiveSettings.donationType === "percentage" ? (effectiveSettings.donationValue / 100) * samplePriceCents : effectiveSettings.donationValue * 100;
                            donationAmtCents += calculatedDonation;
                        }
                    }
                }
            }

            if (isApplicable || hasCampaignDonation) {
                // Skip if email was already sent
                const [posSent, recSent, roundSent, presetSent] = await Promise.all([
                    (db as any).posDonationLog.findFirst({ where: { orderId: orderIdStr, receiptStatus: "sent" } }),
                    (db as any).recurringDonationLog.findFirst({ where: { orderId: orderIdStr, receiptStatus: "sent" } }),
                    (db as any).roundUpDonationLog.findFirst({ where: { orderId: orderIdStr, receiptStatus: "sent" } }),
                    (db as any).donation.findFirst({ where: { orderId: orderId, receiptStatus: "sent" } }),
                ]);

                if (posSent || recSent || roundSent || presetSent) {
                    return new Response("OK", { status: 200 });
                }

                const donationAmtFormatted = (donationAmtCents / 100).toFixed(2);
                let emailStatus = "pending";
                let sentDate = null;
                let currentCustomerEmail = customerEmail;
                let currentCustomerName = customerName;

                if (admin) {
                    try {
                        const resp = await admin.graphql(`#graphql
                        query getOrder($id: ID!) { 
                          order(id: $id) { 
                            email 
                            customer { id } 
                            billingAddress { firstName lastName } 
                            lineItems(first: 20) {
                              edges {
                                node {
                                  variant {
                                    product {
                                      id
                                      featuredImage {
                                        url
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          } 
                        }`,
                            { variables: { id: orderIdStr } }
                        );
                        const data = await resp.json();
                        const fresh = data.data?.order;
                        if (fresh) {
                            if (fresh.customer?.id) (order as any).customer_gql_id = fresh.customer.id;
                            if (fresh.email) currentCustomerEmail = fresh.email;
                            if (fresh.billingAddress) currentCustomerName = `${fresh.billingAddress.firstName || ""} ${fresh.billingAddress.lastName || ""}`.trim();

                            const gqlLineItems = fresh.lineItems?.edges?.map((e: any) => e.node) || [];
                            // Find donation product image to avoid showing wrong product image in mixed carts
                            let gqlDonationItem = gqlLineItems.find((li: any) => {
                                const productGid = li.variant?.product?.id || "";
                                return productGid.endsWith(`/${DONATION_PRODUCT_ID}`) && li.variant?.product?.featuredImage?.url;
                            });
                            // Fallback: match against donation/campaign line items from webhook payload only
                            if (!gqlDonationItem) {
                                // Collect product IDs of known donation items (global donation product + campaign products)
                                const donationProductIds: string[] = [String(DONATION_PRODUCT_ID)];
                                for (const dli of donationLineItems) {
                                    const matchedLi = (order.line_items || []).find((li: any) => li.title === dli.title);
                                    if (matchedLi?.product_id) donationProductIds.push(String(matchedLi.product_id));
                                }
                                gqlDonationItem = gqlLineItems.find((li: any) => {
                                    const productGid = li.variant?.product?.id || "";
                                    return donationProductIds.some((pid: string) => productGid.endsWith(`/${pid}`)) && li.variant?.product?.featuredImage?.url;
                                });
                            }
                            if (gqlDonationItem?.variant?.product?.featuredImage?.url) {
                                (order as any).donation_product_image = gqlDonationItem.variant.product.featuredImage.url;
                            }
                        }
                    } catch (e) {
                        console.error("GQL Refresh Error:", e);
                    }
                }

                // isSubscriptionRenewal is already resolved at the outer scope (line ~307)
                // No re-declaration needed — renewal orders are detected by source_name,
                // while manual checkout recurring orders are handled via hasDirectDonationProduct / hasCampaignRecurring.

                if (currentCustomerEmail !== "No Email provided" && hasActiveSubscription(subscription, "canSendReceiptEmail")) {
                    const freqLabel = frequency === "weekly" ? "Weekly" : frequency === "monthly" ? "Monthly" : "One-time";

                    const shippingAddr = order.shipping_address
                        ? `${order.shipping_address.name}\n${order.shipping_address.address1}${order.shipping_address.address2 ? ` ${order.shipping_address.address2}` : ""}\n${order.shipping_address.city}, ${order.shipping_address.province_code || ""} ${order.shipping_address.zip}\n${order.shipping_address.country}`
                        : "";
                    const billingAddr = order.billing_address
                        ? `${order.billing_address.name}\n${order.billing_address.address1}${order.billing_address.address2 ? ` ${order.billing_address.address2}` : ""}\n${order.billing_address.city}, ${order.billing_address.province_code || ""} ${order.billing_address.zip}\n${order.billing_address.country}`
                        : "";

                    // Look for the global donation product first, then fall back to any campaign product
                    let donationItem = (order.line_items || []).find((li: any) => String(li.product_id) === String(DONATION_PRODUCT_ID));
                    if (!donationItem && (hasCampaignDonation || donationLineItems.length > 0)) {
                        // For campaign products: find the first line item that matched a campaign
                        donationItem = (order.line_items || []).find((li: any) => {
                            return li.properties && li.properties.some?.((p: any) => p.name === "Donation Campaign");
                        }) || (order.line_items || []).find((li: any) => {
                            // Fallback: check if any line item's product matches a known campaign product or processed list
                            return donationLineItems.some(dl => dl.title === li.title);
                        });
                    }

                    let interval = frequency === "weekly" ? "WEEK" : "MONTH";
                    let intervalCount = 1;

                    if (admin) {
                        try {
                            if (recurringSellingPlanId) {
                                const planResp = await admin.graphql(`#graphql
                                query getSellingPlan($id: ID!) {
                                    node(id: $id) {
                                        ... on SellingPlan {
                                            billingPolicy {
                                                ... on SellingPlanRecurringBillingPolicy {
                                                    interval
                                                    intervalCount
                                                }
                                            }
                                        }
                                    }
                                }`, { variables: { id: recurringSellingPlanId } });
                                const planJson = await planResp.json();
                                const policy = planJson.data?.node?.billingPolicy;
                                if (policy) {
                                    interval = policy.interval || interval;
                                    intervalCount = policy.intervalCount || 1;
                                }
                            } else if (subscriptionContractId) {
                                const contractResp = await admin.graphql(`#graphql
                                query getContract($id: ID!) {
                                    node(id: $id) {
                                        ... on SubscriptionContract {
                                            billingPolicy {
                                                interval
                                                intervalCount
                                            }
                                        }
                                    }
                                }`, { variables: { id: subscriptionContractId } });
                                const contractJson = await contractResp.json();
                                const policy = contractJson.data?.node?.billingPolicy;
                                if (policy) {
                                    interval = policy.interval || interval;
                                    intervalCount = policy.intervalCount || 1;
                                }
                            }
                        } catch (err) {
                            console.error("[Webhook] Error querying billing policy:", err);
                        }
                    }

                    let nextBillingDate = "";
                    const today = new Date();
                    if (interval.toUpperCase() === "WEEK") {
                        today.setDate(today.getDate() + (intervalCount * 7));
                        nextBillingDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    } else if (interval.toUpperCase() === "MONTH") {
                        today.setMonth(today.getMonth() + intervalCount);
                        nextBillingDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    }

                    let paymentMethod = "Ending in card";
                    if (order.payment_details?.credit_card_number) {
                        const last4 = order.payment_details.credit_card_number.slice(-4);
                        paymentMethod = `Ending in ${last4}`;
                    } else if (order.payment_gateway_names?.length > 0) {
                        paymentMethod = order.payment_gateway_names[0];
                    }

                    // Resolve product title: prefer actual line item title, then campaign name
                    const resolvedProductTitle = donationItem?.title || campaignRecurringNames[0] || (donationLineItems[0]?.title) || directDonationName;
                    const resolvedDonationName = campaignRecurringNames.join(", ") || (donationLineItems.map(d => d.title).join(", ")) || directDonationName;

                    const res = await sendDonationReceipt({
                        email: currentCustomerEmail,
                        name: currentCustomerName,
                        amount: donationAmtFormatted,
                        orderNumber: order.name,
                        type: isSubscriptionRenewal ? "renewal" : "receipt",
                        shop,
                        donationName: resolvedDonationName,
                        frequency: freqLabel,
                        shippingAddress: shippingAddr,
                        billingAddress: billingAddr,
                        productTitle: resolvedProductTitle,
                        manageUrl: frequency !== "one_time" ? `https://${shop}/apps/smart-donate-enhancement/subscriptions` : undefined,
                        nextBillingDate: nextBillingDate,
                        paymentMethod: paymentMethod,
                        productImage: (order as any).donation_product_image,
                        // Pass all donation line items for multi-product email
                        lineItems: donationLineItems.length > 1 ? donationLineItems : undefined,
                        currency: order.currency || "USD",
                    });
                    if (res.success) {
                        emailStatus = "sent";
                        sentDate = new Date();
                    } else {
                        emailStatus = "failed";
                    }
                } else {
                    emailStatus = currentCustomerEmail !== "No Email provided" ? "skipped" : "failed";
                }

                try {
                    let loggedAny = false;

                    // 1. Recurring Donation (Global subscription product, Campaign with selling plan, OR subscription renewal)
                    if ((hasDirectDonationProduct && frequency !== "one_time") || (hasCampaignRecurring && frequency !== "one_time") || (isSubscriptionRenewal && isRecurring)) {
                        // For renewal orders, frequency should already be detected from DB/GraphQL lookups above.
                        // Only as an absolute last resort (all 3 detection methods failed), keep the detected frequency.
                        const logFrequency = frequency;
                        const logAmount = recurringDonationAmtCents > 0
                            ? recurringDonationAmtCents / 100
                            : (directDonationAmountCents > 0 ? directDonationAmountCents / 100 : parseFloat(order.total_price || 0));
                        await db.recurringDonationLog.upsert({
                            where: { orderId: orderIdStr },
                            update: {
                                subscriptionContractId: subscriptionContractId,
                                type: "recurring",
                                frequency: logFrequency,
                            },
                            create: {
                                shop,
                                orderId: orderIdStr,
                                orderNumber: order.name,
                                donationAmount: logAmount,
                                orderTotal: parseFloat(order.total_price || 0),
                                currency: order.currency || "USD",
                                receiptStatus: emailStatus,
                                receiptSentAt: sentDate,
                                sellingPlanId: recurringSellingPlanId,
                                frequency: logFrequency,
                                subscriptionContractId: subscriptionContractId,
                                type: "recurring",
                            },
                        });
                        // Update frequency variable for downstream tagging/notes if it was defaulted
                        if (isSubscriptionRenewal && frequency === "one_time") {
                            frequency = logFrequency as typeof frequency;
                        }
                        loggedAny = true;
                        console.log(`[Webhook] RecurringDonationLog created for order ${order.name}, frequency: ${logFrequency}`);
                    }

                    // Guard: skip for subscription renewal orders
                    if (hasDirectDonationProduct && frequency === "one_time" && !isSubscriptionRenewal) {
                        try {
                            const donationItem = (order.line_items || []).find((li: any) => String(li.product_id) === String(DONATION_PRODUCT_ID));
                            let campaignNameFromProp = "";
                            if (donationItem && donationItem.properties) {
                                const prop = donationItem.properties.find((p: any) => p.name === "Donation Campaign");
                                if (prop) {
                                    campaignNameFromProp = prop.value;
                                }
                            }

                            let campaign = null;
                            if (campaignNameFromProp) {
                                campaign = await db.campaign.findFirst({
                                    where: {
                                        shop: shop,
                                        name: campaignNameFromProp
                                    }
                                });
                            }

                            if (!campaign) {
                                campaign = await db.campaign.findFirst({
                                    where: {
                                        shop: shop,
                                        OR: [
                                            { name: { contains: "General" } },
                                            { name: { contains: "One-time" } },
                                            { name: { contains: "Donation" } }
                                        ]
                                    }
                                });
                            }

                            if (!campaign) {
                                campaign = await db.campaign.findFirst({ where: { shop } });
                            }

                            if (campaign) {
                                const variantIdStr = donationItem?.variant_id?.toString() || "unknown";

                                await db.donation.upsert({
                                    where: {
                                        orderId_shopifyVariantId: {
                                            orderId: orderId,
                                            shopifyVariantId: variantIdStr,
                                        },
                                    },
                                    create: {
                                        campaignId: campaign.id,
                                        orderId: orderId,
                                        orderNumber: order.name,
                                        amount: directOneTimeDonationAmtCents / 100,
                                        currency: currency,
                                        donorName: currentCustomerName,
                                        donorEmail: currentCustomerEmail,
                                        shopifyProductId: String(DONATION_PRODUCT_ID),
                                        shopifyVariantId: variantIdStr,
                                        createdAt: createdAt,
                                        receiptStatus: emailStatus,
                                    },
                                    update: {
                                        amount: directOneTimeDonationAmtCents / 100,
                                        orderNumber: order.name,
                                        receiptStatus: emailStatus,
                                    },
                                });
                                hasCampaignDonation = true;
                                loggedAny = true;
                            }
                        } catch (dbErr) {
                            console.error("[Webhook] Error saving preset donation to DB:", dbErr);
                        }
                    }

                    // 3. Round-up Donation
                    if (hasRoundUpDonation) {
                        await db.roundUpDonationLog.upsert({
                            where: { orderId: orderIdStr },
                            update: {
                                type: "roundup",
                            },
                            create: {
                                shop,
                                orderId: orderIdStr,
                                orderNumber: order.name,
                                donationAmount: roundUpAmountCents / 100,
                                orderTotal: parseFloat(order.total_price || 0),
                                currency: order.currency || "USD",
                                status: "active",
                                receiptStatus: emailStatus,
                                receiptSentAt: sentDate,
                                isResent: false,
                                type: "roundup",
                            },
                        });
                        loggedAny = true;
                    }

                    // 4. One-time Campaign Preset Donation (updating its status if written during line-items loop)
                    if (hasCampaignDonation) {
                        try {
                            await db.donation.updateMany({
                                where: { orderId: orderId, receiptStatus: { not: "sent" } },
                                data: { receiptStatus: emailStatus },
                            });
                            loggedAny = true;
                        } catch (updateErr) {
                            console.warn("[Webhook] Could not update donation receipt status (non-fatal):", updateErr);
                        }
                    }

                    // 5. Fallback POS Donation (only if no other donation types logged)
                    if (!loggedAny) {
                        await db.posDonationLog.upsert({
                            where: { orderId: orderIdStr },
                            update: {
                                type: "pos",
                            },
                            create: {
                                shop,
                                orderId: orderIdStr,
                                orderNumber: order.name,
                                donationAmount: parseFloat(donationAmtFormatted),
                                orderTotal: parseFloat(order.total_price || 0),
                                currency: order.currency || "USD",
                                status: "active",
                                receiptStatus: emailStatus,
                                receiptSentAt: sentDate,
                                isResent: false,
                                type: "pos",
                            },
                        });
                    }
                } catch (e) {
                    console.error("DB Log Error:", e);
                }

                if (admin) {
                    try {
                        const existingTags = order.tags ? order.tags.split(',').map((t: any) => t.trim()) : [];

                        if (hasDirectDonationProduct || hasCampaignRecurring || isSubscriptionRenewal) {
                            // For global widget items, campaign products with selling plans, AND subscription renewals
                            const isSub = frequency !== "one_time" || isSubscriptionRenewal;
                            // Use the detected frequency directly — it was resolved from billingLog / RecurringDonationLog / GraphQL
                            const orderTag = isSub ? (frequency === "monthly" ? "recurring_donation_monthly" : "recurring_donation_weekly") : "preset_donation";
                            const customerTag = isSub ? (frequency === "monthly" ? "recurring_donor_monthly" : "recurring_donor_weekly") : "onetime_donor";

                            if (!existingTags.includes(orderTag)) existingTags.push(orderTag);

                            const customerId = (order as any).customer_gql_id || (order.customer?.id ? `gid://shopify/Customer/${order.customer.id}` : null);
                            if (customerId) {
                                await admin.graphql(`#graphql
                                mutation tagsAdd($id: ID!, $tags: [String!]!) { tagsAdd(id: $id, tags: $tags) { node { id } } }`,
                                    { variables: { id: customerId, tags: [customerTag] } }
                                );
                            }
                        }

                        if (hasRoundUpDonation) {
                            const roundupTag = roundupSettings?.donationOrderTag || "roundup_donation";
                            if (!existingTags.includes(roundupTag)) existingTags.push(roundupTag);
                        }

                        if (isPosDonationSource) {
                            const baseTag = effectiveSettings.orderTag || "galaxy_pos_donation";
                            if (!existingTags.includes(baseTag)) existingTags.push(baseTag);
                        }

                        // Guard: only add preset_donation tag for actual one-time preset donations
                        if (hasCampaignDonation && !isSubscriptionRenewal) {
                            if (!existingTags.includes("preset_donation")) existingTags.push("preset_donation");

                            const customerId = (order as any).customer_gql_id || (order.customer?.id ? `gid://shopify/Customer/${order.customer.id}` : null);
                            if (customerId) {
                                await admin.graphql(`#graphql
                                mutation tagsAdd($id: ID!, $tags: [String!]!) { tagsAdd(id: $id, tags: $tags) { node { id } } }`,
                                    { variables: { id: customerId, tags: ["onetime_donor"] } }
                                );
                            }
                        }

                        const currentAttrs = (order.note_attributes || [])
                            .filter((a: any) => a.name !== "POS Donation Amount")
                            .map((a: any) => ({ key: a.name, value: a.value }));

                        let donationLabel = "Donation Amount";
                        let donationTypeLabel = "Donation Type";

                        const activeTypes: string[] = [];
                        if (hasCampaignRecurring && frequency !== "one_time") {
                            activeTypes.push(frequency === "monthly" ? "Monthly" : "Weekly");
                        }
                        if ((hasCampaignDonation || (hasDirectDonationProduct && frequency === "one_time")) && !isSubscriptionRenewal) {
                            activeTypes.push("Preset");
                        }
                        if (hasDirectDonationProduct && frequency !== "one_time") {
                            activeTypes.push(frequency === "monthly" ? "Monthly" : "Weekly");
                        }
                        if (hasRoundUpDonation) {
                            activeTypes.push("Round-Up");
                        }

                        // ── Fix: Subscription renewal orders should show Weekly/Monthly, not POS ──
                        if (isSubscriptionRenewal && activeTypes.length === 0) {
                            // Use the detected frequency directly (weekly or monthly)
                            activeTypes.push(frequency === "monthly" ? "Monthly" : "Weekly");
                        }

                        if (activeTypes.length === 0) {
                            activeTypes.push("POS");
                        }

                        // Deduplicate and join with comma
                        const uniqueTypes = Array.from(new Set(activeTypes));
                        const typeValue = uniqueTypes.join(", ");

                        // Remove existing if any to ensure fresh values
                        const finalAttrs = currentAttrs.filter((a: any) => a.key !== donationLabel && a.key !== donationTypeLabel);

                        const formattedDonationVal = formatCurrency(donationAmtFormatted, order.currency);
                        finalAttrs.push({ key: donationLabel, value: formattedDonationVal });
                        finalAttrs.push({ key: donationTypeLabel, value: typeValue });

                        let updatedNote = order.note || "";
                        const donationNoteLine = `Donation Amount: ${formattedDonationVal} (${typeValue})`;
                        if (!updatedNote.includes("Donation Amount:")) {
                            updatedNote = updatedNote ? `${updatedNote}\n${donationNoteLine}` : donationNoteLine;
                        }

                        const updateResult = await admin.graphql(`#graphql
                        mutation orderUpdate($input: OrderInput!) {
                            orderUpdate(input: $input) {
                                order { id tags note }
                                userErrors { field message }
                            }
                        }`,
                            { variables: { input: { id: orderIdStr, tags: existingTags, customAttributes: finalAttrs, note: updatedNote } } }
                        );
                        const updateJson = await updateResult.json();
                        if (updateJson.data?.orderUpdate?.userErrors?.length > 0) {
                            console.error("[Webhook] Order update userErrors:", updateJson.data.orderUpdate.userErrors);
                        }
                    } catch (e) {
                        console.error("Tagging Error:", e);
                    }
                }
            }
        } finally {
            if (lockAcquired) {
                await db.webhookProcessingLock.deleteMany({
                    where: { OR: [{ orderId: orderIdStr }, { orderId: orderId }] }
                }).catch(() => { });
            }
        }
    } catch (err) {
        console.error("Fatal Webhook Error:", err);
    }

    return new Response("OK", { status: 200 });
};
