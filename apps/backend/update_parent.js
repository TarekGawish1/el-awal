const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  const parent = await prisma.user.findFirst({
    where: { role: 'PARENT' },
  });
  
  if (parent) {
    const passwordHash = await bcrypt.hash('12345678', 10);
    await prisma.user.update({
      where: { id: parent.id },
      data: { passwordHash }
    });
    console.log('Parent Phone:', parent.phone);
    console.log('Parent Password:', '12345678');
    
    // find student linked
    const link = await prisma.parentStudentLink.findFirst({
        where: { parentId: parent.id },
        include: { student: { include: { user: true } } }
    });
    if (link) {
        console.log('Student Phone:', link.student.user.phone);
    } else {
        console.log('No linked student.');
    }
  } else {
    console.log('No parent found');
  }
  
  await prisma.$disconnect();
}
main();
