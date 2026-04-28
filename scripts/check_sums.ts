import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkSums() {
    const shop = 'gwl-apps-demo.myshopify.com';

    const preset = await prisma.donation.findMany({ where: { campaign: { shop } } });
    const totalPreset = preset.reduce((sum, d) => sum + d.amount, 0);

    const pos = await prisma.posDonationLog.findMany({ where: { shop, type: 'pos' } as any });
    const totalPos = pos.reduce((sum, d) => sum + d.donationAmount, 0);

    const roundup = await prisma.posDonationLog.findMany({ where: { shop, type: 'roundup' } as any });
    const totalRoundup = roundup.reduce((sum, d) => sum + d.donationAmount, 0);

    const recurring = await prisma.recurringDonationLog.findMany({ where: { shop } });
    const totalRecurring = recurring.reduce((sum, d) => sum + d.donationAmount, 0);

    console.log({
        totalPreset,
        totalPos,
        totalRoundup,
        totalRecurring,
        countPreset: preset.length,
        countPos: pos.length,
        countRoundup: roundup.length
    });
}

checkSums().catch(console.error).finally(() => prisma.$disconnect());
