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
  console.log('--- RECENT WHATSAPP MESSAGE LOGS ---');
  const recentLogs = await prisma.whatsAppMessageLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  for (const log of recentLogs) {
    console.log(`Log ID: ${log.id}, Phone: ${log.recipientPhone}, Status: ${log.status}, Created: ${log.createdAt}, SentAt: ${log.sentAt}, DeliveredAt: ${log.deliveredAt}`);
  }

  const counts = await prisma.whatsAppMessageLog.groupBy({
    by: ['status'],
    _count: { id: true }
  });
  console.log('Message counts by status:', counts);
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
