import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { shop, payload, topic } = await authenticate.webhook(request);

    if (topic !== "APP_SUBSCRIPTIONS_UPDATE") {
        return new Response(null, { status: 400 });
    }

    const subscription = payload.app_subscription as any;
    const status = subscription.status; // 'ACTIVE', 'CANCELLED', 'EXPIRED', etc.
    const gid = subscription.admin_graphql_api_id;

    console.log(`[Webhook] APP_SUBSCRIPTIONS_UPDATE for ${shop}: Status=${status}, GID=${gid}`);

    try {
        // Find if this subscription exists in our records
        const existingRec = await db.planSubscription.findFirst({
            where: { shop, subscriptionId: gid },
        });

        const planName = subscription.name.toLowerCase().includes("pro") ? "pro" :
            subscription.name.toLowerCase().includes("advanced") ? "advanced" : "basic";

        if (existingRec) {
            if (status === "ACTIVE") {
                const wasPending = existingRec.status === "pending" || existingRec.plan !== planName;

                await db.planSubscription.update({
                    where: { id: existingRec.id },
                    data: {
                        status: "active",
                        plan: planName, // Finalize the plan
                        pendingPlan: null
                    },
                });

                if (wasPending) {
                    // Send confirmation email
                    const settings = await db.emailSettings.findUnique({ where: { shop } });
                    const appSettings = await db.appSettings.findUnique({ where: { shop } });
                    const targetEmail = settings?.contactEmail || appSettings?.contactEmail;

                    if (targetEmail) {
                        const { sendPlanChangeConfirmation } = await import("../utils/sendgrid.server");
                        await sendPlanChangeConfirmation({
                            shop,
                            planName,
                            email: targetEmail,
                        });
                    }
                }
            } else {
                await db.planSubscription.update({
                    where: { id: existingRec.id },
                    data: {
                        status: "inactive",
                        plan: status === "CANCELLED" || status === "EXPIRED" ? "basic" : existingRec.plan,
                    },
                });
            }
        } else if (status === "ACTIVE") {
            await db.planSubscription.upsert({
                where: { shop },
                update: {
                    plan: planName,
                    subscriptionId: gid,
                    status: "active",
                    pendingPlan: null
                },
                create: {
                    shop,
                    plan: planName,
                    subscriptionId: gid,
                    status: "active"
                }
            });

            // Send confirmation email for new subscription
            const settings = await db.emailSettings.findUnique({ where: { shop } });
            const appSettings = await db.appSettings.findUnique({ where: { shop } });
            const targetEmail = settings?.contactEmail || appSettings?.contactEmail;

            if (targetEmail) {
                const { sendPlanChangeConfirmation } = await import("../utils/sendgrid.server");
                await sendPlanChangeConfirmation({
                    shop,
                    planName,
                    email: targetEmail,
                });
            }
        }
    } catch (err) {
        console.error("Error updating subscription via webhook:", err);
    }

    return new Response("OK", { status: 200 });
};
