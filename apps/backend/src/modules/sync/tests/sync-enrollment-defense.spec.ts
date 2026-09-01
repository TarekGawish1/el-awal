import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from '../services/sync.service';
import { CoursesService } from '../../courses/services/courses.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { GroupEnrollmentStatus } from '@prisma/client';

describe('SyncService - Offline Enrollment Defense in Depth', () => {
  let syncService: SyncService;
  
  const mockFindUniqueSession = jest.fn();
  const mockFindUniqueEnrollment = jest.fn();
  const mockFindFirstEnrollment = jest.fn();
  const mockCreateAttendance = jest.fn();
  const mockFindUniqueAttendance = jest.fn();
  
  beforeEach(async () => {
    jest.clearAllMocks();
    
    const prismaMock = {
      $transaction: jest.fn(async (callback) => {
        return callback({
          lessonSession: { findUnique: mockFindUniqueSession },
          groupEnrollment: { 
            findUnique: mockFindUniqueEnrollment,
            findFirst: mockFindFirstEnrollment
          },
          attendanceRecord: { 
            create: mockCreateAttendance,
            findUnique: mockFindUniqueAttendance
          },
        });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CoursesService, useValue: {} },
        { provide: 'CACHE_MANAGER', useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() } },
        { provide: 'SYNC_CACHE_SERVICE', useValue: {} },
      ],
    }).compile();

    syncService = module.get<SyncService>(SyncService);
  });

  const user = { id: 'user-1' } as any;

  it('Test G - Valid enrollment -> attendance accepted', async () => {
    mockFindUniqueSession.mockResolvedValue({ id: 'session-1', groupId: 'group-a' });
    mockFindUniqueEnrollment.mockResolvedValue({ status: GroupEnrollmentStatus.ACTIVE });

    const op = { id: 'op-1', sessionId: 'session-1', studentId: 'student-1', allowCrossGroup: false };
    
    const result = await syncService.syncAttendanceBatch(user, { operations: [op] } as any);
    
    expect(mockCreateAttendance).toHaveBeenCalledTimes(1);
    expect(result.syncedCount).toBe(1);
  });

  it('Test H - Invalid enrollment -> mutation rejected', async () => {
    mockFindUniqueSession.mockResolvedValue({ id: 'session-1', groupId: 'group-a' });
    mockFindUniqueEnrollment.mockResolvedValue(null); // Not enrolled

    const op = { id: 'op-2', sessionId: 'session-1', studentId: 'student-1', allowCrossGroup: false };
    
    const result = await syncService.syncAttendanceBatch(user, { operations: [op] } as any);
    
    expect(mockCreateAttendance).not.toHaveBeenCalled();
    expect(result.failedCount).toBe(1);
    expect(result.conflicts[0].reason).toContain('not actively enrolled in group');
  });

  it('Test I - Legitimate cross-group attendance (guest)', async () => {
    mockFindUniqueSession.mockResolvedValue({ id: 'session-1', groupId: 'group-a' });
    // allowCrossGroup is true, so it searches for ANY active enrollment
    mockFindFirstEnrollment.mockResolvedValue({ status: GroupEnrollmentStatus.ACTIVE });

    const op = { id: 'op-3', sessionId: 'session-1', studentId: 'student-1', allowCrossGroup: true };
    
    const result = await syncService.syncAttendanceBatch(user, { operations: [op] } as any);
    
    expect(mockCreateAttendance).toHaveBeenCalledTimes(1);
    expect(result.syncedCount).toBe(1);
  });

  it('Test J - Invalid cross-group attendance (student not enrolled anywhere)', async () => {
    mockFindUniqueSession.mockResolvedValue({ id: 'session-1', groupId: 'group-a' });
    mockFindFirstEnrollment.mockResolvedValue(null);

    const op = { id: 'op-4', sessionId: 'session-1', studentId: 'student-1', allowCrossGroup: true };
    
    const result = await syncService.syncAttendanceBatch(user, { operations: [op] } as any);
    
    expect(mockCreateAttendance).not.toHaveBeenCalled();
    expect(result.failedCount).toBe(1);
    expect(result.conflicts[0].reason).toContain('no active group enrollments to qualify for cross-group attendance');
  });
});
