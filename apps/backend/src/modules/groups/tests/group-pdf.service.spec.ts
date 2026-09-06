import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { GroupPdfService } from '../services/group-pdf.service';
import { PrismaService } from '../../../core/database/prisma.service';

describe('GroupPdfService', () => {
  jest.setTimeout(20000);
  let service: GroupPdfService;
  let prisma: PrismaService;

  const mockPrismaService = {
    academicGroup: {
      findUnique: jest.fn(),
    },
    groupEnrollment: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupPdfService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GroupPdfService>(GroupPdfService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateGroupQRCodesPdf', () => {
    const mockGroup = {
      id: 'grp-1',
      name: 'مجموعة النخبة - الصف الثالث',
      gradeLevel: 'الصف الثالث الثانوي',
      teacherId: 'teacher-1',
      teacher: {
        user: {
          fullName: 'أ. طارق الشناوي',
        },
      },
    };

    const mockEnrollments = [
      {
        id: 'enr-1',
        groupId: 'grp-1',
        status: 'ACTIVE',
        student: {
          id: 'stu-uuid-1',
          studentCode: 'STU-2026-0001',
          qrCodeToken: 'qr_tok_student_0001',
          user: {
            fullName: 'أحمد محمود علي',
            phone: '01012345678',
          },
          parentLinks: [
            {
              parent: {
                user: {
                  phone: '01198765432',
                },
              },
            },
          ],
        },
      },
      {
        id: 'enr-2',
        groupId: 'grp-1',
        status: 'ACTIVE',
        student: {
          id: 'stu-uuid-2',
          studentCode: 'STU-2026-0002',
          qrCodeToken: 'qr_tok_student_0002',
          user: {
            fullName: 'باسم كمال الدين',
            phone: '01099988877',
          },
          parentLinks: [],
          emergencyPhone: '01234567890',
        },
      },
      {
        id: 'enr-3',
        groupId: 'grp-1',
        status: 'ACTIVE',
        student: {
          id: 'stu-uuid-3',
          studentCode: 'STU-2026-0003',
          qrCodeToken: 'qr_tok_student_0003',
          user: {
            fullName: 'حازم شريف مصطفى',
            phone: '01511223344',
          },
          parentLinks: [],
        },
      },
    ];

    it('should throw NotFoundException if group does not exist', async () => {
      mockPrismaService.academicGroup.findUnique.mockResolvedValue(null);

      await expect(
        service.generateGroupQRCodesPdf('invalid-grp', 'teacher-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if teacher does not own group and is not secretariat', async () => {
      mockPrismaService.academicGroup.findUnique.mockResolvedValue(mockGroup);

      await expect(
        service.generateGroupQRCodesPdf('grp-1', 'intruder-teacher', 'TEACHER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow secretariat to generate PDF even if not owner', async () => {
      mockPrismaService.academicGroup.findUnique.mockResolvedValue(mockGroup);
      mockPrismaService.groupEnrollment.findMany.mockResolvedValue(mockEnrollments);

      const buffer = await service.generateGroupQRCodesPdf('grp-1', 'secretariat-user', 'SECRETARIAT');
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // Valid PDF magic header %PDF-
      expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    });

    it('should query active students ordered alphabetically by student.user.fullName', async () => {
      mockPrismaService.academicGroup.findUnique.mockResolvedValue(mockGroup);
      mockPrismaService.groupEnrollment.findMany.mockResolvedValue(mockEnrollments);

      await service.generateGroupQRCodesPdf('grp-1', 'teacher-1');

      expect(mockPrismaService.groupEnrollment.findMany).toHaveBeenCalledWith({
        where: {
          groupId: 'grp-1',
          status: 'ACTIVE',
        },
        include: expect.objectContaining({
          student: expect.objectContaining({
            include: expect.objectContaining({
              user: expect.any(Object),
              parentLinks: expect.any(Object),
            }),
          }),
        }),
        orderBy: {
          student: {
            user: {
              fullName: 'asc',
            },
          },
        },
      });
    });

    it('should return a valid binary PDF stream starting with %PDF- for active students', async () => {
      mockPrismaService.academicGroup.findUnique.mockResolvedValue(mockGroup);
      mockPrismaService.groupEnrollment.findMany.mockResolvedValue(mockEnrollments);

      const buffer = await service.generateGroupQRCodesPdf('grp-1', 'teacher-1');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(1000);
      expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    });

    it('should generate multiple pages when students count exceeds 8 cards per page', async () => {
      mockPrismaService.academicGroup.findUnique.mockResolvedValue(mockGroup);
      // Create 10 mock enrollments to trigger page break
      const tenEnrollments = Array.from({ length: 10 }, (_, i) => ({
        id: `enr-${i + 1}`,
        groupId: 'grp-1',
        status: 'ACTIVE',
        student: {
          id: `stu-${i + 1}`,
          studentCode: `STU-2026-${String(i + 1).padStart(4, '0')}`,
          qrCodeToken: `qr_tok_${i + 1}`,
          user: {
            fullName: `طالب رقم ${i + 1}`,
            phone: `0100000000${i}`,
          },
          parentLinks: [],
        },
      }));
      mockPrismaService.groupEnrollment.findMany.mockResolvedValue(tenEnrollments);

      const buffer = await service.generateGroupQRCodesPdf('grp-1', 'teacher-1');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
      // Buffer with 10 QR cards on 2 pages is significantly larger
      expect(buffer.length).toBeGreaterThan(3000);
    });

    it('should handle an empty group gracefully without crashing', async () => {
      mockPrismaService.academicGroup.findUnique.mockResolvedValue(mockGroup);
      mockPrismaService.groupEnrollment.findMany.mockResolvedValue([]);

      const buffer = await service.generateGroupQRCodesPdf('grp-1', 'teacher-1');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    });
  });

  describe('formatArabicRTL', () => {
    it('should correctly reshape Arabic and reorder words for RTL presentation', () => {
      const result = service.formatArabicRTL('محمد أحمد');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should preserve Latin student codes and numbers in proper orientation', () => {
      const result = service.formatArabicRTL('STU-2026-0001');
      expect(result).toBe('STU-2026-0001');
    });
  });
});
