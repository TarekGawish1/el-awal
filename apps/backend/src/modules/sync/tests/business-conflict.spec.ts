import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from '../services/sync.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { CoursesService } from '../../courses/services/courses.service';

describe('SyncService - Business Conflicts (Attendance/Homework)', () => {
  let syncService: SyncService;
  let prisma: PrismaService;

  // Mocks
  const mockUpsertAttendance = jest.fn();
  const mockFindUniqueSession = jest.fn();
  const mockFindUniqueEnrollment = jest.fn();
  const mockFindUniqueStudent = jest.fn();
  const mockFindFirstStudent = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(async (cb) => cb(prisma)),
            attendanceRecord: { upsert: mockUpsertAttendance },
            lessonSession: { findUnique: mockFindUniqueSession },
            groupEnrollment: { findUnique: mockFindUniqueEnrollment },
            studentProfile: {
              findUnique: mockFindUniqueStudent,
              findFirst: mockFindFirstStudent,
            },
          },
        },
        {
          provide: CoursesService,
          useValue: {}, // Mock CoursesService
        }
      ],
    }).compile();

    syncService = module.get<SyncService>(SyncService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('1. Offline attendance for a student removed from the group unconditionally succeeds (Business Vulnerability)', async () => {
    const user = { id: 'teacher-1', role: 'TEACHER' } as any;

    const offlineAttendanceOp = {
      id: 'offline-mut-1',
      type: 'RECORD_ATTENDANCE',
      payload: {
        sessionId: 'session-1',
        studentId: 'student-1',
        status: 'PRESENT',
      },
    };

    // Setup mocks to simulate the student NOT being enrolled (no active enrollments)
    mockFindUniqueSession.mockResolvedValue({ id: 'session-1', groupId: 'group-1' });
    mockFindFirstStudent.mockResolvedValue({
      id: 'student-1',
      user: { isActive: true },
      groupEnrollments: [], // No active enrollments
    });

    const results = await syncService.processMutationBatch(user, [offlineAttendanceOp]);

    // The vulnerability is fixed: The attendance record is NOT upserted
    expect(mockUpsertAttendance).toHaveBeenCalledTimes(0);
    expect(results[0].status).toBe('FAILED');
    expect(results[0].error).toBe('STUDENT_NOT_ENROLLED');
  });

  it('2. Offline homework for a student removed from the group unconditionally succeeds (Business Vulnerability)', async () => {
    const user = { id: 'teacher-1', role: 'TEACHER' } as any;

    const offlineHomeworkOp = {
      id: 'offline-mut-2',
      type: 'RECORD_HOMEWORK_ONSITE',
      payload: {
        sessionId: 'session-1',
        studentId: 'student-1',
        status: 'CHECKED_ONSITE',
        score: 8,
      },
    };

    const mockUpsertHomework = jest.fn();
    (prisma as any).homeworkRecord = { upsert: mockUpsertHomework };

    mockFindUniqueSession.mockResolvedValue({ id: 'session-1', groupId: 'group-1' });
    mockFindFirstStudent.mockResolvedValue({
      id: 'student-1',
      user: { isActive: true },
      groupEnrollments: [], // No active enrollments
    });

    const results = await syncService.processMutationBatch(user, [offlineHomeworkOp]);

    expect(mockUpsertHomework).toHaveBeenCalledTimes(0);
    expect(results[0].status).toBe('FAILED');
    expect(results[0].error).toBe('STUDENT_NOT_ENROLLED');
  });
});
