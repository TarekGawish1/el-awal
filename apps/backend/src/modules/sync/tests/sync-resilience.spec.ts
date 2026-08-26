import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from '../services/sync.service';
import { CoursesService } from '../../courses/services/courses.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { UserRole, GroupEnrollmentStatus, AttendanceStatus, PaymentStatus } from '@prisma/client';

describe('SyncService - Resilience & Error Fallback Engine', () => {
  let service: SyncService;

  const mockCoursesService = {
    applyMonotonicProgressBatch: jest.fn(),
  };

  const mockPrismaService: any = {
    teacherProfile: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    academicGroup: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    groupEnrollment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    lessonSchedule: {
      findMany: jest.fn(),
    },
    lessonSession: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    studentPaymentRecord: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    assessment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    course: {
      findMany: jest.fn(),
    },
    attendanceRecord: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    studentProfile: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    parentProfile: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(async (cb) => cb(mockPrismaService)),
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
    jest.clearAllMocks();
  });

  describe('Zero-Cold-Start Bootstrap 500 Prevention', () => {
    const emptyTeacherUser: any = {
      id: 'fresh-teacher-id-001',
      role: UserRole.TEACHER,
    };

    it('guarantees 200 OK structured response when teacher has 0 groups, 0 students, and unassigned academic period', async () => {
      // Teacher profile not found in DB
      mockPrismaService.teacherProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.teacherProfile.findFirst.mockResolvedValue(null);

      // Groups query returns empty
      mockPrismaService.academicGroup.findMany.mockResolvedValue([]);
      mockPrismaService.assessment.findMany.mockResolvedValue([]);
      mockPrismaService.course.findMany.mockResolvedValue([]);

      const result = await service.getBootstrapSnapshot(emptyTeacherUser);

      expect(result).toBeDefined();
      expect(result.role).toBe(UserRole.TEACHER);
      expect(result.isDelta).toBe(false);
      expect(result.data).toBeDefined();

      // Academic period must fall back gracefully to default
      expect(result.data.academicPeriod).toEqual({
        academicYear: '2026-2027',
        academicTerm: 'FIRST_TERM',
        activeAcademicYear: '2026-2027',
        activeAcademicTerm: 'FIRST_TERM',
      });

      // All collections must be valid empty arrays, never null/undefined
      expect(result.data.groups).toEqual([]);
      expect(result.data.students).toEqual([]);
      expect(result.data.sessions).toEqual([]);
      expect(result.data.schedules).toEqual([]);
      expect(result.data.payments).toEqual([]);
      expect(result.data.assessments).toEqual([]);
      expect(result.data.courses).toEqual([]);

      // Prisma payments query must not have been called with empty OR: []
      expect(mockPrismaService.studentPaymentRecord.findMany).not.toHaveBeenCalled();
    });

    it('recovers gracefully from database connection/query errors in sub-queries without throwing 500', async () => {
      mockPrismaService.teacherProfile.findUnique.mockRejectedValue(new Error('DB Timeout'));
      mockPrismaService.teacherProfile.findFirst.mockRejectedValue(new Error('DB Timeout'));
      mockPrismaService.academicGroup.findMany.mockRejectedValue(new Error('Prisma engine crash'));
      mockPrismaService.assessment.findMany.mockRejectedValue(new Error('Query timeout'));
      mockPrismaService.course.findMany.mockRejectedValue(new Error('Table lock'));

      const result = await service.getBootstrapSnapshot(emptyTeacherUser);

      expect(result).toBeDefined();
      expect(result.data.groups).toEqual([]);
      expect(result.data.students).toEqual([]);
      expect(result.data.payments).toEqual([]);
      expect(result.data.assessments).toEqual([]);
      expect(result.data.courses).toEqual([]);
      expect(result.data.academicPeriod.academicYear).toBe('2026-2027');
    });
  });

  describe('Outbox Batch Ingestion & Idempotency', () => {
    const teacherUser: any = {
      id: 'teacher-auth-id',
      role: UserRole.TEACHER,
    };

    it('handles duplicate attendance operations idempotently without throwing', async () => {
      mockPrismaService.lessonSession.findUnique.mockResolvedValue({
        id: 'session-1',
        groupId: 'group-1',
      });

      mockPrismaService.groupEnrollment.findUnique.mockResolvedValue({
        status: GroupEnrollmentStatus.ACTIVE,
      });

      // Existing attendance record in DB (duplicate retry)
      mockPrismaService.attendanceRecord.findUnique.mockResolvedValue({
        id: 'existing-att-1',
        sessionId: 'session-1',
        studentId: 'student-1',
      });

      const batchDto = {
        operations: [
          {
            id: 'op-att-1',
            sessionId: 'session-1',
            studentId: 'student-1',
            status: AttendanceStatus.PRESENT,
          },
        ],
      };

      const result = await service.syncAttendanceBatch(teacherUser, batchDto as any);

      expect(result.syncedCount).toBe(0);
      expect(result.duplicatesIgnored).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(result.processedOperationIds).toContain('op-att-1');
      expect(mockPrismaService.attendanceRecord.create).not.toHaveBeenCalled();
    });

    it('handles duplicate payment sync operations idempotently without double-charging', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({ id: 'student-1' });

      // Existing paid record
      mockPrismaService.studentPaymentRecord.findFirst.mockResolvedValue({
        id: 'existing-pay-1',
        studentId: 'student-1',
        groupId: 'group-1',
        periodYear: 2026,
        periodMonth: 9,
        paymentStatus: PaymentStatus.PAID,
      });

      const batchDto = {
        operations: [
          {
            id: 'op-pay-1',
            studentId: 'student-1',
            groupId: 'group-1',
            periodYear: 2026,
            periodMonth: 9,
            amountPaid: 350,
          },
        ],
      };

      const result = await service.syncPaymentsBatch(teacherUser, batchDto as any);

      expect(result.duplicatesIgnored).toBe(1);
      expect(result.syncedCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.processedOperationIds).toContain('op-pay-1');
    });
  });
});
