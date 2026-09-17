import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import fs from "fs";
import path from "path";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`[Webhook] Received ${topic} for ${shop}`);

  const customer = payload.customer || {};
  const customerEmail = customer.email;
  const customerId = customer.id;

  if (customerEmail || customerId) {
    // 1. Retrieve all stored customer data
    // Find campaigns belonging to this shop to scope donations
    const shopCampaigns = await db.campaign.findMany({
        where: { shop },
        select: { id: true }
    });
    const campaignIds = shopCampaigns.map(c => c.id);

    const donations = (customerEmail && campaignIds.length > 0)
      ? await db.donation.findMany({ where: { donorEmail: customerEmail, campaignId: { in: campaignIds } } })
      : [];

    const customerSubscriptions = await db.customerSubscription.findMany({
      where: {
        shop,
        OR: [
          customerEmail ? { customerEmail } : null,
          customerId ? { customerId: String(customerId) } : null,
        ].filter((condition): condition is { customerEmail: string } | { customerId: string } => condition !== null),
      },
    });

    const subscriptions = customerId
      ? await db.subscription.findMany({ where: { customerId: String(customerId), shop } })
      : [];

    const paymentRecoveryLogs = customerEmail
      ? await db.paymentRecoveryLog.findMany({ where: { customerEmail, shop } })
      : [];

    const billingAttemptLogs = customerEmail
      ? await db.billingAttemptLog.findMany({ where: { customerEmail, shop } })
      : [];

    // 2. Prepare the data payload
    const retrievedData = {
      shop,
      requestedAt: new Date().toISOString(),
      customerId,
      customerEmail,
      customerPhone: customer.phone || null,
      data: {
        donations,
        customerSubscriptions,
        subscriptions,
        paymentRecoveryLogs,
        billingAttemptLogs,
      },
    };

    // 3. Write/append to a secure compliance log file
    try {
      const logDir = path.join(process.cwd(), "app_data");
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const logPath = path.join(logDir, "compliance_requests.log");
      const logEntry = `--- START DATA REQUEST ENTRY ---\n` +
        `Timestamp: ${new Date().toISOString()}\n` +
        `Payload: ${JSON.stringify(retrievedData, null, 2)}\n` +
        `--- END DATA REQUEST ENTRY ---\n\n`;

      fs.appendFileSync(logPath, logEntry, "utf-8");
      console.log(`[Compliance] Data request for ${customerEmail || customerId} logged successfully.`);
    } catch (err) {
      console.error("[Compliance] Failed to write compliance data request to log file:", err);
    }
  }

  return new Response();
};
