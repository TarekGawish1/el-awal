const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Deleting all certificates...');
  const result = await prisma.certificate.deleteMany();
  console.log(`Deleted ${result.count} certificates.`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
