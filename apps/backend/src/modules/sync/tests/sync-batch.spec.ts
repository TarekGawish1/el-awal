import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from '../services/sync.service';
import { SyncController } from '../controllers/sync.controller';
import { PrismaService } from '../../../core/database/prisma.service';
import { CoursesService } from '../../courses/services/courses.service';
import { AttendanceService } from '../../attendance/services/attendance.service';
import {
  AttendanceStatus,
  HomeworkSubmissionStatus,
  RecordingMethod,
  UserRole,
} from '@prisma/client';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';

import { AttendanceRepository } from '../../attendance/repositories/attendance.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('SyncService & SyncController - Batch Mutation Processing (RECORD_HOMEWORK_ONSITE)', () => {
  let syncService: SyncService;
  let syncController: SyncController;
  let attendanceService: AttendanceService;

  const mockTeacherUser: AuthenticatedUser = {
    id: 'teacher-uuid-1',
    role: UserRole.TEACHER,
    email: 'teacher@elawal.com',
    teacherProfileId: 'teacher-prof-1',
  };

  const mockPrismaService = {
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
    lessonSession: {
      findUnique: jest.fn(),
    },
    academicGroup: {
      findUnique: jest.fn(),
    },
    assessment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    studentProfile: {
      findFirst: jest.fn(),
    },
    homeworkRecord: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    attendanceRecord: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
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
      controllers: [SyncController],
      providers: [
        SyncService,
        AttendanceService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CoursesService, useValue: mockCoursesService },
        { provide: AttendanceRepository, useValue: {} },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    syncService = module.get<SyncService>(SyncService);
    syncController = module.get<SyncController>(SyncController);
    attendanceService = module.get<AttendanceService>(AttendanceService);
  });

  it('POST /api/v1/sync/batch with RECORD_HOMEWORK_ONSITE mutation creates HomeworkRecord as CHECKED_ONSITE and AttendanceRecord as PRESENT', async () => {
    mockPrismaService.lessonSession.findUnique.mockResolvedValue({
      id: 'session-uuid-1',
      groupId: 'group-uuid-1',
      sessionDate: new Date('2026-08-26'),
      group: {
        id: 'group-uuid-1',
        teacherId: 'teacher-prof-1',
        assessments: [{ id: 'assessment-uuid-1' }],
      },
    });

    mockPrismaService.homeworkRecord.upsert.mockResolvedValue({
      id: 'hw-record-1',
      assessmentId: 'assessment-uuid-1',
      studentId: 'student-uuid-1',
      sessionId: 'session-uuid-1',
      status: HomeworkSubmissionStatus.CHECKED_ONSITE,
      recordedMethod: RecordingMethod.QR_SCAN,
      score: 10,
    });

    mockPrismaService.attendanceRecord.upsert.mockResolvedValue({
      id: 'att-record-1',
      sessionId: 'session-uuid-1',
      studentId: 'student-uuid-1',
      status: AttendanceStatus.PRESENT,
    });

    const batchPayload = [
      {
        id: 'mut-hw-1',
        type: 'RECORD_HOMEWORK_ONSITE',
        payload: {
          assessmentId: 'assessment-uuid-1',
          studentId: 'student-uuid-1',
          sessionId: 'session-uuid-1',
          status: 'CHECKED_ONSITE',
          recordedMethod: 'QR_SCAN',
          score: 10,
          clientTimestamp: Date.now(),
        },
        clientTimestamp: Date.now(),
      },
    ];

    const response = await syncController.syncBatch(batchPayload, mockTeacherUser);

    expect(response).toBeDefined();
    expect(response.success).toBe(true);
    expect(response.results).toHaveLength(1);
    expect(response.results[0]).toEqual({
      mutationId: 'mut-hw-1',
      status: 'SUCCESS',
    });

    // 1. Verify HomeworkRecord is upserted with CHECKED_ONSITE
    expect(mockPrismaService.homeworkRecord.upsert).toHaveBeenCalledWith({
      where: {
        assessmentId_studentId_sessionId: {
          assessmentId: 'assessment-uuid-1',
          studentId: 'student-uuid-1',
          sessionId: 'session-uuid-1',
        },
      },
      update: expect.objectContaining({
        status: HomeworkSubmissionStatus.CHECKED_ONSITE,
        recordedMethod: RecordingMethod.QR_SCAN,
        score: 10,
      }),
      create: expect.objectContaining({
        assessmentId: 'assessment-uuid-1',
        studentId: 'student-uuid-1',
        sessionId: 'session-uuid-1',
        status: HomeworkSubmissionStatus.CHECKED_ONSITE,
        recordedMethod: RecordingMethod.QR_SCAN,
        score: 10,
      }),
    });

    // 2. Verify AttendanceRecord is guaranteed PRESENT
    expect(mockPrismaService.attendanceRecord.upsert).toHaveBeenCalledWith({
      where: {
        sessionId_studentId: {
          sessionId: 'session-uuid-1',
          studentId: 'student-uuid-1',
        },
      },
      update: expect.objectContaining({
        status: AttendanceStatus.PRESENT,
      }),
      create: expect.objectContaining({
        sessionId: 'session-uuid-1',
        studentId: 'student-uuid-1',
        status: AttendanceStatus.PRESENT,
        recordingMethod: RecordingMethod.QR_SCAN,
      }),
    });
  });

  it('verifies querying the session from another client returns isHomeworkSubmitted: true', async () => {
    mockPrismaService.lessonSession.findUnique.mockResolvedValue({
      id: 'session-uuid-1',
      groupId: 'group-uuid-1',
      sessionDate: new Date('2026-08-26'),
      topic: 'الفيزياء الحديثة',
      group: {
        id: 'group-uuid-1',
        teacherId: 'teacher-prof-1',
        enrollments: [
          {
            studentId: 'student-uuid-1',
            student: {
              studentCode: 'STU-001',
              user: { id: 'u-1', fullName: 'زياد طارق', phone: '+201012345678' },
            },
          },
        ],
      },
      attendanceRecords: [
        {
          id: 'att-1',
          studentId: 'student-uuid-1',
          status: AttendanceStatus.PRESENT,
          recordingMethod: RecordingMethod.QR_SCAN,
          recordedAt: new Date(),
          recordedBy: { id: 'teacher-uuid-1', fullName: 'أستاذ المادة' },
          notes: null,
        },
      ],
      homeworkRecords: [
        {
          id: 'hw-1',
          assessmentId: 'assessment-uuid-1',
          studentId: 'student-uuid-1',
          sessionId: 'session-uuid-1',
          status: HomeworkSubmissionStatus.CHECKED_ONSITE,
          checkedByRole: UserRole.TEACHER,
          recordedMethod: RecordingMethod.QR_SCAN,
          score: 10,
          feedback: 'مكتمل وممتاز',
          clientTimestamp: new Date(),
        },
      ],
    });

    const report = await attendanceService.getSessionReport('session-uuid-1', mockTeacherUser);

    expect(report).toBeDefined();
    expect(report.records).toHaveLength(1);
    expect(report.records[0].studentId).toBe('student-uuid-1');
    expect(report.records[0].status).toBe(AttendanceStatus.PRESENT);
    expect(report.records[0].homeworkStatus).toBe('CHECKED_ONSITE');
    expect(report.records[0].isHomeworkSubmitted).toBe(true);
  });
});
