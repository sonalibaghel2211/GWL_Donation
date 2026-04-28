import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkShops() {
    const ds = await prisma.donation.findMany({ take: 1, include: { campaign: true } });
    const ps = await prisma.posDonationLog.findMany({ take: 1 });
    const rs = await prisma.recurringDonationLog.findMany({ take: 1 });

    console.log({
        donation_campaign_shop: ds[0]?.campaign?.shop,
        pos_log_shop: ps[0]?.shop,
        recurring_log_shop: rs[0]?.shop
    });
}

checkShops().catch(console.error).finally(() => prisma.$disconnect());
