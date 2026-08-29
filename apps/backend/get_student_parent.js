const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const student = await prisma.user.findFirst({
    where: { role: 'STUDENT' },
    include: { studentProfile: { include: { parentLinks: { include: { parent: { include: { user: true } } } } } } }
  });
  
  if (student) {
    console.log('Student Phone:', student.phone);
    if (student.studentProfile && student.studentProfile.parentLinks.length > 0) {
        console.log('Parent Phone:', student.studentProfile.parentLinks[0].parent.user.phone);
    }
  }
  
  await prisma.$disconnect();
}
main();
