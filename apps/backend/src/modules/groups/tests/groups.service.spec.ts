import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { GroupsService } from '../services/groups.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import {
  GroupEnrollmentStatus,
  NotificationChannel,
  NotificationType,
  UserRole,
} from '@prisma/client';

describe('GroupsService', () => {
  let service: GroupsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    academicGroup: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    studentProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    groupEnrollment: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    lessonSession: {
      count: jest.fn(),
    },
    attendanceRecord: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockNotificationsService = {
    sendNotification: jest.fn(),
  };

  const mockRealtimeGateway = {
    notifyReservationsChanged: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: RealtimeGateway, useValue: mockRealtimeGateway },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
    // Default: no other active enrollments (the "one active group" guard is a no-op).
    mockPrismaService.groupEnrollment.findMany.mockResolvedValue([]);
    mockPrismaService.groupEnrollment.updateMany.mockResolvedValue({ count: 0 });
  });

  describe('getGroupById (Ownership Enforcement)', () => {
    const groupId = 'group-1';
    const teacher1Id = 'teacher-1';
    const teacher2Id = 'teacher-2';

    const mockGroup = {
      id: groupId,
      name: 'مجموعة الثانوية العامة أ',
      teacherId: teacher1Id,
      maxCapacity: 50,
      schedules: [],
      _count: { enrollments: 10, sessions: 4 },
    };

    it('should allow the owner teacher to access their group', async () => {
      mockPrismaService.academicGroup.findUnique.mockResolvedValue(mockGroup);

      const teacher1User: any = {
        id: teacher1Id,
        teacherProfileId: teacher1Id,
        role: UserRole.TEACHER,
      };

      const result = await service.getGroupById(groupId, teacher1User);
      expect(result.id).toBe(groupId);
    });

    it('should throw ForbiddenException if another teacher attempts to access the group', async () => {
      mockPrismaService.academicGroup.findUnique.mockResolvedValue(mockGroup);

      const teacher2User: any = {
        id: teacher2Id,
        teacherProfileId: teacher2Id,
        role: UserRole.TEACHER,
      };

      await expect(service.getGroupById(groupId, teacher2User)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow SECRETARIAT role to access any group without ownership check', async () => {
      mockPrismaService.academicGroup.findUnique.mockResolvedValue(mockGroup);

      const secretariatUser: any = {
        id: 'sec-1',
        secretariatProfileId: 'sec-1',
        role: UserRole.SECRETARIAT,
      };

      const result = await service.getGroupById(groupId, secretariatUser);
      expect(result.id).toBe(groupId);
    });
  });

  describe('acceptReservation notifications', () => {
    it('sends a push notification to the student and WhatsApp to the parent', async () => {
      const studentId = 'student-1';
      const parentUserId = 'parent-user-1';
      const enrollment = {
        id: 'enrollment-1',
        status: GroupEnrollmentStatus.PENDING,
        studentId,
        groupId: 'group-1',
        group: {
          name: 'مجموعة الثانوية العامة',
          maxCapacity: 30,
          teacherId: 'teacher-1',
          _count: { enrollments: 1 },
          teacher: { user: { fullName: 'الأستاذ' } },
        },
        student: {
          id: studentId,
          user: {
            id: studentId,
            fullName: 'الطالب أحمد',
            phone: '201011111111',
          },
          emergencyPhone: null,
          pendingCredentials: {
            studentPassword: 'Student123!',
            parentPassword: 'Parent123!',
          },
          parentLinks: [
            {
              parent: {
                user: {
                  id: parentUserId,
                  fullName: 'ولي الأمر',
                  phone: '201022222222',
                },
              },
            },
          ],
        },
      };

      mockPrismaService.groupEnrollment.findUnique.mockResolvedValue(enrollment);
      mockPrismaService.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) =>
        callback({
          groupEnrollment: {
            update: jest.fn().mockResolvedValue({ ...enrollment, status: GroupEnrollmentStatus.ACTIVE }),
          },
          studentPaymentRecord: {
            create: jest.fn().mockResolvedValue(undefined),
          },
        }),
      );
      mockNotificationsService.sendNotification.mockResolvedValue({ id: 'notification-1' });

      await service.acceptReservation(enrollment.id, {
        id: 'teacher-1',
        teacherProfileId: 'teacher-1',
        role: UserRole.TEACHER,
      } as any);

      expect(mockNotificationsService.sendNotification).toHaveBeenCalledTimes(2);
      expect(mockNotificationsService.sendNotification).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          recipientId: studentId,
          notificationType: NotificationType.STUDENT_APPROVAL_CREDENTIALS,
          channels: [NotificationChannel.IN_APP, NotificationChannel.WEB_PUSH],
        }),
      );
      expect(mockNotificationsService.sendNotification).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          recipientId: parentUserId,
          notificationType: NotificationType.STUDENT_APPROVAL_CREDENTIALS,
          channels: [
            NotificationChannel.IN_APP,
            NotificationChannel.WEB_PUSH,
            NotificationChannel.WHATSAPP,
          ],
          data: expect.objectContaining({ phone: '201022222222' }),
        }),
      );
    });
  });

  describe('enrollStudent (one active group per student)', () => {
    const groupId = 'group-target';
    const studentId = 'student-1';

    const buildTx = () => ({
      academicGroup: {
        findUnique: jest.fn().mockResolvedValue({
          id: groupId,
          name: 'المجموعة الجديدة',
          teacherId: 'teacher-1',
          isActive: true,
          maxCapacity: 30,
          _count: { enrollments: 5 },
        }),
      },
      studentProfile: {
        findUnique: jest.fn().mockResolvedValue({
          id: studentId,
          user: { isActive: true },
        }),
      },
      groupEnrollment: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn().mockResolvedValue({
          id: 'enr-new',
          groupId,
          studentId,
          status: GroupEnrollmentStatus.ACTIVE,
        }),
      },
    });

    it('throws ConflictException when the student is ACTIVE in another group and transfer is not requested', async () => {
      const tx = buildTx();
      tx.groupEnrollment.findMany.mockResolvedValue([
        { groupId: 'group-old', status: GroupEnrollmentStatus.ACTIVE, group: { name: 'المجموعة القديمة' } },
      ]);
      mockPrismaService.$transaction.mockImplementation(async (cb: (tx: any) => Promise<unknown>) => cb(tx));

      await expect(service.enrollStudent(groupId, studentId, undefined, false)).rejects.toThrow(
        ConflictException,
      );
      expect(tx.groupEnrollment.updateMany).not.toHaveBeenCalled();
      expect(tx.groupEnrollment.upsert).not.toHaveBeenCalled();
    });

    it('marks the old enrollment TRANSFERRED and enrolls when transfer is true', async () => {
      const tx = buildTx();
      tx.groupEnrollment.findMany.mockResolvedValue([
        { groupId: 'group-old', status: GroupEnrollmentStatus.ACTIVE, group: { name: 'المجموعة القديمة' } },
      ]);
      mockPrismaService.$transaction.mockImplementation(async (cb: (tx: any) => Promise<unknown>) => cb(tx));

      const result = await service.enrollStudent(groupId, studentId, undefined, true);

      expect(tx.groupEnrollment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            studentId,
            status: GroupEnrollmentStatus.ACTIVE,
            groupId: { not: groupId },
          }),
          data: { status: GroupEnrollmentStatus.TRANSFERRED },
        }),
      );
      expect(tx.groupEnrollment.upsert).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ status: GroupEnrollmentStatus.ACTIVE }));
    });

    it('enrolls normally when the student has no other active group', async () => {
      const tx = buildTx();
      mockPrismaService.$transaction.mockImplementation(async (cb: (tx: any) => Promise<unknown>) => cb(tx));

      await service.enrollStudent(groupId, studentId, undefined, false);

      expect(tx.groupEnrollment.updateMany).not.toHaveBeenCalled();
      expect(tx.groupEnrollment.upsert).toHaveBeenCalled();
    });
  });

  describe('acceptReservation (one active group per student)', () => {
    it('throws ConflictException when the student is already ACTIVE in another group', async () => {
      const studentId = 'student-9';
      const enrollment = {
        id: 'enrollment-9',
        status: GroupEnrollmentStatus.PENDING,
        studentId,
        groupId: 'group-target',
        group: {
          name: 'المجموعة الهدف',
          maxCapacity: 30,
          teacherId: 'teacher-1',
          _count: { enrollments: 1 },
          teacher: { user: { fullName: 'الأستاذ' } },
        },
        student: {
          id: studentId,
          user: { id: studentId, fullName: 'طالب' },
          parentLinks: [],
        },
      };

      mockPrismaService.groupEnrollment.findUnique.mockResolvedValue(enrollment);
      mockPrismaService.groupEnrollment.findMany.mockResolvedValue([
        { groupId: 'group-other', status: GroupEnrollmentStatus.ACTIVE, group: { name: 'مجموعة أخرى' } },
      ]);

      await expect(
        service.acceptReservation(enrollment.id, {
          id: 'teacher-1',
          teacherProfileId: 'teacher-1',
          role: UserRole.TEACHER,
        } as any),
      ).rejects.toThrow(ConflictException);

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
      expect(mockNotificationsService.sendNotification).not.toHaveBeenCalled();
    });
  });
});
