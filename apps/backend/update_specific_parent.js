const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  const student = await prisma.user.findFirst({
    where: { role: 'STUDENT' },
    include: { studentProfile: { include: { parentLinks: { include: { parent: { include: { user: true } } } } } } }
  });
  
  if (student && student.studentProfile && student.studentProfile.parentLinks.length > 0) {
      const parentUser = student.studentProfile.parentLinks[0].parent.user;
      
      const passwordHash = await bcrypt.hash('12345678', 10);
      await prisma.user.update({
        where: { id: parentUser.id },
        data: { passwordHash }
      });
      
      console.log('Parent Phone:', parentUser.phone);
      console.log('Parent Password:', '12345678');
      console.log('Student Phone:', student.phone);
  } else {
    console.log('No parent link found');
  }
  
  await prisma.$disconnect();
}
main();
