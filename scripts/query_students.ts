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
  console.log('--- FINDING 69460590 ---');
  const notifs = await prisma.notification.findMany({
    where: {
      OR: [
        { message: { contains: '69460590' } },
        { data: { path: ['phone'], string_contains: '69460590' } },
        { data: { path: ['parentPhone'], string_contains: '69460590' } },
      ]
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log('Notifs for 69460590:', notifs.length);
  for (const n of notifs) {
    console.log(`\nNotif ID: ${n.id}, Created: ${n.createdAt}`);
    console.log('Data:', JSON.stringify(n.data, null, 2));
    console.log('Message:\n', n.message);
  }

  const logs = await prisma.whatsAppMessageLog.findMany({
    where: {
      recipientPhone: { contains: '69460590' }
    },
    orderBy: { createdAt: 'desc' }
  });
  console.log('Logs for 69460590:', logs.length);
  for (const l of logs) {
    console.log(`\nLog ID: ${l.id}, Status: ${l.status}, Recipient: ${l.recipientName}, Created: ${l.createdAt}`);
    console.log('Body:\n', l.messageBody);
  }
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
