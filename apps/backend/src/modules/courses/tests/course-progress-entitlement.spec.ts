import { Test, TestingModule } from '@nestjs/testing';
import { CourseProgressService } from '../services/course-progress.service';
import { CourseProgressRepository } from '../repositories/course-progress.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { CourseAccessStatus, CourseEnrollmentStatus } from '@prisma/client';

describe('SEC-10: CourseProgressService - Entitlement Verification in applyMonotonicProgressBatch', () => {
  let service: CourseProgressService;
  let mockPrisma: any;
  let mockRepo: any;

  beforeEach(async () => {
    mockPrisma = {
      courseLesson: {
        findMany: jest.fn(),
      },
      courseAccess: {
        findMany: jest.fn(),
      },
      courseEnrollment: {
        findMany: jest.fn(),
      },
    };

    mockRepo = {
      syncBatch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseProgressService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CourseProgressRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<CourseProgressService>(CourseProgressService);
  });

  it('rejects progress updates for courses where student has no active enrollment or access', async () => {
    const studentId = 'stu-unauthorized-1';

    // Student claims progress on Lesson 1 (Course A) and Lesson 2 (Course B)
    mockPrisma.courseLesson.findMany.mockResolvedValue([
      { id: 'lesson-1', isPreview: false, module: { courseId: 'course-a' } },
      { id: 'lesson-2', isPreview: false, module: { courseId: 'course-b' } },
    ]);

    // Student only has active access to Course A, NOT Course B
    mockPrisma.courseAccess.findMany.mockResolvedValue([
      { courseId: 'course-a', accessStatus: CourseAccessStatus.ACTIVE },
    ]);
    mockPrisma.courseEnrollment.findMany.mockResolvedValue([]);

    mockRepo.syncBatch.mockResolvedValue({
      syncedCount: 1,
      processedOperationIds: ['op-1'],
      courseId: 'course-a',
      overallCourseCompletionPercentage: 50,
    });

    const items = [
      { lessonId: 'lesson-1', clientOperationId: 'op-1', positionSeconds: 120, isCompleted: false },
      { lessonId: 'lesson-2', clientOperationId: 'op-2', positionSeconds: 300, isCompleted: true },
    ];

    const result = await service.applyMonotonicProgressBatch(studentId, items as any);

    // Only lesson-1 should have been passed to repository
    expect(mockRepo.syncBatch).toHaveBeenCalledWith(
      studentId,
      expect.arrayContaining([
        expect.objectContaining({ lessonId: 'lesson-1', courseId: 'course-a' }),
      ]),
    );

    const passedItems = mockRepo.syncBatch.mock.calls[0][1];
    expect(passedItems.find((i: any) => i.lessonId === 'lesson-2')).toBeUndefined();
    expect(result.syncedCount).toBe(1);
  });

  it('permits preview lessons even if student is not enrolled in the course', async () => {
    const studentId = 'stu-guest-1';

    mockPrisma.courseLesson.findMany.mockResolvedValue([
      { id: 'lesson-preview', isPreview: true, module: { courseId: 'course-preview' } },
    ]);

    mockPrisma.courseAccess.findMany.mockResolvedValue([]);
    mockPrisma.courseEnrollment.findMany.mockResolvedValue([]);

    mockRepo.syncBatch.mockResolvedValue({
      syncedCount: 1,
      processedOperationIds: ['op-preview'],
      courseId: 'course-preview',
      overallCourseCompletionPercentage: 25,
    });

    const items = [
      { lessonId: 'lesson-preview', clientOperationId: 'op-preview', positionSeconds: 60, isCompleted: true },
    ];

    const result = await service.applyMonotonicProgressBatch(studentId, items as any);
    expect(mockRepo.syncBatch).toHaveBeenCalled();
    expect(result.syncedCount).toBe(1);
  });

  it('returns empty result when all submitted lessons belong to unentitled courses', async () => {
    const studentId = 'stu-unauthorized-2';

    mockPrisma.courseLesson.findMany.mockResolvedValue([
      { id: 'lesson-unauthorized', isPreview: false, module: { courseId: 'course-locked' } },
    ]);

    mockPrisma.courseAccess.findMany.mockResolvedValue([]);
    mockPrisma.courseEnrollment.findMany.mockResolvedValue([]);

    const items = [
      { lessonId: 'lesson-unauthorized', clientOperationId: 'op-unauth', positionSeconds: 500, isCompleted: true },
    ];

    const result = await service.applyMonotonicProgressBatch(studentId, items as any);
    expect(mockRepo.syncBatch).not.toHaveBeenCalled();
    expect(result.syncedCount).toBe(0);
    expect(result.processedOperationIds).toEqual([]);
  });
});
