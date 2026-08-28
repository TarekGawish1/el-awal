import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { StudentsService } from '../services/students.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import { WhatsAppService } from '../../../services/whatsapp/whatsapp.service';
import { UserRole, GroupEnrollmentStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';

describe('StudentsService — Password Reset & Credentials Access', () => {
  let service: StudentsService;

  const mockTeacher: AuthenticatedUser = {
    id: 'teacher-user-1',
    role: UserRole.TEACHER,
    teacherProfileId: 'teacher-prof-1',
  };

  const mockSecretariat: AuthenticatedUser = {
    id: 'sec-user-1',
    role: UserRole.SECRETARIAT,
  };

  const mockUnauthorizedTeacher: AuthenticatedUser = {
    id: 'teacher-user-2',
    role: UserRole.TEACHER,
    teacherProfileId: 'teacher-prof-2',
  };

  const mockStudentProfile = {
    id: 'student-prof-1',
    studentCode: 'STU-2026-009',
    gradeLevel: 'الصف الأول الثانوي',
    academicStage: 'SECONDARY',
    tempAccessPin: 'pass123',
    pinExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
    emergencyPhone: '01098765432',
    user: {
      id: 'student-user-1',
      fullName: 'علي محمود حسن',
      phone: '01012345678',
      isActive: true,
    },
    parentLinks: [
      {
        parent: {
          user: {
            id: 'parent-user-1',
            fullName: 'محمود حسن',
            phone: '01098765432',
          },
        },
      },
    ],
  };

  const mockPrismaService = {
    studentProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    groupEnrollment: {
      findFirst: jest.fn(),
    },
    parentStudentLink: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockNotificationsService = {
    createAndDispatch: jest.fn(),
  };

  const mockRealtimeGateway = {
    server: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
  };

  const mockWhatsAppService = {
    sendMessage: jest.fn().mockResolvedValue(true),
    sendTextMessage: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: RealtimeGateway, useValue: mockRealtimeGateway },
        { provide: WhatsAppService, useValue: mockWhatsAppService },
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
    jest.clearAllMocks();
  });

  describe('getStudentCredentials', () => {
    it('returns student credentials and active temporary PIN for teacher', async () => {
      mockPrismaService.groupEnrollment.findFirst.mockResolvedValue({ id: 'enr-1' });
      mockPrismaService.studentProfile.findUnique.mockResolvedValue(mockStudentProfile);

      const result = await service.getStudentCredentials('student-prof-1', mockTeacher);

      expect(result.studentCode).toBe('STU-2026-009');
      expect(result.studentPhone).toBe('01012345678');
      expect(result.parentPhone).toBe('01098765432');
      expect(result.tempAccessPin).toBe('pass123');
      expect(result.isPinActive).toBe(true);
    });

    it('rejects teacher not teaching the student with ForbiddenException', async () => {
      mockPrismaService.groupEnrollment.findFirst.mockResolvedValue(null);

      await expect(
        service.getStudentCredentials('student-prof-1', mockUnauthorizedTeacher),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('resetStudentPassword', () => {
    it('resets password, updates tempAccessPin and dispatches WhatsApp alert', async () => {
      mockPrismaService.groupEnrollment.findFirst.mockResolvedValue({ id: 'enr-1' });
      mockPrismaService.studentProfile.findUnique.mockResolvedValue(mockStudentProfile);
      mockPrismaService.user.findUnique.mockResolvedValue({ fullName: 'أ. طارق عبد الله' });
      mockPrismaService.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.resetStudentPassword(
        'student-prof-1',
        { newPassword: 'newSecretPass1', sendWhatsApp: true },
        mockTeacher,
      );

      expect(result.success).toBe(true);
      expect(result.newPassword).toBe('newSecretPass1');
      expect(result.studentCode).toBe('STU-2026-009');
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockWhatsAppService.sendMessage).toHaveBeenCalled();
    });

    it('allows secretariat to reset student password', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue(mockStudentProfile);
      mockPrismaService.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.resetStudentPassword(
        'student-prof-1',
        { newPassword: '654321', sendWhatsApp: false },
        mockSecretariat,
      );

      expect(result.success).toBe(true);
      expect(result.newPassword).toBe('654321');
    });
  });
});
