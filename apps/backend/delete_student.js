const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
});

function getPhoneVariants(phone) {
  const digits = phone.replace(/\D/g, '');
  const variants = new Set();
  variants.add(phone);
  variants.add(digits);

  let localNumber = '';
  if (digits.startsWith('20') && digits.length === 12) {
    localNumber = '0' + digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    localNumber = digits;
  } else if (digits.length === 10) {
    localNumber = '0' + digits;
  }

  if (localNumber) {
    variants.add(localNumber);
    variants.add('+2' + localNumber);
    variants.add('2' + localNumber);
    variants.add(localNumber.slice(1));
    variants.add('+20' + localNumber.slice(1));
    variants.add('0020' + localNumber.slice(1));
  }

  return Array.from(variants);
}

async function connectWithRetry(retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Connecting to database (attempt ${i + 1}/${retries})...`);
      await prisma.$connect();
      console.log('✅ Connected to database.');
      return;
    } catch (err) {
      console.warn(`Connection attempt ${i + 1} failed: ${err.message}`);
      if (i < retries - 1) {
        await new Promise(res => setTimeout(res, delay));
      } else {
        throw err;
      }
    }
  }
}

async function main() {
  await connectWithRetry();

  const parentVariants = getPhoneVariants('01067789574');
  const studentVariants = getPhoneVariants('01067789576');
  const allVariants = Array.from(new Set([...parentVariants, ...studentVariants]));

  console.log('Target Phone Variants to clean:', allVariants);

  // 1. Find all users matching phone or emergencyPhone
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { phone: { in: allVariants } },
        { studentProfile: { emergencyPhone: { in: allVariants } } },
      ],
    },
    include: {
      studentProfile: true,
      parentProfile: true,
    },
  });

  console.log(`Found ${users.length} user(s) to remove:`);
  for (const u of users) {
    console.log(`- ID: ${u.id}, Name: ${u.fullName}, Phone: ${u.phone}, Role: ${u.role}`);
  }

  for (const u of users) {
    console.log(`Cleaning up records for user ${u.id} (${u.fullName}, ${u.phone})...`);

    // Clean up student profile relations if student
    if (u.studentProfile) {
      const studentId = u.studentProfile.id;

      await prisma.parentStudentLink.deleteMany({ where: { studentId } });
      await prisma.groupEnrollment.deleteMany({ where: { studentId } });
      await prisma.studentPaymentRecord.deleteMany({ where: { studentId } });
      await prisma.attendanceRecord.deleteMany({ where: { studentId } });
      await prisma.homeworkRecord.deleteMany({ where: { studentId } });
      await prisma.assessmentSubmission.deleteMany({ where: { studentId } });
      await prisma.courseEnrollment.deleteMany({ where: { studentId } });
      await prisma.courseProgress.deleteMany({ where: { studentId } });
      await prisma.contentProgress.deleteMany({ where: { studentId } });
      await prisma.studentEvaluation.deleteMany({ where: { studentId } });
      await prisma.lessonQuestion.deleteMany({ where: { studentId } });
      await prisma.studentProfile.delete({ where: { id: studentId } }).catch(() => {});
    }

    // Clean up parent profile relations if parent
    if (u.parentProfile) {
      const parentId = u.parentProfile.id;
      await prisma.parentStudentLink.deleteMany({ where: { parentId } });
      await prisma.parentProfile.delete({ where: { id: parentId } }).catch(() => {});
    }

    // Clean up common user relations
    await prisma.notification.deleteMany({ where: { recipientId: u.id } });
    await prisma.pushSubscription.deleteMany({ where: { userId: u.id } });
    await prisma.refreshTokenSession.deleteMany({ where: { userId: u.id } });

    // Finally delete user
    await prisma.user.delete({ where: { id: u.id } });
    console.log(`✅ Successfully deleted user ${u.id}`);
  }

  // Double check
  const remainingUsers = await prisma.user.findMany({
    where: {
      OR: [
        { phone: { in: allVariants } },
        { studentProfile: { emergencyPhone: { in: allVariants } } },
      ],
    },
  });

  console.log(`Remaining users with these phone numbers: ${remainingUsers.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
