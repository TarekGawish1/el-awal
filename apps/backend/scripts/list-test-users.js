const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

let connectionUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (connectionUrl.includes('sslmode=require') || connectionUrl.includes('sslmode=prefer')) {
  connectionUrl = connectionUrl.replace(/sslmode=[a-z\-]+/i, 'sslmode=no-verify');
}
const adapter = new PrismaPg({ connectionString: connectionUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      fullName: true,
      studentProfile: {
        select: {
          id: true,
          parentLinks: {
            select: {
              parent: {
                select: {
                  user: {
                    select: { phone: true, email: true }
                  }
                }
              }
            }
          }
        }
      }
    },
    take: 30
  });

  console.log(`Found ${users.length} users:`);
  for (const u of users) {
    const parentPhone = u.studentProfile?.parentLinks?.[0]?.parent?.user?.phone || 'none';
    console.log(`- Role: ${u.role} | Phone: ${u.phone} | Email: ${u.email} | Name: ${u.fullName} | ParentPhone: ${parentPhone}`);
  }

  // Also count main entities: courses, groups, assessments, attendance
  const coursesCount = await prisma.course.count();
  const groupsCount = await prisma.academicGroup.count();
  const assessmentsCount = await prisma.assessment.count();
  const sessionsCount = await prisma.lessonSession.count();

  console.log('\nEntity counts:', {
    courses: coursesCount,
    groups: groupsCount,
    assessments: assessmentsCount,
    sessions: sessionsCount,
  });

  await prisma.$disconnect();
}

main().catch(console.error);
