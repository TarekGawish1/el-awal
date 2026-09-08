import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/backend/.env') });

import { PrismaClient, UserRole } from '@prisma/client';

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

// KEEP_TEACHER_EMAIL env var selects which teacher to keep.
// Defaults to the main teacher account.
const KEEP_TEACHER_EMAIL = process.env.KEEP_TEACHER_EMAIL || 'teacher@elawal.com';
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('🧹 Clean test data — keep teacher only');
  console.log(`   Keep teacher email: ${KEEP_TEACHER_EMAIL}`);
  console.log(`   Mode: ${DRY_RUN ? 'DRY-RUN (no changes)' : 'LIVE DELETE'}`);

  const keepTeacher = await prisma.user.findFirst({
    where: { email: KEEP_TEACHER_EMAIL, role: UserRole.TEACHER },
    include: { teacherProfile: true },
  });

  if (!keepTeacher) {
    const allTeachers = await prisma.user.findMany({
      where: { role: UserRole.TEACHER },
      select: { email: true, phone: true, fullName: true },
    });
    console.error(`❌ Teacher with email ${KEEP_TEACHER_EMAIL} not found.`);
    console.error('Available TEACHER accounts:', JSON.stringify(allTeachers, null, 2));
    console.error('Re-run with: KEEP_TEACHER_EMAIL=<email> npx ts-node prisma/clean-keep-teacher.ts');
    process.exit(1);
  }

  console.log(
    `✅ Keeping teacher: ${keepTeacher.fullName} (${keepTeacher.email} / ${keepTeacher.phone}) id=${keepTeacher.id}`,
  );

  if (DRY_RUN) {
    const counts: Record<string, number> = {};
    const models = [
      'studentAnswer',
      'assessmentSubmission',
      'assessmentQuestion',
      'assessment',
      'contentProgress',
      'educationalContent',
      'courseProgress',
      'courseAccess',
      'courseEnrollment',
      'lessonAttachment',
      'lessonQuestionReply',
      'lessonQuestion',
      'courseLesson',
      'courseModule',
      'course',
      'groupCourseAccess',
      'studentPaymentRecord',
      'booklet',
      'studentEvaluation',
      'attendanceRecord',
      'homeworkRecord',
      'lessonSession',
      'lessonSchedule',
      'groupEnrollment',
      'academicGroup',
      'testimonial',
      'parentStudentLink',
      'certificate',
      'contactMessage',
      'notification',
      'whatsAppMessageLog',
      'pushSubscription',
      'refreshTokenSession',
      'teacherAssistant',
      'auditLog',
    ] as const;
    for (const m of models) {
      try {
        counts[m] = await (prisma as any)[m].count();
      } catch {
        counts[m] = -1;
      }
    }
    const otherUsers = await prisma.user.count({ where: { id: { not: keepTeacher.id } } });
    console.log('Would delete (row counts):', JSON.stringify({ otherUsers, ...counts }, null, 2));
    console.log('Run without --dry-run to actually delete.');
    return;
  }

  // Safety confirmation for live runs unless explicitly confirmed
  if (process.env.CONFIRM_CLEAN !== 'YES') {
    console.error('');
    console.error('⚠️  This will PERMANENTLY delete all students, groups, courses, payments,');
    console.error('   attendance, assessments, notifications and every non-teacher user.');
    console.error(`   Only ${keepTeacher.email} will remain.`);
    console.error('');
    console.error('   To confirm, re-run with CONFIRM_CLEAN=YES:');
    console.error('   CONFIRM_CLEAN=YES npx ts-node prisma/clean-keep-teacher.ts');
    console.error('   Preview first with: npx ts-node prisma/clean-keep-teacher.ts --dry-run');
    process.exit(1);
  }

  // Delete in dependency-safe order (children first).
  // Teacher-owned rows (groups/courses/assessments) belong to test data too,
  // so they are deleted before users.
  console.log('Deleting dependent records...');
  await prisma.studentAnswer.deleteMany({});
  await prisma.assessmentSubmission.deleteMany({});
  await prisma.assessmentQuestion.deleteMany({});
  await prisma.homeworkRecord.deleteMany({});
  await prisma.contentProgress.deleteMany({});
  await prisma.educationalContent.deleteMany({});
  await prisma.courseProgress.deleteMany({});
  await prisma.courseAccess.deleteMany({});
  await prisma.courseEnrollment.deleteMany({});
  await prisma.lessonAttachment.deleteMany({});
  await prisma.lessonQuestionReply.deleteMany({});
  await prisma.lessonQuestion.deleteMany({});
  await prisma.assessment.deleteMany({});
  await prisma.courseLesson.deleteMany({});
  await prisma.courseModule.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.groupCourseAccess.deleteMany({});
  await prisma.studentPaymentRecord.deleteMany({});
  await prisma.booklet.deleteMany({});
  await prisma.teacherBillingConfiguration.deleteMany({});
  await prisma.studentEvaluation.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.lessonSession.deleteMany({});
  await prisma.lessonSchedule.deleteMany({});
  await prisma.groupEnrollment.deleteMany({});
  await prisma.academicGroup.deleteMany({});
  await prisma.testimonial.deleteMany({});
  await prisma.parentStudentLink.deleteMany({});
  await prisma.certificate.deleteMany({});
  await prisma.contactMessage.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.whatsAppMessageLog.deleteMany({});
  await prisma.pushSubscription.deleteMany({});
  await prisma.refreshTokenSession.deleteMany({});
  await prisma.teacherAssistant.deleteMany({});
  await prisma.auditLog.deleteMany({});
  // NOTE: whatsapp_auth_sessions + system_settings are infra/config — preserved.

  console.log('Deleting all non-teacher users (students, parents, secretariat)...');
  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { not: keepTeacher.id } },
  });
  console.log(`   Deleted ${deletedUsers.count} user(s).`);

  // Orphan profile rows whose user was deleted via cascade should be gone,
  // but clean any leftovers defensively (keep the teacher's own profile).
  await prisma.studentProfile.deleteMany({ where: { id: { not: keepTeacher.id } } });
  await prisma.parentProfile.deleteMany({ where: { id: { not: keepTeacher.id } } });
  await prisma.secretariatProfile.deleteMany({ where: { id: { not: keepTeacher.id } } });

  const remaining = await prisma.user.count();
  console.log('');
  console.log('========================================================');
  console.log('🎉 CLEANUP COMPLETE');
  console.log('========================================================');
  console.log(`👤 Kept teacher: ${keepTeacher.email} (${keepTeacher.fullName})`);
  console.log(`👥 Remaining users: ${remaining}`);
  console.log('========================================================');
}

main()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
