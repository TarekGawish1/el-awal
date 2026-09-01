import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/backend/.env') });

import {
  PrismaClient,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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

async function main() {
  console.log('🌱 Starting Clean Database Seeding for El-Awal Platform (Teacher Only)...');

  const rawPassword = process.env.SEED_DEMO_PASSWORD || 'Password123!';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // 1. Clean slate: Delete all tables in topological order
  console.log('🧹 Clearing all existing data from database...');
  await prisma.studentAnswer.deleteMany({});
  await prisma.assessmentSubmission.deleteMany({});
  await prisma.assessmentQuestion.deleteMany({});
  await prisma.assessment.deleteMany({});
  await prisma.contentProgress.deleteMany({});
  await prisma.educationalContent.deleteMany({});
  await prisma.courseProgress.deleteMany({});
  await prisma.courseAccess.deleteMany({});
  await prisma.courseEnrollment.deleteMany({});
  await prisma.courseLesson.deleteMany({});
  await prisma.courseModule.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.studentPaymentRecord.deleteMany({});
  await prisma.studentEvaluation.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.lessonSession.deleteMany({});
  await prisma.lessonSchedule.deleteMany({});
  await prisma.groupEnrollment.deleteMany({});
  await prisma.academicGroup.deleteMany({});
  await prisma.parentStudentLink.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.refreshTokenSession.deleteMany({});
  await prisma.secretariatProfile.deleteMany({});
  await prisma.parentProfile.deleteMany({});
  await prisma.studentProfile.deleteMany({});
  await prisma.teacherProfile.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('✨ All database tables cleared.');

  // ==============================================================================
  // 2. SEED TEACHER
  // ==============================================================================
  const teacherUser = await prisma.user.create({
    data: {
      fullName: 'أ. طارق عبد الله',
      email: 'teacher@elawal.com',
      phone: '+201000000001',
      passwordHash,
      role: UserRole.TEACHER,
      isActive: true,
      teacherProfile: {
        create: {
          specialty: 'اللغة العربية والبلاغة للثانوية العامة',
          bio: 'معلم أول ومعد سلسلة الأوائل في اللغة العربية بخبرة تتجاوز 15 عاماً.',
          activeAcademicYear: '2026-2027',
          activeAcademicTerm: 'FIRST_TERM',
        },
      },
    },
    include: { teacherProfile: true },
  });

  console.log(`✅ Teacher (${teacherUser.email}) created.`);

  console.log('\n========================================================');
  console.log('🎉 SEEDING COMPLETED SUCCESSFULLY WITH ZERO CONFLICTS!');
  console.log('========================================================');
  console.log(`👤 Teacher Login:    ${teacherUser.email} / ${rawPassword}`);
  console.log('========================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Database Seeding Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
