const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const parents = await prisma.user.findMany({
    where: { role: 'PARENT' },
    take: 1,
  });
  console.log(parents);
  await prisma.$disconnect();
}
main();
