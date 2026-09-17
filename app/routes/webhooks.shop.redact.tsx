import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`[Webhook] Received ${topic} for ${shop}`);

  if (shop) {
    try {
      console.log(`[Compliance] Starting shop redaction for: ${shop}`);

      // Perform deletions of all shop-specific records
      await db.session.deleteMany({ where: { shop } });
      await db.posDonationSettings.deleteMany({ where: { shop } });
      
      // Delete campaigns (cascades to Donation)
      await db.campaign.deleteMany({ where: { shop } });
      
      await db.blockConfig.deleteMany({ where: { shop } });
      await db.posDonationLog.deleteMany({ where: { shop } });
      await db.emailSettings.deleteMany({ where: { shop } });
      await db.planSubscription.deleteMany({ where: { shop } });
      await db.recurringDonationConfig.deleteMany({ where: { shop } });
      await db.appSettings.deleteMany({ where: { shop } });
      await db.recurringDonationLog.deleteMany({ where: { shop } });
      await db.roundUpDonationSettings.deleteMany({ where: { shop } });
      await db.roundUpDonationLog.deleteMany({ where: { shop } });
      await db.subscription.deleteMany({ where: { shop } });
      await db.customerSubscription.deleteMany({ where: { shop } });
      await db.paymentRecoverySettings.deleteMany({ where: { shop } });
      await db.paymentRecoveryLog.deleteMany({ where: { shop } });
      await db.billingAttemptLog.deleteMany({ where: { shop } });
      await db.webhookProcessingLock.deleteMany({ where: { shop } });

      console.log(`[Compliance] Shop redact for ${shop} processed successfully.`);
    } catch (err) {
      console.error(`[Compliance] Failed to process shop redact request for ${shop}:`, err);
    }
  }

  return new Response();
};
