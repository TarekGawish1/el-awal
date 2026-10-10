require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function run() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const students = await prisma.studentProfile.findMany({
        include: {
          user: {
            select: { id: true, fullName: true, phone: true }
          },
          parentLinks: {
            include: {
              parent: {
                include: {
                  user: { select: { id: true, fullName: true, phone: true } }
                }
              }
            }
          },
          groupEnrollments: {
            include: {
              group: { select: { name: true } }
            }
          }
        },
        orderBy: { studentCode: 'asc' }
      });

      console.log(`=== FULL LIST OF ${students.length} STUDENTS ===`);
      for (const s of students) {
        const studentPhone = s.user?.phone || 'NULL';
        const parentPhone = s.parentLinks?.[0]?.parent?.user?.phone || (s.pendingCredentials?.parentPhone) || s.emergencyPhone || 'NULL';
        const groups = s.groupEnrollments?.map(e => e.group?.name).join(', ') || 'None';
        console.log(`${s.studentCode} | ${s.user?.fullName} | S: ${studentPhone} | P: ${parentPhone} | Grp: ${groups}`);
      }
      break;
    } catch (e) {
      console.error(`Attempt ${attempt}:`, e.message);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
