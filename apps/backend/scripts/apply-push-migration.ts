process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await pool.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "push_error" TEXT;`);
  await pool.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "push_retry_count" INTEGER NOT NULL DEFAULT 0;`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "idx_notifications_push_queue" ON "notifications"("push_status", "scheduled_for");`);
  console.log('✅ Push queue database columns and index created successfully');
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
