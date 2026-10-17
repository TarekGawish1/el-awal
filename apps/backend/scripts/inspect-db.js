const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

let url = (process.env.DATABASE_URL || '').replace(/sslmode=[a-z\-]+/i, 'sslmode=no-verify');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function run() {
  const courses = await prisma.course.findMany({
    include: {
      modules: {
        include: { lessons: true }
      },
      enrollments: true
    }
  });
  console.log('Courses count:', courses.length);
  if (courses[0]) {
    console.log('Course 0:', {
      id: courses[0].id,
      title: courses[0].title,
      status: courses[0].status,
      modulesCount: courses[0].modules.length,
      lessonsCount: courses[0].modules.reduce((acc, m) => acc + m.lessons.length, 0),
      enrollmentsCount: courses[0].enrollments.length,
    });
  }

  const studentsCount = await prisma.studentProfile.count();
  const parentsCount = await prisma.parentProfile.count();
  const teachersCount = await prisma.teacherProfile.count();
  const usersCount = await prisma.user.count();
  const groups = await prisma.academicGroup.findMany({ select: { id: true, name: true, gradeLevel: true } });
  console.log({ studentsCount, parentsCount, teachersCount, usersCount, groups });

  await prisma.$disconnect();
}

run().catch(console.error);
