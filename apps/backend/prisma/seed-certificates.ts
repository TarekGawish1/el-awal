import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env (same resolution order as the main seed)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/backend/.env') });

import { PrismaClient } from '@prisma/client';

const connectionUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
const prisma = new PrismaClient({
  datasources: connectionUrl
    ? {
        db: {
          url: connectionUrl,
        },
      }
    : undefined,
});

interface SeedRow {
  studentName: string;
  gender: string;
  subject: string;
  score: string;
  stage: string; // Arabic stage label expected by the landing page ('الثانوية' | 'الإعدادية' | 'الابتدائية')
  year: string;
}

const CERTIFICATES: SeedRow[] = [
  // الثانوية — الإحصاء — 2025
  { studentName: 'حنين طه محمد', gender: 'FEMALE', subject: 'الإحصاء', score: '57', stage: 'الثانوية', year: '2026' },
  { studentName: 'نور احمد طه', gender: 'FEMALE', subject: 'الإحصاء', score: '58', stage: 'الثانوية', year: '2026' },
  { studentName: 'ميرنا يحيى عبد المنعم', gender: 'FEMALE', subject: 'الإحصاء', score: '59', stage: 'الثانوية', year: '2026' },
  { studentName: 'شهد وائل السعيد', gender: 'FEMALE', subject: 'الإحصاء', score: '56', stage: 'الثانوية', year: '2026' },
  { studentName: 'جنى صلاح عبد الرازق', gender: 'FEMALE', subject: 'الإحصاء', score: '59.5', stage: 'الثانوية', year: '2026' },
  { studentName: 'حنين محمد سندي', gender: 'FEMALE', subject: 'الإحصاء', score: '59.5', stage: 'الثانوية', year: '2026' },
  // الإعدادية — الرياضيات — 2025
  { studentName: 'أمير رضا عبد الرؤوف', gender: 'MALE', subject: 'الرياضيات', score: '57', stage: 'الإعدادية', year: '2026' },
  { studentName: 'محمد صالح جابر', gender: 'MALE', subject: 'الرياضيات', score: '57', stage: 'الإعدادية', year: '2026' },
  { studentName: 'ملك فريدة العباسي', gender: 'FEMALE', subject: 'الرياضيات', score: '59', stage: 'الإعدادية', year: '2026' },
  { studentName: 'عمر محمد عبد الهادي', gender: 'MALE', subject: 'الرياضيات', score: '57', stage: 'الإعدادية', year: '2026' },
  { studentName: 'جودي أحمد مشعل', gender: 'FEMALE', subject: 'الرياضيات', score: '59', stage: 'الإعدادية', year: '2026' },
  { studentName: 'شهد محمد السيد مراد', gender: 'FEMALE', subject: 'الرياضيات', score: '58.2', stage: 'الإعدادية', year: '2026' },
  { studentName: 'شيرين محمد شحاتة', gender: 'FEMALE', subject: 'الرياضيات', score: '59.5', stage: 'الإعدادية', year: '2026' },
  { studentName: 'أدهم أحمد عمرو وسليم', gender: 'MALE', subject: 'الرياضيات', score: '59.5', stage: 'الإعدادية', year: '2026' },
];

async function main() {
  console.log(`🏅 Seeding ${CERTIFICATES.length} honor-roll certificates (idempotent, certificates table only)...`);

  let created = 0;
  let skipped = 0;

  for (const row of CERTIFICATES) {
    const existing = await prisma.certificate.findFirst({
      where: {
        studentName: row.studentName,
        subject: row.subject,
        year: row.year,
      },
      select: { id: true },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.certificate.create({
      data: {
        studentName: row.studentName,
        gender: row.gender,
        subject: row.subject,
        score: row.score,
        issueDate: row.year,
        year: row.year,
        stage: row.stage,
        teacherName: 'أحمد غريب',
        fileUrl: null, // landing page falls back to the local certificate template
      },
    });
    created += 1;
    console.log(`  + ${row.studentName} (${row.subject} — ${row.score})`);
  }

  console.log(`✅ Done. Created: ${created}, already existed: ${skipped}.`);
}

main()
  .catch((e) => {
    console.error('❌ Certificate seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
