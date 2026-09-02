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
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(47),
    },
    groupEnrollment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    attendanceRecord: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
    },
    studentPaymentRecord: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    academicGroup: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    teacherProfile: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    parentStudentLink: {
      create: jest.fn(),
    },
    booklet: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },

    assessment: {
      findUnique: jest.fn(),
    },
    assessmentSubmission: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
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
        user: { isActive: true },
        groupEnrollments: [{ groupId: 'group-1', status: GroupEnrollmentStatus.ACTIVE }],
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

      mockPrismaService.studentProfile.findFirst.mockResolvedValue({
        id: 'student-1',
        user: { isActive: true },
        groupEnrollments: [{ groupId: 'group-100', status: GroupEnrollmentStatus.ACTIVE }],
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
      mockPrismaService.studentProfile.findFirst.mockResolvedValue({
        id: 'student-1',
        user: { isActive: true },
      });

      mockPrismaService.studentPaymentRecord.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'pay-existing', paymentStatus: PaymentStatus.PAID, amountExpected: 350 });

      mockPrismaService.studentPaymentRecord.create.mockResolvedValue({ id: 'pay-new' });
      mockPrismaService.studentPaymentRecord.update.mockResolvedValue({ id: 'pay-existing' });

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
      expect(result.idMappings).toBeDefined();
      expect(result.idMappings['op-pay-1']).toBe('pay-new');
      expect(result.idMappings['op-pay-2']).toBe('pay-existing');
      expect(mockPrismaService.studentPaymentRecord.create).toHaveBeenCalledTimes(1);
    });

    it('should persist a booklet payment inside an atomic transaction and decrement booklet stockCount', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'student-1',
        gradeLevel: 'الصف الأول الثانوي',
        groupEnrollments: [],
      });

      mockPrismaService.booklet.findUnique
        .mockResolvedValueOnce({
          id: 'booklet-1',
          title: 'مذكرة الكيمياء',
          gradeLevel: 'الصف الأول الثانوي',
          groupId: null,
          stockCount: 10,
        })
        .mockResolvedValueOnce({
          id: 'booklet-1',
          title: 'مذكرة الكيمياء',
          gradeLevel: 'الصف الأول الثانوي',
          groupId: null,
          stockCount: 10,
        });

      mockPrismaService.studentPaymentRecord.findFirst.mockResolvedValue(null);
      mockPrismaService.studentPaymentRecord.create.mockResolvedValue({
        id: 'pay-booklet-new',
        studentId: 'student-1',
        bookletId: 'booklet-1',
        paymentType: 'BOOKLET',
        amountPaid: 85,
      });

      const dto = {
        operations: [
          {
            id: 'op-pay-booklet-1',
            studentId: 'student-1',
            paymentType: 'BOOKLET' as const,
            bookletId: 'booklet-1',
            amountPaid: 85,
            paymentMethod: 'CASH',
            clientTimestamp: Date.now(),
          },
        ],
      };

      const result = await service.syncPaymentsBatch(mockTeacherUser, dto);

      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(mockPrismaService.studentPaymentRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            studentId: 'student-1',
            bookletId: 'booklet-1',
            paymentType: 'BOOKLET',
            amountPaid: 85,
          }),
        }),
      );
      expect(mockPrismaService.booklet.update).toHaveBeenCalledWith({
        where: { id: 'booklet-1' },
        data: { stockCount: { decrement: 1 } },
      });
      expect(result.idMappings['op-pay-booklet-1']).toBe('pay-booklet-new');
    });

    it('should return a structured conflict when a booklet grade does not match the student grade', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'student-1',
        gradeLevel: 'الصف الأول الثانوي',
        groupEnrollments: [],
      });
      mockPrismaService.booklet.findUnique.mockResolvedValue({
        id: 'booklet-1',
        gradeLevel: 'الصف الثالث الثانوي',
      });

      const result = await service.syncPaymentsBatch(mockTeacherUser, {
        operations: [
          {
            id: 'op-pay-booklet-mismatch',
            studentId: 'student-1',
            paymentType: 'BOOKLET',
            bookletId: 'booklet-1',
            amountPaid: 85,
          },
        ],
      });

      expect(result.failedCount).toBe(1);
      expect(result.conflicts).toEqual([
        expect.objectContaining({
          operationId: 'op-pay-booklet-mismatch',
          code: 'BOOKLET_GRADE_MISMATCH',
          entityId: 'booklet-1',
          details: {
            studentId: 'student-1',
            studentGradeLevel: 'الصف الأول الثانوي',
            bookletId: 'booklet-1',
            bookletGradeLevel: 'الصف الثالث الثانوي',
          },
        }),
      ]);
      expect(mockPrismaService.studentPaymentRecord.create).not.toHaveBeenCalled();
    });

    it('should delete the StudentPaymentRecord in PostgreSQL when processing a DELETE_PAYMENT operation', async () => {
      mockPrismaService.studentPaymentRecord.findUnique.mockResolvedValue({
        id: 'pay-to-delete',
        studentId: 'student-1',
        group: { teacherId: 'teacher-profile-1' },
      });
      mockPrismaService.studentPaymentRecord.delete.mockResolvedValue({ id: 'pay-to-delete' });

      const dto = {
        operations: [
          {
            id: 'op-delete-1',
            type: 'DELETE_PAYMENT' as const,
            paymentId: 'pay-to-delete',
            clientTimestamp: Date.now(),
          },
        ],
      };

      const result = await service.syncPaymentsBatch(mockTeacherUser, dto);

      expect(mockPrismaService.studentPaymentRecord.delete).toHaveBeenCalledWith({
        where: { id: 'pay-to-delete' },
      });
      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(result.processedOperationIds).toContain('op-delete-1');
    });

    it('should treat DELETE_PAYMENT as an idempotent success when the record no longer exists', async () => {
      mockPrismaService.studentPaymentRecord.findUnique.mockResolvedValue(null);

      const dto = {
        operations: [
          {
            id: 'op-delete-2',
            type: 'DELETE_PAYMENT' as const,
            paymentId: 'already-gone',
            clientTimestamp: Date.now(),
          },
        ],
      };

      const result = await service.syncPaymentsBatch(mockTeacherUser, dto);

      expect(mockPrismaService.studentPaymentRecord.delete).not.toHaveBeenCalled();
      expect(result.duplicatesIgnored).toBe(1);
      expect(result.processedOperationIds).toContain('op-delete-2');
    });
  });

  describe('syncAssessmentsBatch', () => {
    it('should auto-grade and record offline assessment submissions', async () => {
      const studentId = 'student-1';
      mockPrismaService.assessment.findUnique.mockResolvedValue({
        id: 'exam-1',
        allowMultipleAttempts: false,
        questions: [
          {
            id: 'q-1',
            questionType: QuestionType.MULTIPLE_CHOICE,
            correctAnswer: 'A',
            points: 10,
          },
        ],
      });

      mockPrismaService.assessmentSubmission.findMany.mockResolvedValue([]); // No prior attempts
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
            attemptNumber: 1,
            scoreObtained: 10,
            status: SubmissionStatus.GRADED,
          }),
        }),
      );
    });

    it('should ignore a re-sent offline submission with the same client timestamp (idempotency)', async () => {
      const studentId = 'student-1';
      const clientTs = 1_700_000_000_000;
      mockPrismaService.assessment.findUnique.mockResolvedValue({
        id: 'exam-1',
        allowMultipleAttempts: true, // even with retakes allowed, a re-send is not a new attempt
        questions: [
          {
            id: 'q-1',
            questionType: QuestionType.MULTIPLE_CHOICE,
            correctAnswer: 'A',
            points: 10,
          },
        ],
      });

      // A prior attempt already stored at the exact same client timestamp.
      mockPrismaService.assessmentSubmission.findMany.mockResolvedValue([
        { id: 'sub-prior', attemptNumber: 1, submittedAt: new Date(clientTs) },
      ]);

      const dto = {
        operations: [
          {
            id: 'op-exam-dup',
            assessmentId: 'exam-1',
            answers: [{ questionId: 'q-1', selectedAnswer: 'A' }],
            clientTimestamp: clientTs,
          },
        ],
      };

      const result = await service.syncAssessmentsBatch(studentId, dto);

      expect(result.duplicatesIgnored).toBe(1);
      expect(result.syncedCount).toBe(0);
      expect(mockPrismaService.assessmentSubmission.create).not.toHaveBeenCalled();
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
      expect(res.idMappings.students[clientTempStudent1Id].studentCode).toMatch(/^STU\d{4}/);
      expect(res.idMappings.students[clientTempStudent2Id]).toBeDefined();
      expect(res.idMappings.students[clientTempStudent2Id].studentCode).toMatch(/^STU\d{4}/);

      // Verify groups and students were created in transaction
      expect(mockPrismaService.academicGroup.create).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.studentProfile.create).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.groupEnrollment.create).toHaveBeenCalledTimes(2);
    });

    it('should atomically apply UPDATE_GROUP and UPDATE_STUDENT operations', async () => {
      const groupId = '018d39f4-6a8b-7000-8000-000000000010';
      const studentId = '018d39f4-6a8b-7000-8000-000000000011';
      mockPrismaService.teacherProfile.findFirst.mockResolvedValue({ id: 'teacher-profile-1' });
      mockPrismaService.academicGroup.findFirst.mockResolvedValue({
        id: groupId,
        academicYear: '2026-2027',
        academicTerm: 'FIRST_TERM',
        maxCapacity: 40,
        monthlyFee: 300,
      });
      mockPrismaService.studentProfile.findFirst.mockResolvedValue({
        id: studentId,
        studentCode: 'STU-2026-00001',
        qrCodeToken: 'qr-existing',
        gradeLevel: 'الصف الأول الثانوي',
        academicStage: 'ثانوي',
        emergencyPhone: '01000000000',
        user: {
          fullName: 'الاسم السابق',
          phone: '01000000000',
          email: 'old@example.com',
        },
      });

      const result = await service.syncUnifiedBatch(mockTeacherUser, {
        groups: [
          {
            type: 'UPDATE_GROUP',
            clientTempId: groupId,
            name: 'مجموعة الفيزياء المحدثة',
            gradeLevel: 'الصف الثاني الثانوي',
            monthlyFee: 450,
          },
        ],
        students: [
          {
            type: 'UPDATE_STUDENT',
            clientTempId: studentId,
            fullName: 'الاسم المحدث',
            phone: '01111111111',
            email: 'new@example.com',
            gradeLevel: 'الصف الثاني الثانوي',
            academicStage: 'ثانوي',
          },
        ],
      } as any);

      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.academicGroup.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: groupId },
          data: expect.objectContaining({
            name: 'مجموعة الفيزياء المحدثة',
            gradeLevel: 'الصف الثاني الثانوي',
            monthlyFee: 450,
          }),
        }),
      );
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: studentId },
        data: {
          fullName: 'الاسم المحدث',
          phone: '01111111111',
          email: 'new@example.com',
        },
      });
      expect(mockPrismaService.studentProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: studentId },
          data: expect.objectContaining({ gradeLevel: 'الصف الثاني الثانوي' }),
        }),
      );
      expect(result.idMappings.groups[groupId]).toBe(groupId);
      expect(result.idMappings.students[studentId]).toMatchObject({
        id: studentId,
        studentCode: 'STU-2026-00001',
      });
    });
  });

  describe('getSyncDiff', () => {
    it('should return delta counts and summary items for remote changes', async () => {
      mockPrismaService.academicGroup.findMany.mockResolvedValueOnce([
        {
          id: 'group-1',
          name: 'مجموعة النخبة',
          gradeLevel: 'الصف الأول الثانوي',
          monthlyFee: 300,
          academicYear: '2026-2027',
          academicTerm: 'FIRST_TERM',
          updatedAt: new Date(),
        },
      ]);

      mockPrismaService.studentProfile.findMany.mockResolvedValueOnce([
        {
          id: 'student-1',
          studentCode: 'STU-2026-00001',
          user: { id: 'u-1', fullName: 'علي مصطفى', phone: '01012345678' },
          groupEnrollments: [{ group: { id: 'group-1', name: 'مجموعة النخبة' } }],
          updatedAt: new Date(),
        },
      ]);

      mockPrismaService.attendanceRecord.findMany.mockResolvedValueOnce([
        {
          id: 'att-1',
          status: AttendanceStatus.PRESENT,
          sessionId: 'session-1',
          studentId: 'student-1',
          recordedAt: new Date(),
        },
      ]);

      mockPrismaService.studentPaymentRecord.findMany.mockResolvedValueOnce([
        {
          id: 'pay-1',
          amountPaid: 300,
          paymentMethod: 'CASH',
          paymentStatus: PaymentStatus.PAID,
          studentId: 'student-1',
          groupId: 'group-1',
          updatedAt: new Date(),
        },
      ]);

      const res = await service.getSyncDiff(mockTeacherUser, new Date(Date.now() - 3600000).toISOString());

      expect(res).toBeDefined();
      expect(res.groups.count).toBe(1);
      expect(res.groups.items[0].name).toBe('مجموعة النخبة');
      expect(res.students.count).toBe(1);
      expect(res.students.items[0].fullName).toBe('علي مصطفى');
      expect(res.attendance.count).toBe(1);
      expect(res.payments.count).toBe(1);
      expect(res.serverTime).toBeDefined();
    });
  });
});
