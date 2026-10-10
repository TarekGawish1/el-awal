require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: '183c5e1c-c492-4409-a061-bcc30ea3d338' },
    include: { student: { include: { user: true } } }
  });
  console.log('Students linked to parent 01040971159:', links.length);
  for (const l of links) {
    console.log(`- ${l.student.user.fullName} (${l.student.studentCode}), created: ${l.student.createdAt}`);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
