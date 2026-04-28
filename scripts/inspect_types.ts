import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function inspectTypes() {
    const shop = 'gwl-apps-demo.myshopify.com';
    const logs = await prisma.posDonationLog.findMany({ where: { shop } });

    console.log(logs.map(l => ({ order: l.orderNumber, type: l.type, amount: l.donationAmount })));
}

inspectTypes().catch(console.error).finally(() => prisma.$disconnect());
