import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from '../services/sync.service';
import { CoursesService } from '../../courses/services/courses.service';

describe('SyncService', () => {
  let service: SyncService;
  let coursesService: CoursesService;

  const mockCoursesService = {
    applyMonotonicProgressBatch: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: CoursesService, useValue: mockCoursesService },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    coursesService = module.get<CoursesService>(CoursesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processBatchProgress', () => {
    it('should delegate offline batch operations to CoursesService', async () => {
      const studentId = 'stu-uuid-1';
      const mockBatchDto = {
        operations: [
          {
            clientOperationId: 'op-1',
            courseId: 'course-1',
            lessonId: 'lesson-1',
            positionSeconds: 120,
            isCompleted: false,
          },
          {
            clientOperationId: 'op-2',
            courseId: 'course-1',
            lessonId: 'lesson-2',
            positionSeconds: 600,
            isCompleted: true,
          },
        ],
      };

      const mockResult = {
        syncedCount: 2,
        processedOperationIds: ['op-1', 'op-2'],
        courseId: 'course-1',
        overallCourseCompletionPercentage: 50,
      };

      mockCoursesService.applyMonotonicProgressBatch.mockResolvedValue(mockResult);

      const result = await service.processBatchProgress(studentId, mockBatchDto);

      expect(coursesService.applyMonotonicProgressBatch).toHaveBeenCalledWith(
        studentId,
        mockBatchDto.operations,
      );
      expect(result.syncedCount).toBe(2);
      expect(result.overallCourseCompletionPercentage).toBe(50);
    });
  });
});
