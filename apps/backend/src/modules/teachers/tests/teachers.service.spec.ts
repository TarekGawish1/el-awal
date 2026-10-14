import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { TeachersService } from '../services/teachers.service';
import { PrismaService } from '../../../core/database/prisma.service';

describe('TeachersService Security & Assistant Resolution (F-19 Hardening)', () => {
  let service: TeachersService;

  const mockPrismaService = {
    teacherProfile: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    teacherAssistant: {
      findFirst: jest.fn(),
    },
    academicGroup: {
      findMany: jest.fn(),
    },
    lessonSession: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    attendanceRecord: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    assessmentSubmission: {
      findMany: jest.fn(),
    },
    studentProfile: {
      count: jest.fn(),
    },
    course: {
      count: jest.fn(),
    },
    studentPaymentRecord: {
      findMany: jest.fn(),
    },
    homeworkSubmission: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeachersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TeachersService>(TeachersService);
    jest.clearAllMocks();

    // Default mock returns for dashboard aggregation
    mockPrismaService.academicGroup.findMany.mockResolvedValue([]);
    mockPrismaService.lessonSession.findMany.mockResolvedValue([]);
    mockPrismaService.lessonSession.count.mockResolvedValue(0);
    mockPrismaService.attendanceRecord.findMany.mockResolvedValue([]);
    mockPrismaService.attendanceRecord.count.mockResolvedValue(0);
    mockPrismaService.assessmentSubmission.findMany.mockResolvedValue([]);
    mockPrismaService.studentProfile.count.mockResolvedValue(0);
    mockPrismaService.course.count.mockResolvedValue(0);
    mockPrismaService.studentPaymentRecord.findMany.mockResolvedValue([]);
    mockPrismaService.homeworkSubmission.count.mockResolvedValue(0);
  });

  describe('Teacher Dashboard Resolution & Cross-Tenant Access Protection', () => {
    it('resolves directly by teacherId when the profile exists in teacherProfile', async () => {
      mockPrismaService.teacherProfile.findUnique.mockResolvedValue({
        id: 'teacher-profile-100',
        activeAcademicYear: '2026-2027',
        activeAcademicTerm: 'FIRST_TERM',
      });

      await service.getDashboardOverview('teacher-profile-100', {});

      expect(mockPrismaService.teacherProfile.findUnique).toHaveBeenCalledWith({
        where: { id: 'teacher-profile-100' },
        select: { id: true },
      });
      expect(mockPrismaService.teacherAssistant.findFirst).not.toHaveBeenCalled();
      expect(mockPrismaService.academicGroup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ teacherId: 'teacher-profile-100' }),
        }),
      );
    });

    it('resolves linked teacher when caller is an active assistant in TeacherAssistant', async () => {
      // User ID is not a teacherProfile
      mockPrismaService.teacherProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.teacherProfile.findFirst.mockResolvedValue(null);

      // Caller is an assistant linked to teacher-profile-alpha
      mockPrismaService.teacherAssistant.findFirst.mockResolvedValue({
        id: 'ta-link-1',
        teacherId: 'teacher-profile-alpha',
        assistantId: 'assistant-user-42',
        status: 'ACTIVE',
      });

      await service.getDashboardOverview('assistant-user-42', {});

      expect(mockPrismaService.teacherAssistant.findFirst).toHaveBeenCalledWith({
        where: { assistantId: 'assistant-user-42', status: 'ACTIVE' },
        select: { teacherId: true },
      });
      // Correctly scopes groups to the assistant's linked teacher
      expect(mockPrismaService.academicGroup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ teacherId: 'teacher-profile-alpha' }),
        }),
      );
    });

    it('rejects unlinked assistant or unknown user with ForbiddenException instead of leaking primary teacher', async () => {
      mockPrismaService.teacherProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.teacherProfile.findFirst.mockResolvedValue(null);
      // No active linkage found
      mockPrismaService.teacherAssistant.findFirst.mockResolvedValue(null);

      await expect(
        service.getDashboardOverview('unlinked-user-99', {}),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrismaService.academicGroup.findMany).not.toHaveBeenCalled();
    });

    it('rejects suspended assistant with ForbiddenException', async () => {
      mockPrismaService.teacherProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.teacherProfile.findFirst.mockResolvedValue(null);
      // Query specifies status: 'ACTIVE', so a suspended assistant returns null
      mockPrismaService.teacherAssistant.findFirst.mockResolvedValue(null);

      await expect(
        service.getDashboardOverview('suspended-assistant-88', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('prevents cross-tenant access: assistant for Teacher B only receives Teacher B data', async () => {
      mockPrismaService.teacherProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.teacherProfile.findFirst.mockResolvedValue(null);

      // Assistant belongs to Teacher B
      mockPrismaService.teacherAssistant.findFirst.mockResolvedValue({
        id: 'ta-link-beta',
        teacherId: 'teacher-profile-bravo',
        assistantId: 'assistant-bravo-1',
        status: 'ACTIVE',
      });

      await service.getDashboardOverview('assistant-bravo-1', {});

      expect(mockPrismaService.academicGroup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ teacherId: 'teacher-profile-bravo' }),
        }),
      );
    });
  });
});
