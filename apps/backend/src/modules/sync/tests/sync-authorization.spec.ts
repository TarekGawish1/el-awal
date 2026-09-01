import { Test, TestingModule } from '@nestjs/testing';
import { SyncController } from '../controllers/sync.controller';
import { SyncService } from '../services/sync.service';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { ForbiddenException } from '@nestjs/common';

describe('SyncController - Student Authorization', () => {
  let syncController: SyncController;

  const mockStudentUser: AuthenticatedUser = {
    id: 'student-uuid-1',
    role: UserRole.STUDENT,
    email: 'student@elawal.com',
    studentProfileId: 'student-prof-1',
  };

  const mockTeacherUser: AuthenticatedUser = {
    id: 'teacher-uuid-1',
    role: UserRole.TEACHER,
    email: 'teacher@elawal.com',
    teacherProfileId: 'teacher-prof-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [
        {
          provide: SyncService,
          useValue: {
            processMutationBatch: jest.fn().mockResolvedValue([]),
            syncUnifiedBatch: jest.fn().mockResolvedValue({ success: true }),
          },
        },
      ],
    }).compile();

    syncController = module.get<SyncController>(SyncController);
  });

  it('should reject teacher-level domains if user is a student', async () => {
    const payload = {
      groups: [{ clientTempId: 'temp-group-1', name: 'Fake Group' }],
    };

    await expect(syncController.syncBatch(payload, mockStudentUser)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should reject teacher-level domains (students creation) if user is a student', async () => {
    const payload = {
      students: [{ clientTempId: 'temp-student-1', fullName: 'Fake Student' }],
    };

    await expect(syncController.syncBatch(payload, mockStudentUser)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should reject RECORD_ATTENDANCE mutation if user is a student', async () => {
    const payload = [
      {
        id: 'mut-1',
        type: 'RECORD_ATTENDANCE',
        payload: {},
      },
    ];

    await expect(syncController.syncBatch(payload, mockStudentUser)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should reject RECORD_HOMEWORK_ONSITE mutation in nested array if user is a student', async () => {
    const payload = {
      mutations: [
        {
          id: 'mut-2',
          type: 'RECORD_HOMEWORK_ONSITE',
          payload: {},
        },
      ],
    };

    await expect(syncController.syncBatch(payload, mockStudentUser)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should allow legitimate student progress sync', async () => {
    const payload = {
      progress: [{ id: 'prog-1' }],
    };

    const response = await syncController.syncBatch(payload, mockStudentUser);
    expect(response).toBeDefined();
    expect(response.success).toBe(true);
  });

  it('should allow teacher to sync teacher-level domains', async () => {
    const payload = {
      groups: [{ clientTempId: 'temp-group-1', name: 'Real Group' }],
    };

    const response = await syncController.syncBatch(payload, mockTeacherUser);
    expect(response).toBeDefined();
    expect(response.success).toBe(true);
  });
});
