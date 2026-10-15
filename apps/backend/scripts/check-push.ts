process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const teachers = await prisma.user.findMany({
    where: { role: 'TEACHER' },
    select: { id: true, fullName: true, phone: true },
  });
  console.log('Teachers in DB:', JSON.stringify(teachers, null, 2));

  const subs = await prisma.pushSubscription.findMany({
    include: {
      user: { select: { fullName: true, role: true } },
    },
  });
  console.log('Total push subscriptions:', subs.length);
  for (const s of subs) {
    console.log(`- User: ${s.user.fullName} (${s.user.role}, ID: ${s.userId})`);
    console.log(`  Endpoint: ${s.endpoint}`);
    console.log(`  Is FCM Token?: ${!s.endpoint.startsWith('http')}`);
    console.log(`  Keys: p256dh=${s.p256dh?.slice(0, 10)}, auth=${s.auth?.slice(0, 10)}`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
