import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { sendDonationReceipt } from "../utils/sendgrid.server";
import { checkFeatureAccess } from "../utils/features";

export const action = async ({ request }: ActionFunctionArgs) => {
    console.log(`\n\n[!!! WEBHOOK HIT !!!] Incoming request to /webhooks/orders/create at ${new Date().toISOString()}`);

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
        console.log(`[Webhook] Auth SUCCESS. Topic: ${topic}, Shop: ${shop}`);

        if (topic !== "ORDERS_CREATE") {
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

        const customerName = payload.customer
            ? `${payload.customer.first_name || ""} ${payload.customer.last_name || ""}`.trim()
            : (order.billing_address?.name || "Anonymous");
        const customerEmail = payload.email || payload.contact_email || payload.customer?.email || "No Email provided";
        const currency = payload.currency || "USD";
        const createdAt = payload.created_at ? new Date(payload.created_at) : new Date();

        // -------------------------
        // HEAD LOGIC: Campaign Donations 
        // -------------------------
        if (payload.line_items && Array.isArray(payload.line_items)) {
            for (const item of payload.line_items) {
                if (!item.product_id) continue;

                try {
                    const productIdStr = item.product_id.toString();
                    const variantIdStr = item.variant_id?.toString() || null;

                    const response = await admin.graphql(
                        `#graphql
                        query getProductDetails($id: ID!) {
                            product(id: $id) {
                                productType
                                tags
                            }
                        }`,
                        { variables: { id: `gid://shopify/Product/${productIdStr}` } }
                    );

                    const { data } = await response.json();
                    let isDonation = false;

                    if (data?.product) {
                        const productType = data.product.productType?.toLowerCase();
                        const tags = data.product.tags || [];

                        if (
                            productType === "donation" ||
                            tags.some((t: string) => t.toLowerCase() === "donation")
                        ) {
                            isDonation = true;
                        }
                    }

                    const matchingCampaign = await db.campaign.findFirst({
                        where: {
                            shop: shop,
                            shopifyProductId: { endsWith: productIdStr },
                        },
                    });

                    if (isDonation && matchingCampaign) {
                        const basePrice = parseFloat(item.price || "0") * (item.quantity || 1);
                        const lineDiscount = parseFloat(item.total_discount || "0");
                        const donationAmount = Math.max(0, basePrice - lineDiscount);
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
                            console.log(`[Webhook] Inserted/Updated donation mapping for Campaign ${matchingCampaign.id}`);
                        } catch (dbError) {
                            console.error("Error inserting donation record:", dbError);
                        }

                        // ── Fix 3: Tag the order with preset_donation ──────────
                        if (admin) {
                            try {
                                const existingTags = order.tags
                                    ? order.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
                                    : [];
                                if (!existingTags.includes("preset_donation")) {
                                    existingTags.push("preset_donation");
                                }
                                await admin.graphql(
                                    `#graphql
                                    mutation orderUpdate($input: OrderInput!) {
                                        orderUpdate(input: $input) {
                                            order { id tags }
                                            userErrors { field message }
                                        }
                                    }`,
                                    { variables: { input: { id: orderIdStr, tags: existingTags } } }
                                );
                                console.log(`[Webhook] Tagged order ${order.name} with preset_donation`);
                            } catch (tagErr) {
                                console.error("[Webhook] Failed to tag preset_donation order:", tagErr);
                            }
                        }

                        // ── Fix 4: Send donation confirmation email ────────────
                        try {
                            const planSub = await db.planSubscription.findUnique({ where: { shop } });
                            const planName = planSub?.plan || "basic";
                            const currentCustomerEmail = payload.email || payload.contact_email || payload.customer?.email || "No Email provided";

                            if (currentCustomerEmail !== "No Email provided" && checkFeatureAccess(planName, "canSendReceiptEmail")) {
                                const emailResult = await sendDonationReceipt({
                                    email: currentCustomerEmail,
                                    name: customerName,
                                    amount: donationAmtFormatted,
                                    orderNumber: order.name || orderId,
                                    shop,
                                    donationName: matchingCampaign.name,
                                    frequency: "One-time",
                                });
                                if (emailResult.success) {
                                    console.log(`[Webhook] Donation confirmation email sent to ${currentCustomerEmail} for order ${order.name}`);
                                } else {
                                    console.error(`[Webhook] Failed to send email:`, emailResult.error);
                                }
                            } else {
                                console.log(`[Webhook] Email skipped: email=${currentCustomerEmail}, plan=${planName}`);
                            }
                        } catch (emailErr) {
                            console.error("[Webhook] Error sending donation email:", emailErr);
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
        console.log(`[Webhook] Settings for ${shop}: ${settings ? "Found" : "NOT found (using defaults)"}. Enabled state: ${isSettingsEnabled}`);

        const subscription = await (db as any).planSubscription.findUnique({ where: { shop } });
        const plan = subscription?.plan || "basic";

        const config = await (db as any).recurringDonationConfig.findUnique({ where: { shop } });
        const DONATION_PRODUCT_ID = config?.productId || "9946640679159";

        let isRecurring = false;
        let recurringSellingPlanId: string | null = null;
        let subscriptionContractId: string | null = null;
        let directDonationAmountCents = 0;
        let hasDirectDonationProduct = false;
        let directDonationName = "Charity Donation";

        let hasRoundUpDonation = false;
        let roundUpAmountCents = 0;

        // Detection Loop
        for (const lineItem of (order.line_items || [])) {
            // Check for explicit donation product (Preset/Recurring)
            if (String(lineItem.product_id) === String(DONATION_PRODUCT_ID)) {
                hasDirectDonationProduct = true;
                directDonationName = lineItem.title || "Charity Donation";
                directDonationAmountCents += (parseFloat(lineItem.price || 0) * 100) * (lineItem.quantity || 1);
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
        let isPosDonationSource = false;
        let frequency: "one_time" | "monthly" | "weekly" = "one_time";
        if (isRecurring && recurringSellingPlanId) {
            if (config) {
                const spId = recurringSellingPlanId.split('/').pop() || "";
                if (config.monthlyPlanId?.includes(spId)) frequency = "monthly";
                else if (config.weeklyPlanId?.includes(spId)) frequency = "weekly";
            }
        }

        let isApplicable = false;
        let donationAmtCents = 0;
        let samplePriceCents = 0;
        const totalCents = parseFloat(order.total_price || 0) * 100;
        const minValCents = (effectiveSettings.minimumValue || 0) * 100;

        // Flow A: Explicit Product (Preset/Recurring)
        if (hasDirectDonationProduct) {
            isApplicable = true;
            donationAmtCents += directDonationAmountCents;
            samplePriceCents = totalCents;
            console.log(`[Webhook] Flow A: Direct Donation detected. Amount: ${directDonationAmountCents}c`);
        }

        // Flow B: Round-Up Donation
        if (hasRoundUpDonation) {
            isApplicable = true;
            donationAmtCents += roundUpAmountCents;
            if (!hasDirectDonationProduct) {
                directDonationName = roundupSettings?.campaignTitle || "Round-Up Donation";
            }
            console.log(`[Webhook] Flow B: Round-Up Donation detected. Amount: ${roundUpAmountCents}c`);
        }

        // Flow C: POS / Portion-of-Sale logic (if nothing else detected yet)
        if (!isApplicable && isSettingsEnabled) {
            console.log(`[Webhook] Flow C: Checking POS/Portion-of-Sale logic...`);

            if (effectiveSettings.donationType === "percentage" && !checkFeatureAccess(plan, "canUsePercentageDonation")) {
                console.log(`[Webhook] Skipping POS check - Percentage donation restricted for plan: ${plan}`);
            } else {
                const widgetActive = (order.note_attributes || []).some((attr: any) => attr.name === "_donation_widget_active" && attr.value === "true");
                const isWeb = order.source_name === "web";
                const isPos = order.source_name === "pos";

                if (isWeb && !widgetActive) {
                    console.log(`[Webhook] Skipping POS check - Web source without active donation widget.`);
                } else if (isPos || widgetActive) {
                    if (effectiveSettings.donationBasis === 'product') {
                        for (const lineItem of (order.line_items || [])) {
                            const itemPriceCents = parseFloat(lineItem.price || 0) * 100;
                            if (itemPriceCents >= minValCents) {
                                isApplicable = true;
                                isPosDonationSource = true;
                                samplePriceCents = itemPriceCents;
                                donationAmtCents = effectiveSettings.donationType === "percentage" ? (effectiveSettings.donationValue / 100) * samplePriceCents : effectiveSettings.donationValue * 100;
                                break;
                            }
                        }
                    } else if (totalCents >= minValCents) {
                        isApplicable = true;
                        isPosDonationSource = true;
                        samplePriceCents = totalCents;
                        donationAmtCents = effectiveSettings.donationType === "percentage" ? (effectiveSettings.donationValue / 100) * samplePriceCents : effectiveSettings.donationValue * 100;
                    }
                } else {
                    console.log(`[Webhook] Skipping POS check - Widget not active and source is not POS. Source: ${order.source_name}`);
                }
            }
        }

        if (isApplicable) {
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
                        const gqlDonationItem = gqlLineItems.find((li: any) => li.variant?.product?.id?.includes(DONATION_PRODUCT_ID));
                        if (gqlDonationItem?.variant?.product?.featuredImage?.url) {
                            (order as any).donation_product_image = gqlDonationItem.variant.product.featuredImage.url;
                        }
                    }
                } catch (e) {
                    console.error("GQL Refresh Error:", e);
                }
            }

            if (currentCustomerEmail !== "No Email provided" && checkFeatureAccess(plan, "canSendReceiptEmail")) {
                const freqLabel = frequency === "weekly" ? "Weekly" : frequency === "monthly" ? "Monthly" : "One-time";

                const shippingAddr = order.shipping_address
                    ? `${order.shipping_address.name}\n${order.shipping_address.address1}${order.shipping_address.address2 ? ` ${order.shipping_address.address2}` : ""}\n${order.shipping_address.city}, ${order.shipping_address.province_code || ""} ${order.shipping_address.zip}\n${order.shipping_address.country}`
                    : "";
                const billingAddr = order.billing_address
                    ? `${order.billing_address.name}\n${order.billing_address.address1}${order.billing_address.address2 ? ` ${order.billing_address.address2}` : ""}\n${order.billing_address.city}, ${order.billing_address.province_code || ""} ${order.billing_address.zip}\n${order.billing_address.country}`
                    : "";

                const donationItem = (order.line_items || []).find((li: any) => String(li.product_id) === String(DONATION_PRODUCT_ID));

                let nextBillingDate = "";
                const today = new Date();
                if (frequency === "weekly") {
                    today.setDate(today.getDate() + 7);
                    nextBillingDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                } else if (frequency === "monthly") {
                    today.setDate(today.getDate() + 30);
                    nextBillingDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                }

                let paymentMethod = "Ending in card";
                if (order.payment_details?.credit_card_number) {
                    const last4 = order.payment_details.credit_card_number.slice(-4);
                    paymentMethod = `Ending in ${last4}`;
                } else if (order.payment_gateway_names?.length > 0) {
                    paymentMethod = order.payment_gateway_names[0];
                }

                const res = await sendDonationReceipt({
                    email: currentCustomerEmail,
                    name: currentCustomerName,
                    amount: donationAmtFormatted,
                    orderNumber: order.name,
                    shop,
                    donationName: directDonationName,
                    frequency: freqLabel,
                    shippingAddress: shippingAddr,
                    billingAddress: billingAddr,
                    productTitle: donationItem?.title || directDonationName,
                    manageUrl: `https://${shop}/account/subscriptions`,
                    nextBillingDate: nextBillingDate,
                    paymentMethod: paymentMethod,
                    productImage: (order as any).donation_product_image
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
                if (hasDirectDonationProduct) {
                    // Raw SQL Upsert for RecurringDonationLog
                    const existing = await db.$queryRaw<{ id: string }[]>`SELECT id FROM RecurringDonationLog WHERE orderId = ${orderIdStr}`;
                    if (existing.length > 0) {
                        await db.$executeRaw`UPDATE RecurringDonationLog SET subscriptionContractId = ${subscriptionContractId}, type = 'recurring' WHERE orderId = ${orderIdStr}`;
                    } else {
                        await db.$executeRaw`INSERT INTO RecurringDonationLog (id, shop, orderId, orderNumber, donationAmount, orderTotal, currency, receiptStatus, receiptSentAt, sellingPlanId, frequency, subscriptionContractId, type, createdAt) 
                            VALUES (${crypto.randomUUID()}, ${shop}, ${orderIdStr}, ${order.name}, ${parseFloat(donationAmtFormatted)}, ${parseFloat(order.total_price || 0)}, ${order.currency || "USD"}, ${emailStatus}, ${sentDate}, ${recurringSellingPlanId}, ${frequency}, ${subscriptionContractId}, 'recurring', ${new Date().toISOString()})`;
                    }
                } else {
                    const logType = hasRoundUpDonation ? "roundup" : "pos";
                    // Raw SQL Upsert for PosDonationLog
                    const existing = await db.$queryRaw<{ id: string }[]>`SELECT id FROM PosDonationLog WHERE orderId = ${orderIdStr}`;
                    if (existing.length > 0) {
                        await db.$executeRaw`UPDATE PosDonationLog SET type = ${logType} WHERE orderId = ${orderIdStr}`;
                    } else {
                        await db.$executeRaw`INSERT INTO PosDonationLog (id, shop, orderId, orderNumber, donationAmount, orderTotal, currency, status, receiptStatus, receiptSentAt, isResent, type, createdAt) 
                            VALUES (${crypto.randomUUID()}, ${shop}, ${orderIdStr}, ${order.name}, ${parseFloat(donationAmtFormatted)}, ${parseFloat(order.total_price || 0)}, ${order.currency || "USD"}, 'active', ${emailStatus}, ${sentDate}, 0, ${logType}, ${new Date().toISOString()})`;
                    }
                }
            } catch (e) {
                console.error("DB Log Error:", e);
            }

            if (admin) {
                try {
                    const existingTags = order.tags ? order.tags.split(',').map((t: any) => t.trim()) : [];

                    if (hasDirectDonationProduct) {
                        const orderTag = frequency === "one_time" ? "preset_donation" : frequency === "monthly" ? "recurring_donation_monthly" : "recurring_donation_weekly";
                        const customerTag = frequency === "one_time" ? "preset_donor" : frequency === "monthly" ? "recurring_donor_monthly" : "recurring_donor_weekly";

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

                    const currentAttrs = (order.note_attributes || []).map((a: any) => ({ key: a.name, value: a.value }));
                    if (!currentAttrs.some((a: any) => a.key === "POS Donation Amount")) {
                        currentAttrs.push({ key: "POS Donation Amount", value: `${order.currency || "$"}${donationAmtFormatted}` });
                    }

                    await admin.graphql(`#graphql
                        mutation orderUpdate($input: OrderInput!) { orderUpdate(input: $input) { order { id } } }`,
                        { variables: { input: { id: orderIdStr, tags: existingTags, customAttributes: currentAttrs } } }
                    );
                    console.log(`[Webhook] Success: Handled Order ${order.name} (${donationAmtFormatted})`);
                } catch (e) {
                    console.error("Tagging Error:", e);
                }
            }
        }
    } catch (err) {
        console.error("Fatal Webhook Error:", err);
    }

    return new Response("OK", { status: 200 });
};
