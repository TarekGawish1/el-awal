process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { WebPushService } from '../src/services/webpush.service';
import { PrismaService } from '../src/core/database/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'error', 'warn'] });
  const webPush = app.get(WebPushService);
  const prisma = app.get(PrismaService);

  const teacher = await prisma.user.findFirst({
    where: { role: 'TEACHER' },
    select: { id: true, fullName: true },
  });

  if (!teacher) {
    console.error('No teacher found in database');
    await app.close();
    return;
  }

  console.log(`Sending test push to teacher [${teacher.fullName}] (ID: ${teacher.id})...`);

  const resultCount = await webPush.sendToUser(teacher.id, {
    title: '🔔 اختبار الإشعارات الفورية',
    body: 'تم استلام الإشعار بنجاح عبر النظام الجديد! 🚀',
    url: '/teacher/dashboard',
    data: { test: true, timestamp: Date.now() },
  });

  console.log(`Result: successfully sent to ${resultCount} device(s)`);
  await app.close();
}

main().catch(console.error);
