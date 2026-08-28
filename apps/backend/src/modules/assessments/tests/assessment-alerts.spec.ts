import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssessmentsService } from '../services/assessments.service';
import { AssessmentType, NotificationChannel, NotificationType, QuestionType } from '@prisma/client';

describe('Assessment alerts', () => {
  it('dispatches a homework notification to every active group member', async () => {
    const dispatchToUsers = jest.fn().mockResolvedValue([]);
    const prisma: any = {
      academicGroup: {
        findUnique: jest.fn().mockResolvedValue({ name: 'مجموعة النحو' }),
      },
      groupEnrollment: {
        findMany: jest.fn().mockResolvedValue([
          { student: { id: 'student-1', user: { id: 'user-1' } } },
          { student: { id: 'student-2', user: { id: 'user-2' } } },
        ]),
      },
      $transaction: jest.fn(async (callback) =>
        callback({
          assessment: {
            create: jest.fn().mockResolvedValue({
              id: 'assessment-1',
              title: 'واجب الوحدة الأولى',
              type: AssessmentType.ASSIGNMENT,
              assessmentType: AssessmentType.HOMEWORK,
              totalScore: 10,
              groupId: 'group-1',
              isPublished: true,
              dueDate: new Date('2026-09-02T18:00:00.000Z'),
              deadline: new Date('2026-09-02T18:00:00.000Z'),
            }),
          },
          assessmentQuestion: { createMany: jest.fn() },
        }),
      ),
    };
    const notifications: any = { dispatchToUsers };
    const service = new AssessmentsService(prisma, { emit: jest.fn() } as unknown as EventEmitter2, notifications);

    await service.createAssessment('teacher-1', true, {
      title: 'واجب الوحدة الأولى',
      type: AssessmentType.ASSIGNMENT,
      totalScore: 10,
      groupId: 'group-1',
      dueDate: '2026-09-02T18:00:00.000Z',
      questions: [
        {
          questionNumber: 1,
          questionText: 'سؤال',
          questionType: QuestionType.MULTIPLE_CHOICE,
          correctAnswer: 'أ',
          points: 10,
        },
      ],
    });

    expect(dispatchToUsers).toHaveBeenCalledWith(
      ['user-1', 'user-2'],
      expect.objectContaining({
        notificationType: NotificationType.NEW_HOMEWORK_ASSIGNED,
        title: '📝 واجب جديد: واجب الوحدة الأولى',
      }),
      [NotificationChannel.IN_APP, NotificationChannel.WEB_PUSH],
    );
  });
});
