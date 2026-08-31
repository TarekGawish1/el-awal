const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const certs = await prisma.certificate.findMany();
  console.log(JSON.stringify(certs.map(c => ({id: c.id, student: c.studentName})), null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
