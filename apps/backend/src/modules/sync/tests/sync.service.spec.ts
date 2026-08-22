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
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(47),
    },
    groupEnrollment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    attendanceRecord: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    academicGroup: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    teacherProfile: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    parentStudentLink: {
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

  describe('syncUnifiedBatch', () => {
    it('should atomically process offline created groups and students, returning idMappings with generated student codes', async () => {
      const clientTempGroupId = '018d39f4-6a8b-7000-8000-000000000001';
      const clientTempStudent1Id = '018d39f4-6a8b-7000-8000-000000000002';
      const clientTempStudent2Id = '018d39f4-6a8b-7000-8000-000000000003';

      mockPrismaService.teacherProfile.findFirst.mockResolvedValue({
        id: 'teacher-profile-1',
      });
      mockPrismaService.academicGroup.findFirst.mockResolvedValue(null);
      mockPrismaService.academicGroup.create.mockImplementation(async ({ data }: any) => ({
        id: data.id || 'server-group-id-1',
        ...data,
      }));

      mockPrismaService.studentProfile.findFirst.mockResolvedValue(null);
      mockPrismaService.studentProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockImplementation(async ({ data }: any) => ({
        id: data.id || 'server-user-id-1',
        ...data,
      }));
      mockPrismaService.studentProfile.create.mockImplementation(async ({ data }: any) => ({
        ...data,
      }));
      mockPrismaService.groupEnrollment.findFirst.mockResolvedValue(null);
      mockPrismaService.groupEnrollment.create.mockResolvedValue({
        id: 'enr-1',
        status: GroupEnrollmentStatus.ACTIVE,
      });

      const batchDto = {
        groups: [
          {
            clientTempId: clientTempGroupId,
            name: 'مجموعة الفيزياء الذرية',
            gradeLevel: 'الصف الأول الثانوي',
            academicYear: '2026-2027',
            academicTerm: 'FIRST_TERM',
            maxCapacity: 40,
            monthlyFee: 350,
          },
        ],
        students: [
          {
            clientTempId: clientTempStudent1Id,
            fullName: 'أحمد محمود',
            phone: '01011112222',
            gradeLevel: 'الصف الأول الثانوي',
            academicYear: '2026-2027',
            academicTerm: 'FIRST_TERM',
            parentPhone: '01211112222',
            groupId: clientTempGroupId,
          },
          {
            clientTempId: clientTempStudent2Id,
            fullName: 'سارة يوسف',
            phone: '01033334444',
            gradeLevel: 'الصف الأول الثانوي',
            academicYear: '2026-2027',
            academicTerm: 'FIRST_TERM',
            groupId: clientTempGroupId,
          },
        ],
      };

      const res = await service.syncUnifiedBatch(mockTeacherUser, batchDto);

      expect(res.success).toBe(true);
      expect(res.idMappings).toBeDefined();
      expect(res.idMappings.groups[clientTempGroupId]).toBe(clientTempGroupId);
      expect(res.idMappings.students[clientTempStudent1Id]).toBeDefined();
      expect(res.idMappings.students[clientTempStudent1Id].studentCode).toMatch(/^STU-\d{4}-\d{5}/);
      expect(res.idMappings.students[clientTempStudent2Id]).toBeDefined();
      expect(res.idMappings.students[clientTempStudent2Id].studentCode).toMatch(/^STU-\d{4}-\d{5}/);

      // Verify groups and students were created in transaction
      expect(mockPrismaService.academicGroup.create).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.studentProfile.create).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.groupEnrollment.create).toHaveBeenCalledTimes(2);
    });
  });
});
