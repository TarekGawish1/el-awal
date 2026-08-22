import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from '../services/sync.service';
import { CoursesService } from '../../courses/services/courses.service';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  AttendanceStatus,
  RecordingMethod,
  PaymentStatus,
  SubmissionStatus,
  QuestionType,
  GroupEnrollmentStatus,
  UserRole,
} from '@prisma/client';

describe('SyncService', () => {
  let service: SyncService;
  let coursesService: CoursesService;

  const mockCoursesService = {
    applyMonotonicProgressBatch: jest.fn(),
  };

  const mockPrismaService = {
    lessonSession: {
      findUnique: jest.fn(),
    },
    studentProfile: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    groupEnrollment: {
      findUnique: jest.fn(),
    },
    attendanceRecord: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    studentPaymentRecord: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    assessment: {
      findUnique: jest.fn(),
    },
    assessmentSubmission: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    studentAnswer: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn(async (cb) => cb(mockPrismaService)),
  };

  const mockTeacherUser: any = {
    id: 'teacher-1',
    role: UserRole.TEACHER,
    teacherProfileId: 'teacher-profile-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: CoursesService, useValue: mockCoursesService },
        { provide: PrismaService, useValue: mockPrismaService },
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
        ],
      };

      const mockResult = {
        syncedCount: 1,
        processedOperationIds: ['op-1'],
        courseId: 'course-1',
        overallCourseCompletionPercentage: 50,
      };

      mockCoursesService.applyMonotonicProgressBatch.mockResolvedValue(mockResult);

      const result = await service.processBatchProgress(studentId, mockBatchDto as any);

      expect(coursesService.applyMonotonicProgressBatch).toHaveBeenCalledWith(
        studentId,
        mockBatchDto.operations,
      );
      expect(result.syncedCount).toBe(1);
    });
  });

  describe('syncAttendanceBatch', () => {
    it('should insert new attendance records and suppress duplicates', async () => {
      mockPrismaService.lessonSession.findUnique.mockResolvedValue({
        id: 'session-1',
        groupId: 'group-1',
      });

      mockPrismaService.studentProfile.findFirst.mockResolvedValue({
        id: 'student-1',
        fullName: 'أحمد محمود',
      });

      mockPrismaService.groupEnrollment.findUnique.mockResolvedValue({
        groupId: 'group-1',
        studentId: 'student-1',
        status: GroupEnrollmentStatus.ACTIVE,
      });

      // First call -> no existing record (new insert)
      // Second call -> existing record found (duplicate ignored)
      mockPrismaService.attendanceRecord.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'att-existing' });

      mockPrismaService.attendanceRecord.create.mockResolvedValue({ id: 'att-new' });

      const dto = {
        operations: [
          {
            id: 'op-att-1',
            sessionId: 'session-1',
            qrCodeToken: 'qr-token-1',
            status: AttendanceStatus.PRESENT,
            recordingMethod: RecordingMethod.QR_SCAN,
            clientTimestamp: Date.now(),
          },
          {
            id: 'op-att-2',
            sessionId: 'session-1',
            qrCodeToken: 'qr-token-1',
            status: AttendanceStatus.PRESENT,
            recordingMethod: RecordingMethod.QR_SCAN,
            clientTimestamp: Date.now(),
          },
        ],
      };

      const result = await service.syncAttendanceBatch(mockTeacherUser, dto);

      expect(result.syncedCount).toBe(1);
      expect(result.duplicatesIgnored).toBe(1);
      expect(result.processedOperationIds).toEqual(['op-att-1', 'op-att-2']);
      expect(mockPrismaService.attendanceRecord.create).toHaveBeenCalledTimes(1);
    });

    it('should process a batch of 10 attendance records containing 3 intentional duplicates and succeed with 7 unique records', async () => {
      mockPrismaService.lessonSession.findUnique.mockResolvedValue({
        id: 'session-100',
        groupId: 'group-100',
      });

      mockPrismaService.groupEnrollment.findUnique.mockResolvedValue({
        groupId: 'group-100',
        studentId: 'student-x',
        status: GroupEnrollmentStatus.ACTIVE,
      });

      // 10 operations: indices 0..6 unique (null), indices 7..9 duplicate (existing)
      for (let i = 0; i < 7; i++) {
        mockPrismaService.attendanceRecord.findUnique.mockResolvedValueOnce(null);
      }
      for (let i = 0; i < 3; i++) {
        mockPrismaService.attendanceRecord.findUnique.mockResolvedValueOnce({ id: `att-dup-${i}` });
      }

      mockPrismaService.attendanceRecord.create.mockResolvedValue({ id: 'att-created' });

      const operations = Array.from({ length: 10 }, (_, i) => ({
        id: `op-batch-${i + 1}`,
        sessionId: 'session-100',
        studentId: `student-${i < 7 ? i + 1 : (i % 3) + 1}`,
        status: AttendanceStatus.PRESENT,
        recordingMethod: RecordingMethod.QR_SCAN,
        allowCrossGroup: true,
        clientTimestamp: Date.now(),
      }));

      const result = await service.syncAttendanceBatch(mockTeacherUser, { operations });

      expect(result.syncedCount).toBe(7);
      expect(result.duplicatesIgnored).toBe(3);
      expect(result.failedCount).toBe(0);
      expect(result.processedOperationIds).toHaveLength(10);
      expect(mockPrismaService.attendanceRecord.create).toHaveBeenCalledTimes(7);
    });
  });

  describe('syncPaymentsBatch', () => {
    it('should reconcile tuition payment operations and prevent duplicate payments', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'student-1',
      });

      mockPrismaService.studentPaymentRecord.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'pay-1', paymentStatus: PaymentStatus.PAID });

      mockPrismaService.studentPaymentRecord.create.mockResolvedValue({ id: 'pay-new' });

      const dto = {
        operations: [
          {
            id: 'op-pay-1',
            studentId: 'student-1',
            groupId: 'group-1',
            periodYear: 2026,
            periodMonth: 9,
            amountPaid: 350,
            paymentMethod: 'CASH',
            clientTimestamp: Date.now(),
          },
          {
            id: 'op-pay-2',
            studentId: 'student-1',
            groupId: 'group-1',
            periodYear: 2026,
            periodMonth: 9,
            amountPaid: 350,
            paymentMethod: 'CASH',
            clientTimestamp: Date.now(),
          },
        ],
      };

      const result = await service.syncPaymentsBatch(mockTeacherUser, dto);

      expect(result.syncedCount).toBe(1);
      expect(result.duplicatesIgnored).toBe(1);
      expect(mockPrismaService.studentPaymentRecord.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('syncAssessmentsBatch', () => {
    it('should auto-grade and record offline assessment submissions', async () => {
      const studentId = 'student-1';
      mockPrismaService.assessment.findUnique.mockResolvedValue({
        id: 'exam-1',
        questions: [
          {
            id: 'q-1',
            questionType: QuestionType.MULTIPLE_CHOICE,
            correctAnswer: 'A',
            points: 10,
          },
        ],
      });

      mockPrismaService.assessmentSubmission.findUnique.mockResolvedValue(null);
      mockPrismaService.assessmentSubmission.create.mockResolvedValue({
        id: 'sub-1',
        status: SubmissionStatus.GRADED,
        scoreObtained: 10,
      });

      const dto = {
        operations: [
          {
            id: 'op-exam-1',
            assessmentId: 'exam-1',
            answers: [{ questionId: 'q-1', selectedAnswer: 'A' }],
            clientTimestamp: Date.now(),
          },
        ],
      };

      const result = await service.syncAssessmentsBatch(studentId, dto);

      expect(result.syncedCount).toBe(1);
      expect(mockPrismaService.assessmentSubmission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assessmentId: 'exam-1',
            scoreObtained: 10,
            status: SubmissionStatus.GRADED,
          }),
        }),
      );
    });
  });
});
