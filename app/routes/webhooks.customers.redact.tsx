import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`[Webhook] Received ${topic} for ${shop}`);

  const customer = payload.customer || {};
  const customerEmail = customer.email;
  const customerId = customer.id;

  // Perform anonymization/redaction if customerEmail or customerId is provided
  if (customerEmail || customerId) {
    try {
      // 1. Anonymize Donation records (preserves financial/reporting stats)
      if (customerEmail) {
        // Find campaigns belonging to this shop to scope donations
        const shopCampaigns = await db.campaign.findMany({
            where: { shop },
            select: { id: true }
        });
        const campaignIds = shopCampaigns.map(c => c.id);

        if (campaignIds.length > 0) {
            await db.donation.updateMany({
              where: { 
                  donorEmail: customerEmail,
                  campaignId: { in: campaignIds }
              },
              data: {
                donorEmail: "redacted@example.com",
                donorName: "Redacted",
                message: null,
              },
            });
        }
      }

      // 2. Anonymize CustomerSubscription records
      const subscriptionOrConditions = [
        customerEmail ? { customerEmail } : null,
        customerId ? { customerId: String(customerId) } : null,
      ].filter((condition): condition is { customerEmail: string } | { customerId: string } => condition !== null);

      if (subscriptionOrConditions.length > 0) {
        await db.customerSubscription.updateMany({
          where: {
            shop,
            OR: subscriptionOrConditions,
          },
          data: {
            customerEmail: "redacted@example.com",
            customerName: "Redacted",
          },
        });
      }

      // 3. Delete active/pending recurring subscription records (removes current relationship)
      if (customerId) {
        await db.subscription.deleteMany({
          where: { customerId: String(customerId), shop },
        });
      }

      // 4. Anonymize PaymentRecoveryLog records
      if (customerEmail) {
        await db.paymentRecoveryLog.updateMany({
          where: { customerEmail, shop },
          data: {
            customerEmail: "redacted@example.com",
            customerName: "Redacted",
          },
        });
      }

      // 5. Anonymize BillingAttemptLog records
      if (customerEmail) {
        await db.billingAttemptLog.updateMany({
          where: { customerEmail, shop },
          data: {
            customerEmail: "redacted@example.com",
            customerName: "Redacted",
          },
        });
      }

      console.log(`[Compliance] Customer redact for ${customerEmail || customerId} processed successfully.`);
    } catch (err) {
      console.error("[Compliance] Failed to process customer redact request:", err);
    }
  }

  return new Response();
};
