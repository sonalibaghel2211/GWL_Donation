import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function debug() {
    console.log("--- PosDonationLog Sample ---");
    const posLogs = await prisma.posDonationLog.findMany({ take: 5 });
    console.log(JSON.stringify(posLogs, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2
    ));

    console.log("\n--- Donation Sample ---");
    const donations = await prisma.donation.findMany({ take: 5 });
    console.log(JSON.stringify(donations, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2
    ));

    console.log("\n--- Counts by Type ---");
    const counts = await prisma.$queryRaw`SELECT type, COUNT(*) as count FROM PosDonationLog GROUP BY type`;
    console.log(JSON.stringify(counts, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2
    ));
}

debug().catch(console.error).finally(() => prisma.$disconnect());
