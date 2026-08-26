import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/backend/.env') });

import { PrismaClient } from '@prisma/client';

const apply = process.argv.includes('--apply');

const connectionUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
const prisma = new PrismaClient({
  datasources: connectionUrl
    ? { db: { url: connectionUrl } }
    : undefined,
});

async function main() {
  console.log(`🔍 Exploring sessions with multiple active sessions per group per day (apply=${apply})`);

  const groups = await prisma.academicGroup.findMany({
    select: { id: true, name: true, gradeLevel: true },
  });
  const groupMap = new Map(groups.map((g) => [g.id, g]));

  // Active (non-cancelled) sessions only. Cancelled sessions are kept untouched:
  // they represent an explicit cancellation of the day's lesson.
  const sessions = await prisma.lessonSession.findMany({
    where: { isCancelled: false },
    orderBy: [
      { scheduleId: { sort: 'desc', nulls: 'last' } }, // regular scheduled sessions first (kept)
      { startTime: 'asc' },
      { createdAt: 'asc' },
    ],
    select: {
      id: true,
      groupId: true,
      scheduleId: true,
      sessionDate: true,
      startTime: true,
      endTime: true,
      topic: true,
      createdAt: true,
    },
  });

  const byGroupDay = new Map<string, typeof sessions>();
  for (const session of sessions) {
    const day = session.sessionDate.toISOString().split('T')[0];
    const key = `${session.groupId}:${day}`;
    const list = byGroupDay.get(key) || [];
    list.push(session);
    byGroupDay.set(key, list);
  }

  const removalIds: string[] = [];
  let affectedDays = 0;

  for (const [key, groupSessions] of byGroupDay) {
    if (groupSessions.length <= 1) continue;
    affectedDays += 1;

    const [keep, ...remove] = groupSessions;
    const group = groupMap.get(keep.groupId);
    const day = key.split(':')[1];

    console.log(`\n📅 ${group?.name || keep.groupId} (${group?.gradeLevel || '?'}) - يوم ${day}`);
    console.log(`   ✅ سيتم الاحتفاظ بـ: ${keep.topic || 'بدون عنوان'} [${keep.startTime || '-'} - ${keep.endTime || '-'}] ${keep.scheduleId ? '(حصة أساسية مجدولة)' : '(يدوية)'}`);
    for (const extra of remove) {
      console.log(`   ❌ سيتم حذف: ${extra.topic || 'بدون عنوان'} [${extra.startTime || '-'} - ${extra.endTime || '-'}] ${extra.scheduleId ? '(حصة أساسية مجدولة)' : '(يدوية)'}`);
      removalIds.push(extra.id);
    }
  }

  console.log(`\n📊 النتائج: ${affectedDays} يوم به أكثر من حصة لنفس المجموعة، ${removalIds.length} حصة زائدة سيتم حذفها`);

  if (apply && removalIds.length > 0) {
    const deleted = await prisma.lessonSession.deleteMany({
      where: { id: { in: removalIds } },
    });
    console.log(`🗑️ تم حذف ${deleted.count} حصة زائدة بنجاح`);
  } else if (apply) {
    console.log('✨ لا توجد حصص زائدة للحذف');
  } else {
    console.log('ℹ️ تشغيل بدون --apply: لم يتم حذف أي شيء. لإجراء الحذف أضف --apply');
  }
}

main()
  .catch((err) => {
    console.error('❌ فشل التنفيذ:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());