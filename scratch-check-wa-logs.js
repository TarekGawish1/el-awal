require('dotenv').config({ path: './apps/backend/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const logs = await prisma.whatsAppMessageLog.findMany({
    where: { createdAt: { gte: startOfDay } },
    orderBy: { createdAt: 'desc' },
    take: 30
  });

  console.log(`Total messages today: ${logs.length}`);
  for (const l of logs) {
    console.log({
      id: l.id,
      phone: l.recipientPhone,
      name: l.recipientName,
      status: l.status,
      template: l.templateType,
      failureReason: l.failureReason,
      retryCount: l.retryCount,
      scheduledFor: l.scheduledFor,
      sentAt: l.sentAt,
      createdAt: l.createdAt
    });
  }

  const auth = await prisma.whatsAppAuthSession.findMany({ select: { id: true } });
  console.log('WhatsAppAuthSession records count:', auth.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
