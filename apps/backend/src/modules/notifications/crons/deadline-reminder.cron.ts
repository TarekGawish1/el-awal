import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { NotificationsService } from '../services/notifications.service';
import * as cron from 'node-cron';

@Injectable()
export class DeadlineReminderCron implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeadlineReminderCron.name);
  private task?: cron.ScheduledTask;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    this.task = cron.schedule('0 * * * *', () => void this.run(), {
      timezone: 'Africa/Cairo',
    });
    this.logger.log('Deadline reminder cron initialized');
  }

  onModuleDestroy() {
    this.task?.stop();
  }

  async run(now = new Date()): Promise<void> {
    const targetStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const targetEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    try {
      const assessments = await this.prisma.assessment.findMany({
        where: {
          isPublished: true,
          groupId: { not: null },
          OR: [
            { deadline: { gte: targetStart, lte: targetEnd } },
            {
              deadline: null,
              dueDate: { gte: targetStart, lte: targetEnd },
            },
          ],
        },
        select: {
          id: true,
          title: true,
          type: true,
          assessmentType: true,
          groupId: true,
          deadline: true,
          dueDate: true,
          group: { select: { name: true } },
        },
      });

      for (const assessment of assessments) {
        if (!assessment.groupId) continue;

        const deadline = assessment.deadline || assessment.dueDate;
        if (!deadline) continue;

        const pendingStudents = await this.prisma.studentProfile.findMany({
          where: {
            groupEnrollments: {
              some: { groupId: assessment.groupId, status: 'ACTIVE' },
            },
            homeworkRecords: {
              none: {
                assessmentId: assessment.id,
                status: { in: ['SUBMITTED_ONLINE', 'CHECKED_ONSITE'] },
              },
            },
            assessmentSubmissions: {
              none: { assessmentId: assessment.id },
            },
          },
          select: { id: true },
        });

        const notificationType =
          assessment.assessmentType === 'HOMEWORK' || assessment.type === 'ASSIGNMENT'
            ? NotificationType.HOMEWORK_DEADLINE_REMINDER
            : NotificationType.EXAM_DEADLINE_REMINDER;
        const pendingUserIds: string[] = [];

        for (const student of pendingStudents) {
          const userId =
            (student as { userId?: string }).userId || student.id;
          const alreadySent = await this.prisma.notification.findFirst({
            where: {
              recipientId: userId,
              notificationType,
              referenceEntityId: assessment.id,
              createdAt: {
                gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
              },
            },
            select: { id: true },
          });

          if (!alreadySent && userId) pendingUserIds.push(userId);
        }

        if (pendingUserIds.length === 0) continue;

        const time = deadline.toLocaleTimeString('ar-EG', {
          timeZone: 'Africa/Cairo',
          hour: '2-digit',
          minute: '2-digit',
        });
        const groupName = assessment.group?.name || 'مجموعتك الدراسية';

        await this.notifications.dispatchToUsers(
          pendingUserIds,
          {
            notificationType,
            title: `⏰ تذكير: متبقي 24 ساعة فقط على تسليم ${assessment.title}`,
            body: `تذكير بموعد تسليم ${assessment.title} لمجموعة ${groupName}. يرجى رفع الحل قبل انتهاء الوقت غداً الساعة ${time}.`,
            referenceEntityId: assessment.id,
            data: {
              assessmentId: assessment.id,
              groupId: assessment.groupId,
              groupName,
              deadline: deadline.toISOString(),
              priority: 'high',
            },
          },
          [NotificationChannel.IN_APP, NotificationChannel.WEB_PUSH],
        );
      }
    } catch (error) {
      this.logger.error('Deadline reminder cron failed', error);
    }
  }
}
