import { Test, TestingModule } from '@nestjs/testing';
import { SchedulesService } from '../services/schedules.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';

describe('SchedulesService', () => {
  let service: SchedulesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    academicGroup: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    lessonSchedule: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
    lessonSession: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    teacherProfile: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    educationalContent: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
  };

  const mockTeacherUser: AuthenticatedUser = {
    id: 'user-1',
    role: UserRole.TEACHER,
    teacherProfileId: 'teacher-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SchedulesService>(SchedulesService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('getSemesterDateWindow', () => {
    it('calculates correct FIRST_TERM date range for 2026-2027', () => {
      const window = service.getSemesterDateWindow('2026-2027', 'FIRST_TERM');
      expect(window.startDate.getUTCFullYear()).toBe(2026);
      expect(window.startDate.getUTCMonth()).toBe(7); // August
      expect(window.startDate.getUTCDate()).toBe(1);

      expect(window.endDate.getUTCFullYear()).toBe(2027);
      expect(window.endDate.getUTCMonth()).toBe(0); // January
      expect(window.endDate.getUTCDate()).toBe(31);
    });

    it('calculates correct SECOND_TERM date range for 2026-2027', () => {
      const window = service.getSemesterDateWindow('2026-2027', 'SECOND_TERM');
      expect(window.startDate.getUTCFullYear()).toBe(2027);
      expect(window.startDate.getUTCMonth()).toBe(1); // February
      expect(window.startDate.getUTCDate()).toBe(1);

      expect(window.endDate.getUTCFullYear()).toBe(2027);
      expect(window.endDate.getUTCMonth()).toBe(6); // July
      expect(window.endDate.getUTCDate()).toBe(31);
    });
  });

  describe('autoEnsureSemesterSessionsForGroups', () => {
    it('generates missing semester sessions in bulk', async () => {
      mockPrismaService.lessonSession.findMany.mockResolvedValue([]);
      mockPrismaService.lessonSession.createMany.mockResolvedValue({ count: 26 });

      const mockGroups = [
        {
          id: 'group-1',
          name: 'الصف الثالث الثانوي',
          academicYear: '2026-2027',
          academicTerm: 'FIRST_TERM',
          schedules: [
            { id: 'sched-1', dayOfWeek: 0, startTime: '16:00', endTime: '18:00' }, // Sunday
          ],
        },
      ];

      await service.autoEnsureSemesterSessionsForGroups(mockGroups, '2026-2027', 'FIRST_TERM');

      expect(mockPrismaService.lessonSession.createMany).toHaveBeenCalledTimes(1);
      const callData = mockPrismaService.lessonSession.createMany.mock.calls[0][0];
      expect(callData.data.length).toBeGreaterThan(20);
      expect(callData.data[0].groupId).toBe('group-1');
      expect(callData.data[0].startTime).toBe('16:00');
    });
  });

  describe('createSingleSession (same-day group uniqueness)', () => {
    it('rejects adding a second session for the same group on the same day', async () => {
      mockPrismaService.academicGroup.findUnique.mockResolvedValue({
        id: 'group-1',
        teacherId: 'teacher-1',
      });
      mockPrismaService.lessonSession.findFirst
        .mockResolvedValueOnce(null) // no exact same-date+startTime session
        .mockResolvedValueOnce({
          id: 'other-session',
          topic: 'حصة الجبر',
          startTime: '18:00',
        }); // same group already has a session that day

      await expect(
        service.createSingleSession(
          {
            groupId: 'group-1',
            sessionDate: '2026-08-20',
            startTime: '16:00',
            endTime: '18:00',
            topic: 'حصة الفيزياء',
          },
          mockTeacherUser,
        ),
      ).rejects.toThrow('لا يمكن إضافة أكثر من حصة لنفس المجموعة في نفس اليوم');
    });

    it('allows creating a session when the group has no session that day', async () => {
      mockPrismaService.academicGroup.findUnique.mockResolvedValue({
        id: 'group-1',
        teacherId: 'teacher-1',
      });
      mockPrismaService.lessonSession.findFirst.mockResolvedValue(null);
      mockPrismaService.lessonSession.findMany.mockResolvedValue([]);
      mockPrismaService.lessonSession.create.mockResolvedValue({
        id: 'new-session',
        groupId: 'group-1',
        sessionDate: new Date('2026-08-20T00:00:00.000Z'),
        startTime: '16:00',
        topic: 'حصة الفيزياء',
      });

      const created = await service.createSingleSession(
        {
          groupId: 'group-1',
          sessionDate: '2026-08-20',
          startTime: '16:00',
          endTime: '18:00',
          topic: 'حصة الفيزياء',
        },
        mockTeacherUser,
      );

      expect(created.id).toBe('new-session');
      expect(mockPrismaService.lessonSession.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateSession (same-day group uniqueness)', () => {
    it('rejects moving a session to a day where the group already has another session', async () => {
      mockPrismaService.lessonSession.findUnique.mockResolvedValue({
        id: 'session-1',
        groupId: 'group-1',
        topic: 'حصة النحو',
        sessionDate: new Date('2026-08-20'),
        startTime: '16:00',
        endTime: '18:00',
        isCancelled: false,
        cancellationReason: null,
        group: { id: 'group-1', teacherId: 'teacher-1' },
      });
      mockPrismaService.academicGroup.findUnique.mockResolvedValue({
        id: 'group-1',
        teacherId: 'teacher-1',
      });
      mockPrismaService.lessonSession.findFirst.mockResolvedValueOnce({
        id: 'other-session',
        topic: 'حصة البلاغة',
        startTime: '10:00',
      });

      await expect(
        service.updateSession(
          'session-1',
          { sessionDate: '2026-08-21' },
          mockTeacherUser,
        ),
      ).rejects.toThrow('لنفس المجموعة في نفس اليوم تبدأ الساعة');
    });
  });

  describe('updateSession (Session Cancellation)', () => {
    it('marks a session as cancelled with optional reason', async () => {
      const mockSession = {
        id: 'session-1',
        groupId: 'group-1',
        topic: 'حصة النحو',
        sessionDate: new Date('2026-08-20'),
        startTime: '16:00',
        endTime: '18:00',
        isCancelled: false,
        cancellationReason: null,
        group: { id: 'group-1', teacherId: 'teacher-1' },
      };

      mockPrismaService.lessonSession.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.academicGroup.findUnique.mockResolvedValue({
        id: 'group-1',
        teacherId: 'teacher-1',
      });
      mockPrismaService.lessonSession.update.mockResolvedValue({
        ...mockSession,
        isCancelled: true,
        cancellationReason: 'عطلة رسمية',
      });

      const updated = await service.updateSession(
        'session-1',
        { isCancelled: true, cancellationReason: 'عطلة رسمية' },
        mockTeacherUser,
      );

      expect(mockPrismaService.lessonSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-1' },
          data: expect.objectContaining({
            isCancelled: true,
            cancellationReason: 'عطلة رسمية',
          }),
        }),
      );
      expect(updated.isCancelled).toBe(true);
      expect(updated.cancellationReason).toBe('عطلة رسمية');
    });

    it('reactivates a cancelled session and clears cancellation reason', async () => {
      const mockCancelledSession = {
        id: 'session-1',
        groupId: 'group-1',
        topic: 'حصة النحو',
        sessionDate: new Date('2026-08-20'),
        startTime: '16:00',
        endTime: '18:00',
        isCancelled: true,
        cancellationReason: 'عطلة رسمية',
        group: { id: 'group-1', teacherId: 'teacher-1' },
      };

      mockPrismaService.lessonSession.findUnique.mockResolvedValue(mockCancelledSession);
      mockPrismaService.academicGroup.findUnique.mockResolvedValue({
        id: 'group-1',
        teacherId: 'teacher-1',
      });
      mockPrismaService.lessonSession.update.mockResolvedValue({
        ...mockCancelledSession,
        isCancelled: false,
        cancellationReason: null,
      });

      const updated = await service.updateSession(
        'session-1',
        { isCancelled: false },
        mockTeacherUser,
      );

      expect(mockPrismaService.lessonSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-1' },
          data: expect.objectContaining({
            isCancelled: false,
            cancellationReason: null,
          }),
        }),
      );
      expect(updated.isCancelled).toBe(false);
      expect(updated.cancellationReason).toBeNull();
    });
  });
});
