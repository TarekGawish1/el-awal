require('dotenv').config({ path: './apps/backend/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.studentProfile.findFirst({
    where: { studentCode: 'STU202600002' },
    include: {
      user: true,
      groupEnrollments: { include: { group: true } },
      paymentRecords: true,
    },
  });
  console.log('--- STUDENT ---', JSON.stringify({
    id: student?.id,
    name: student?.user?.fullName,
    code: student?.studentCode,
    createdAt: student?.createdAt,
    enrollments: student?.groupEnrollments?.map(e => ({
      groupId: e.groupId,
      groupName: e.group?.name,
      enrolledAt: e.enrolledAt,
      createdAt: e.createdAt,
    })),
    payments: student?.paymentRecords?.map(p => ({
      id: p.id,
      paymentType: p.paymentType,
      periodYear: p.periodYear,
      periodMonth: p.periodMonth,
      groupId: p.groupId,
      bookletId: p.bookletId,
      amountPaid: p.amountPaid,
      amountExpected: p.amountExpected,
      paymentStatus: p.paymentStatus,
      createdAt: p.createdAt,
    })),
  }, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
