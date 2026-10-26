import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = "postgresql://postgres.fgbgvbkixpfgwirfloih:GuruyKD1pMrgvuXT@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=no-verify";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const hourlyCount = await prisma.whatsAppMessageLog.count({
    where: {
      status: { in: ['SENT', 'DELIVERED'] },
      sentAt: { gte: oneHourAgo }
    }
  });

  const now = new Date();
  const cairoMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), -3, 0, 0, 0));
  const dailyCount = await prisma.whatsAppMessageLog.count({
    where: {
      status: { in: ['SENT', 'DELIVERED'] },
      sentAt: { gte: cairoMidnight }
    }
  });

  console.log('Hourly sent count in last 60m:', hourlyCount, '(Limit: 25)');
  console.log('Daily sent count since Cairo midnight:', dailyCount, '(Limit: 150)');
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
