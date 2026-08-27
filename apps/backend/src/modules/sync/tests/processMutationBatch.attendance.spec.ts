import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from '../services/sync.service';
import { PrismaService } from '../../../../src/core/database/prisma.service';
import { CoursesService } from '../../courses/services/courses.service';
import { GroupEnrollmentStatus, UserRole, AttendanceStatus, RecordingMethod } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('SyncService - processMutationBatch (RECORD_ATTENDANCE)', () => {
  let service: SyncService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      studentProfile: { findFirst: jest.fn() },
      lessonSession: { findUnique: jest.fn() },
      attendanceRecord: { upsert: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: PrismaService, useValue: prisma },
        { provide: CoursesService, useValue: {} },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
  });

  const mockUser: any = { id: 'teacher-1', role: UserRole.TEACHER };

  it('1. Existing studentId flow (legacy/cached)', async () => {
    const mutations = [{
      id: 'mut-1',
      type: 'RECORD_ATTENDANCE',
      payload: { sessionId: 'session-1', studentId: 'student-1', clientTimestamp: 1000 }
    }];

    const results = await service.processMutationBatch(mockUser, mutations);
    
    expect(results[0]).toEqual({ mutationId: 'mut-1', status: 'SUCCESS' });
    expect(prisma.attendanceRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId_studentId: { sessionId: 'session-1', studentId: 'student-1' } },
        create: expect.objectContaining({ studentId: 'student-1' })
      })
    );
  });

  it('2. Offline qrCodeToken-only flow', async () => {
    prisma.studentProfile.findFirst.mockResolvedValue({
      id: 'student-resolved',
      user: { isActive: true },
      groupEnrollments: [{ groupId: 'group-1' }]
    });
    prisma.lessonSession.findUnique.mockResolvedValue({ groupId: 'group-1' });

    const mutations = [{
      id: 'mut-2',
      type: 'RECORD_ATTENDANCE',
      payload: { sessionId: 'session-1', qrCodeToken: 'qr_valid' }
    }];

    const results = await service.processMutationBatch(mockUser, mutations);
    
    expect(results[0]).toEqual({ mutationId: 'mut-2', status: 'SUCCESS' });
    expect(prisma.studentProfile.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: expect.arrayContaining([{ qrCodeToken: 'qr_valid' }])
      })
    }));
    expect(prisma.attendanceRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId_studentId: { sessionId: 'session-1', studentId: 'student-resolved' } }
      })
    );
  });

  it('3. Unknown QR', async () => {
    prisma.studentProfile.findFirst.mockResolvedValue(null);

    const mutations = [{
      id: 'mut-3',
      type: 'RECORD_ATTENDANCE',
      payload: { sessionId: 'session-1', qrCodeToken: 'qr_invalid' }
    }];

    const results = await service.processMutationBatch(mockUser, mutations);
    
    expect(results[0]).toEqual({ mutationId: 'mut-3', status: 'FAILED', error: 'INVALID_QR_CODE' });
    expect(prisma.attendanceRecord.upsert).not.toHaveBeenCalled();
  });

  it('4. Invalid group/session (cross-group without permission)', async () => {
    prisma.studentProfile.findFirst.mockResolvedValue({
      id: 'student-2',
      user: { isActive: true },
      groupEnrollments: [{ groupId: 'group-wrong' }]
    });
    prisma.lessonSession.findUnique.mockResolvedValue({ groupId: 'group-correct' });

    const mutations = [{
      id: 'mut-4',
      type: 'RECORD_ATTENDANCE',
      payload: { sessionId: 'session-1', qrCodeToken: 'qr_valid', allowCrossGroup: false }
    }];

    const results = await service.processMutationBatch(mockUser, mutations);
    
    expect(results[0]).toEqual({ mutationId: 'mut-4', status: 'FAILED', error: 'STUDENT_NOT_ENROLLED' });
    expect(prisma.attendanceRecord.upsert).not.toHaveBeenCalled();
  });

  it('5. Duplicate/retry idempotency (upsert behaves cleanly)', async () => {
    const mutations = [{
      id: 'mut-5',
      type: 'RECORD_ATTENDANCE',
      payload: { sessionId: 'session-1', studentId: 'student-1' }
    }];

    await service.processMutationBatch(mockUser, mutations);
    await service.processMutationBatch(mockUser, mutations); // Retry
    
    expect(prisma.attendanceRecord.upsert).toHaveBeenCalledTimes(2);
  });

  it('6. Missing studentId and qrCodeToken', async () => {
    const mutations = [{
      id: 'mut-6',
      type: 'RECORD_ATTENDANCE',
      payload: { sessionId: 'session-1' }
    }];

    const results = await service.processMutationBatch(mockUser, mutations);
    expect(results[0]).toEqual({
      mutationId: 'mut-6',
      status: 'FAILED',
      error: expect.stringContaining('Missing required parameters for RECORD_ATTENDANCE')
    });
  });
});
