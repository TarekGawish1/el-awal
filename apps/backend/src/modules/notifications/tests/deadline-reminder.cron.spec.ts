import { DeadlineReminderCron } from '../crons/deadline-reminder.cron';
import { NotificationChannel, NotificationType } from '@prisma/client';

describe('DeadlineReminderCron', () => {
  it('selects pending students in the 24-hour window and suppresses duplicates', async () => {
    const now = new Date('2026-09-01T12:00:00.000Z');
    const deadline = new Date('2026-09-02T12:00:00.000Z');
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'existing-reminder' });
    const dispatchToUsers = jest.fn().mockResolvedValue([]);
    const prisma: any = {
      assessment: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'assessment-1',
            title: 'واجب المراجعة',
            type: 'ASSIGNMENT',
            assessmentType: 'HOMEWORK',
            groupId: 'group-1',
            deadline,
            dueDate: deadline,
            group: { name: 'مجموعة النحو' },
          },
        ]),
      },
      studentProfile: {
        findMany: jest.fn().mockResolvedValue([{ id: 'user-pending' }, { id: 'user-already-notified' }]),
      },
      notification: { findFirst },
    };
    const cron = new DeadlineReminderCron(prisma, { dispatchToUsers } as any);

    await cron.run(now);

    expect(prisma.assessment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isPublished: true, groupId: { not: null } }),
      }),
    );
    expect(prisma.studentProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          homeworkRecords: expect.objectContaining({ none: expect.any(Object) }),
          assessmentSubmissions: { none: { assessmentId: 'assessment-1' } },
        }),
      }),
    );
    expect(dispatchToUsers).toHaveBeenCalledWith(
      ['user-pending'],
      expect.objectContaining({ notificationType: NotificationType.HOMEWORK_DEADLINE_REMINDER }),
      [NotificationChannel.IN_APP, NotificationChannel.WEB_PUSH],
    );
  });
});
