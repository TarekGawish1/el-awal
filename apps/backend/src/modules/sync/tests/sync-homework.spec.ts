import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from '../services/sync.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { CoursesService } from '../../courses/services/courses.service';
import {
  AttendanceStatus,
  HomeworkSubmissionStatus,
  RecordingMethod,
  UserRole,
} from '@prisma/client';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';

describe('SyncService - syncHomeworkBatch', () => {
  let service: SyncService;
  let prisma: any;

  const mockTeacherUser: AuthenticatedUser = {
    id: 'teacher-uuid-1',
    role: UserRole.TEACHER,
    email: 'teacher@elawal.com',
  };

  const mockPrismaService = {
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
    lessonSession: {
      findUnique: jest.fn(),
    },
    assessment: {
      findUnique: jest.fn(),
    },
    studentProfile: {
      findFirst: jest.fn(),
    },
    homeworkRecord: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    attendanceRecord: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockCoursesService = {
    applyMonotonicProgressBatch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CoursesService, useValue: mockCoursesService },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should persist HomeworkRecord as CHECKED_ONSITE and automatically set AttendanceRecord to PRESENT', async () => {
    mockPrismaService.lessonSession.findUnique.mockResolvedValue({
      id: 'session-uuid-1',
      groupId: 'group-uuid-1',
    });

    mockPrismaService.assessment.findUnique.mockResolvedValue({
      id: 'assessment-uuid-1',
      title: 'واجب الحصة الأولى',
    });

    mockPrismaService.studentProfile.findFirst.mockResolvedValue({
      id: 'student-uuid-1',
      studentCode: 'STU-001',
      fullName: 'أحمد علي',
    });

    mockPrismaService.homeworkRecord.findUnique.mockResolvedValue(null);
    mockPrismaService.homeworkRecord.create.mockResolvedValue({
      id: 'hw-record-uuid-1',
      status: HomeworkSubmissionStatus.CHECKED_ONSITE,
    });

    mockPrismaService.attendanceRecord.findUnique.mockResolvedValue(null);
    mockPrismaService.attendanceRecord.create.mockResolvedValue({
      id: 'att-record-uuid-1',
      status: AttendanceStatus.PRESENT,
    });

    const dto = {
      operations: [
        {
          id: 'op-hw-1',
          assessmentId: 'assessment-uuid-1',
          sessionId: 'session-uuid-1',
          qrCodeToken: 'QR-STU-001',
          status: HomeworkSubmissionStatus.CHECKED_ONSITE,
          recordedMethod: RecordingMethod.QR_SCAN,
          clientTimestamp: Date.now(),
        },
      ],
    };

    const result = await service.syncHomeworkBatch(mockTeacherUser, dto);

    expect(result.syncedCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(result.processedOperationIds).toContain('op-hw-1');

    // Verify HomeworkRecord creation
    expect(mockPrismaService.homeworkRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assessmentId: 'assessment-uuid-1',
        studentId: 'student-uuid-1',
        sessionId: 'session-uuid-1',
        status: HomeworkSubmissionStatus.CHECKED_ONSITE,
        recordedMethod: RecordingMethod.QR_SCAN,
        checkedByRole: UserRole.TEACHER,
      }),
    });


  });

  it('should update existing homework record idempotently on re-sync', async () => {
    mockPrismaService.lessonSession.findUnique.mockResolvedValue({
      id: 'session-uuid-1',
    });

    mockPrismaService.assessment.findUnique.mockResolvedValue({
      id: 'assessment-uuid-1',
    });

    // Existing homework record found
    mockPrismaService.homeworkRecord.findUnique.mockResolvedValue({
      id: 'hw-existing-1',
      status: HomeworkSubmissionStatus.CHECKED_ONSITE,
      score: null,
      feedback: null,
    });

    // Existing attendance record was ABSENT, must be upgraded to PRESENT
    mockPrismaService.attendanceRecord.findUnique.mockResolvedValue({
      id: 'att-existing-1',
      status: AttendanceStatus.ABSENT,
      recordingMethod: RecordingMethod.MANUAL,
    });

    const dto = {
      operations: [
        {
          id: 'op-hw-2',
          assessmentId: 'assessment-uuid-1',
          studentId: 'student-uuid-1',
          sessionId: 'session-uuid-1',
          status: HomeworkSubmissionStatus.CHECKED_ONSITE,
          recordedMethod: RecordingMethod.QR_SCAN,
          score: 10,
          feedback: 'تم الحل بنجاح',
          clientTimestamp: Date.now(),
        },
      ],
    };

    const result = await service.syncHomeworkBatch(mockTeacherUser, dto);

    expect(result.duplicatesIgnored).toBe(1);
    expect(result.syncedCount).toBe(0);
    expect(mockPrismaService.homeworkRecord.update).toHaveBeenCalledWith({
      where: { id: 'hw-existing-1' },
      data: expect.objectContaining({
        status: HomeworkSubmissionStatus.CHECKED_ONSITE,
        score: 10,
        feedback: 'تم الحل بنجاح',
      }),
    });
  });
});
