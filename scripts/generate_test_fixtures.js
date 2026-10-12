const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.resolve(__dirname, '../apps/backend/.env') });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const secret = process.env.JWT_SECRET || 'super-secret-el-awal-backend-jwt-signing-key-2026-secure-production-grade!';
let url = (process.env.DATABASE_URL || '').replace(/sslmode=[a-z\-]+/i, 'sslmode=no-verify');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function main() {
  console.log('Generating high-fidelity test fixtures for k6 tests...');

  // 1. Teacher
  const teacherUser = await prisma.user.findFirst({
    where: { role: 'TEACHER', isActive: true },
    include: { teacherProfile: true },
  });

  const teacherToken = teacherUser
    ? jwt.sign({ sub: teacherUser.id, role: 'TEACHER', typ: 'access' }, secret, { expiresIn: '7d' })
    : null;

  // 2. Students
  const studentUsers = await prisma.user.findMany({
    where: { role: 'STUDENT', isActive: true },
    include: {
      studentProfile: {
        include: {
          groupEnrollments: { where: { status: 'ACTIVE' }, take: 1 },
          parentLinks: { include: { parent: { include: { user: true } } } },
        },
      },
    },
    take: 40,
  });

  const students = studentUsers.map((s) => {
    const token = jwt.sign({ sub: s.id, role: 'STUDENT', typ: 'access' }, secret, { expiresIn: '7d' });
    const parent = s.studentProfile?.parentLinks?.[0]?.parent;
    return {
      id: s.id,
      studentProfileId: s.studentProfile?.id,
      name: s.fullName,
      phone: s.phone,
      studentCode: s.studentProfile?.studentCode,
      groupId: s.studentProfile?.groupEnrollments?.[0]?.groupId || null,
      parentUserId: parent?.userId || null,
      parentProfileId: parent?.id || null,
      token,
    };
  });

  // 3. Parents
  const parentUsers = await prisma.user.findMany({
    where: { role: 'PARENT', isActive: true },
    include: {
      parentProfile: {
        include: {
          studentLinks: { include: { student: { include: { user: true } } } },
        },
      },
    },
    take: 30,
  });

  const parents = parentUsers.map((p) => {
    const token = jwt.sign({ sub: p.id, role: 'PARENT', typ: 'access' }, secret, { expiresIn: '7d' });
    const linkedStudent = p.parentProfile?.studentLinks?.[0]?.student;
    return {
      id: p.id,
      parentProfileId: p.parentProfile?.id,
      name: p.fullName,
      phone: p.phone,
      linkedStudentId: linkedStudent?.userId || linkedStudent?.id || null,
      linkedStudentName: linkedStudent?.user?.fullName || null,
      token,
    };
  });

  // 4. Academic Groups
  const groups = await prisma.academicGroup.findMany({
    where: { isActive: true },
    select: { id: true, name: true, gradeLevel: true, monthlyFee: true },
    take: 10,
  });

  // 5. Lesson Sessions
  const sessions = await prisma.lessonSession.findMany({
    select: { id: true, topic: true, groupId: true, sessionDate: true },
    take: 20,
  });

  // 6. Courses
  const courses = await prisma.course.findMany({
    select: { id: true, title: true, status: true },
    take: 10,
  });

  // 7. Assessments
  const assessments = await prisma.assessment.findMany({
    select: { id: true, title: true, totalScore: true, courseId: true },
    take: 10,
  });

  const fixture = {
    baseUrl: 'http://localhost:4000/api/v1',
    teacher: teacherUser
      ? {
          id: teacherUser.id,
          teacherProfileId: teacherUser.teacherProfile?.id,
          email: teacherUser.email,
          phone: teacherUser.phone,
          name: teacherUser.fullName,
          token: teacherToken,
        }
      : null,
    students,
    parents,
    groups,
    sessions,
    courses,
    assessments,
    generatedAt: new Date().toISOString(),
  };

  const outputDir = path.resolve(__dirname, '../k6/data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'test_data.json');
  fs.writeFileSync(outputPath, JSON.stringify(fixture, null, 2), 'utf-8');

  console.log(`Successfully generated fixtures at ${outputPath}:`);
  console.log(`- Teacher: ${fixture.teacher ? fixture.teacher.name : 'none'}`);
  console.log(`- Students: ${students.length}`);
  console.log(`- Parents: ${parents.length}`);
  console.log(`- Groups: ${groups.length}`);
  console.log(`- Sessions: ${sessions.length}`);
  console.log(`- Courses: ${courses.length}`);
  console.log(`- Assessments: ${assessments.length}`);

  await prisma.$disconnect();
}

main().catch(console.error);
