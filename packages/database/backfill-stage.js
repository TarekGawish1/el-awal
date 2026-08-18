const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.studentProfile.findMany();
  for (const student of students) {
    let stage = null;
    if (student.gradeLevel?.includes('الابتدائي')) stage = 'PRIMARY';
    else if (student.gradeLevel?.includes('الإعدادي')) stage = 'MIDDLE';
    else if (student.gradeLevel?.includes('الثانوي')) stage = 'SECONDARY';

    if (stage) {
      await prisma.studentProfile.update({
        where: { id: student.id },
        data: { academicStage: stage }
      });
      console.log(`Updated student ${student.studentCode} to ${stage}`);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
