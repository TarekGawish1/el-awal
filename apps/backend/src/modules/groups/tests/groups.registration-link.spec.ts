import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GroupsService } from '../services/groups.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import { UserRole } from '@prisma/client';

describe('GroupsService — generateRegistrationLink', () => {
  let service: GroupsService;

  const mockPrismaService = {
    academicGroup: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    teacherProfile: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };

  const mockNotificationsService = { sendNotification: jest.fn() };
  const mockRealtimeGateway = { notifyReservationsChanged: jest.fn() };

  const groupId = 'group-1';
  const teacherId = 'teacher-1';
  const teacherUser = {
    id: teacherId,
    teacherProfileId: teacherId,
    role: UserRole.TEACHER,
  } as any;

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
    jest.clearAllMocks();
    mockPrismaService.teacherProfile.findFirst.mockResolvedValue(null);
  });

  it('should throw NotFoundException when the group does not exist', async () => {
    mockPrismaService.academicGroup.findUnique.mockResolvedValue(null);

    await expect(service.generateRegistrationLink(groupId, teacherUser)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw ForbiddenException when another teacher owns the group', async () => {
    mockPrismaService.academicGroup.findUnique.mockResolvedValue({
      id: groupId,
      name: 'مجموعة تجريبية',
      teacherId: 'teacher-other',
      registrationToken: null,
      isRegistrationOpen: true,
      registrationLinkExpiry: null,
    });

    await expect(service.generateRegistrationLink(groupId, teacherUser)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should generate a valid unique token and return the full registration URL', async () => {
    mockPrismaService.academicGroup.findUnique.mockResolvedValue({
      id: groupId,
      name: 'مجموعة الثانوية العامة أ',
      teacherId,
      registrationToken: null,
      isRegistrationOpen: true,
      registrationLinkExpiry: null,
    });
    mockPrismaService.academicGroup.update.mockResolvedValue({ id: groupId });

    const result = await service.generateRegistrationLink(groupId, teacherUser);

    expect(mockPrismaService.academicGroup.update).toHaveBeenCalledTimes(1);
    const updateArgs = mockPrismaService.academicGroup.update.mock.calls[0][0];
    const generatedToken = updateArgs.data.registrationToken as string;

    // Tokens must be high-entropy opaque strings (32 hex chars) and unique per call
    expect(generatedToken).toMatch(/^[a-f0-9]{32}$/);
    expect(result.token).toBe(generatedToken);
    expect(result.groupId).toBe(groupId);
    expect(result.groupName).toBe('مجموعة الثانوية العامة أ');
    expect(result.registrationUrl).toContain('/register/group?token=');
    expect(result.registrationUrl.endsWith(generatedToken)).toBe(true);
  });

  it('should generate different tokens for subsequent generations', async () => {
    mockPrismaService.academicGroup.findUnique.mockResolvedValue({
      id: groupId,
      name: 'مجموعة',
      teacherId,
      registrationToken: null,
      isRegistrationOpen: true,
      registrationLinkExpiry: null,
    });
    mockPrismaService.academicGroup.update.mockResolvedValue({ id: groupId });

    const first = await service.generateRegistrationLink(groupId, teacherUser);
    const second = await service.generateRegistrationLink(groupId, teacherUser);

    expect(first.token).not.toBe(second.token);
  });

  it('should reuse the existing active token without regenerating', async () => {
    const existingToken = 'a'.repeat(32);
    mockPrismaService.academicGroup.findUnique.mockResolvedValue({
      id: groupId,
      name: 'مجموعة',
      teacherId,
      registrationToken: existingToken,
      isRegistrationOpen: true,
      registrationLinkExpiry: null,
    });

    const result = await service.generateRegistrationLink(groupId, teacherUser);

    expect(mockPrismaService.academicGroup.update).not.toHaveBeenCalled();
    expect(result.token).toBe(existingToken);
    expect(result.registrationUrl).toContain(`token=${existingToken}`);
  });

  it('should regenerate the token when the previous link has expired', async () => {
    mockPrismaService.academicGroup.findUnique.mockResolvedValue({
      id: groupId,
      name: 'مجموعة',
      teacherId,
      registrationToken: 'expired-token',
      isRegistrationOpen: true,
      registrationLinkExpiry: new Date(Date.now() - 60 * 60 * 1000),
    });
    mockPrismaService.academicGroup.update.mockResolvedValue({ id: groupId });

    const result = await service.generateRegistrationLink(groupId, teacherUser);

    expect(mockPrismaService.academicGroup.update).toHaveBeenCalledTimes(1);
    expect(result.token).not.toBe('expired-token');
    expect(result.token).toMatch(/^[a-f0-9]{32}$/);
  });
});
