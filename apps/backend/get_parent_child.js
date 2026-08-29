const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const parent = await prisma.user.findFirst({
    where: { role: 'PARENT' },
    include: { parentProfile: { include: { children: { include: { student: { include: { user: true } } } } } } }
  });
  
  if (parent) {
    console.log('Parent Phone:', parent.phone);
    if (parent.parentProfile && parent.parentProfile.children.length > 0) {
        console.log('Child Phone:', parent.parentProfile.children[0].student.user.phone);
    }
  }
  
  await prisma.$disconnect();
}
main();
