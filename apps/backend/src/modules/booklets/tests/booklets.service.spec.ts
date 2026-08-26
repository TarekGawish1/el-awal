import { Test, TestingModule } from '@nestjs/testing';
import { BookletsService } from '../services/booklets.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';

describe('BookletsService', () => {
  let service: BookletsService;
  let prisma: PrismaService;

  const mockTeacherUser: AuthenticatedUser = {
    id: 'teacher-user-1',
    role: UserRole.TEACHER,
    teacherProfileId: 'teacher-profile-1',
  };

  const mockPrismaService = {
    teacherProfile: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    academicGroup: {
      findUnique: jest.fn(),
    },
    booklet: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookletsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BookletsService>(BookletsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new booklet linked to the teacher and grade level', async () => {
      mockPrismaService.teacherProfile.findUnique.mockResolvedValue({
        id: 'teacher-profile-1',
        activeAcademicYear: '2026-2027',
        activeAcademicTerm: 'FIRST_TERM',
      });

      const mockCreatedBooklet = {
        id: 'bkt-123',
        title: 'مذكرة الشرح والتدريبات',
        price: 85.0,
        gradeLevel: 'الصف الأول الثانوي',
        groupId: null,
        teacherProfileId: 'teacher-profile-1',
        academicYear: '2026-2027',
        academicTerm: 'FIRST_TERM',
        stockCount: 50,
        isActive: true,
        group: null,
      };

      mockPrismaService.booklet.create.mockResolvedValue(mockCreatedBooklet);

      const result = await service.create(mockTeacherUser, {
        title: 'مذكرة الشرح والتدريبات',
        price: 85.0,
        gradeLevel: 'الصف الأول الثانوي',
        stockCount: 50,
      });

      expect(result.id).toBe('bkt-123');
      expect(result.title).toBe('مذكرة الشرح والتدريبات');
      expect(result.price).toBe(85.0);
      expect(result.salesCount).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(mockPrismaService.booklet.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'مذكرة الشرح والتدريبات',
            price: 85.0,
            gradeLevel: 'الصف الأول الثانوي',
            teacherProfileId: 'teacher-profile-1',
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return list of booklets with calculated salesCount and totalRevenue', async () => {
      mockPrismaService.teacherProfile.findFirst.mockResolvedValue({
        id: 'teacher-profile-1',
      });

      mockPrismaService.booklet.findMany.mockResolvedValue([
        {
          id: 'bkt-1',
          title: 'مذكرة 1',
          price: 100.0,
          gradeLevel: 'الصف الثاني الثانوي',
          groupId: null,
          isActive: true,
          payments: [
            { id: 'p1', amountPaid: 100.0 },
            { id: 'p2', amountPaid: 100.0 },
          ],
        },
      ]);

      const result = await service.findAll(mockTeacherUser, {});

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('bkt-1');
      expect(result[0].salesCount).toBe(2);
      expect(result[0].totalRevenue).toBe(200.0);
    });
  });

  describe('delete', () => {
    it('should permanently delete booklet when 0 payments exist', async () => {
      mockPrismaService.booklet.findUnique.mockResolvedValue({
        id: 'bkt-1',
        teacherProfileId: 'teacher-profile-1',
        _count: { payments: 0 },
      });

      mockPrismaService.booklet.delete.mockResolvedValue({ id: 'bkt-1' });

      const result = await service.delete('bkt-1', mockTeacherUser);

      expect(result.success).toBe(true);
      expect(result.softDeleted).toBe(false);
      expect(mockPrismaService.booklet.delete).toHaveBeenCalledWith({
        where: { id: 'bkt-1' },
      });
    });

    it('should soft deactivate booklet when payments already exist', async () => {
      mockPrismaService.booklet.findUnique.mockResolvedValue({
        id: 'bkt-1',
        teacherProfileId: 'teacher-profile-1',
        _count: { payments: 5 },
      });

      mockPrismaService.booklet.update.mockResolvedValue({ id: 'bkt-1', isActive: false });

      const result = await service.delete('bkt-1', mockTeacherUser);

      expect(result.success).toBe(true);
      expect(result.softDeleted).toBe(true);
      expect(mockPrismaService.booklet.update).toHaveBeenCalledWith({
        where: { id: 'bkt-1' },
        data: { isActive: false },
      });
    });
  });
});
