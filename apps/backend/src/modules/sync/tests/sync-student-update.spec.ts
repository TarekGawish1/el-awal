import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from '../services/sync.service';
import { CoursesService } from '../../courses/services/courses.service';
import { PrismaService } from '../../../core/database/prisma.service';

describe('SyncService - Offline Student Update (Last Write Wins Vulnerability)', () => {
  let syncService: SyncService;
  let prisma: PrismaService;
  
  const mockUpdateUser = jest.fn();
  const mockUpdateProfile = jest.fn();
  const mockFindFirst = jest.fn();
  const mockCreateGroupEnrollment = jest.fn();
  const mockFindGroup = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const prismaMock = {
      $transaction: jest.fn(async (callback) => {
        return callback({
          user: { update: mockUpdateUser, findUnique: jest.fn(), create: jest.fn() },
          studentProfile: { 
            findFirst: mockFindFirst,
            update: mockUpdateProfile,
          },
          academicGroup: {
            findFirst: mockFindGroup,
          },
          groupEnrollment: {
            create: mockCreateGroupEnrollment,
          }
        });
      }),
      teacherProfile: {
        findFirst: jest.fn().mockResolvedValue({ id: 'teacher-1' })
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CoursesService, useValue: { findByCode: jest.fn() } },
      ],
    }).compile();

    syncService = module.get<SyncService>(SyncService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  const user = { id: 'teacher-1', role: 'TEACHER' as any };

  it('1. Old offline mutation unconditionally overwrites newer server data (LWW Vulnerability)', async () => {
    // Existing student on server (updated recently online)
    mockFindFirst.mockResolvedValueOnce({ 
      id: 'student-1', 
      user: { fullName: 'Mohamed Ali', phone: '01000000000' },
      updatedAt: new Date('2026-09-02T10:00:00Z') // Newer timestamp
    });

    // Offline device sends a mutation created 3 days ago
    const oldOfflineMutation = {
      id: 'test-op-1',
      clientTempId: 'student-1',
      type: 'UPDATE_STUDENT',
      fullName: 'Ahmed Ali', // Stale name
      phone: '01000000000',
      clientTimestamp: new Date('2026-08-30T10:00:00Z').toISOString() // Older timestamp
    };

    try {
      await syncService.syncUnifiedBatch(user, { students: [oldOfflineMutation] } as any);
      fail('Expected syncUnifiedBatch to throw a ConflictException');
    } catch (err: any) {
      expect(err.message).toContain('was modified online since your last sync');
    }
    
    // The vulnerability is fixed: The server rejects the update
    expect(mockUpdateUser).toHaveBeenCalledTimes(0);
  });
});
