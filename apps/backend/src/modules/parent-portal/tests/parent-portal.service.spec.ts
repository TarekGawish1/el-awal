import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ParentPortalService } from '../services/parent-portal.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { PaymentStatus, SubmissionStatus, AttendanceStatus } from '@prisma/client';

describe('ParentPortalService', () => {
  let service: ParentPortalService;
  let prisma: PrismaService;

  const mockPrismaService = {
    parentStudentLink: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    studentProfile: {
      findUnique: jest.fn(),
    },
    attendanceRecord: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    assessmentSubmission: {
      findMany: jest.fn(),
    },
    groupEnrollment: {
      count: jest.fn(),
    },
    courseEnrollment: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    studentPaymentRecord: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParentPortalService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ParentPortalService>(ParentPortalService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('getStudentOverview', () => {
    const parentId = 'parent-1';
    const studentId = 'student-1';

    it('should throw ForbiddenException if parent is not linked to student', async () => {
      mockPrismaService.parentStudentLink.findUnique.mockResolvedValue(null);

      await expect(
        service.getStudentOverview(parentId, studentId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should calculate accurate KPI metrics when parent is linked', async () => {
      mockPrismaService.parentStudentLink.findUnique.mockResolvedValue({
        id: 'link-1',
        parentId,
        studentId,
      });

      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: studentId,
        studentCode: 'STU-001',
        gradeLevel: 'الصف الثالث',
        user: { fullName: 'محمود أحمد', phone: '0101' },
      });

      // Attendance: 8 present out of 10 total (80%)
      mockPrismaService.attendanceRecord.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8)  // present
        .mockResolvedValueOnce(2); // absent

      // Assessments: 18/20 (90%)
      mockPrismaService.assessmentSubmission.findMany.mockResolvedValue([
        {
          id: 'sub-1',
          scoreObtained: 18.0,
          status: SubmissionStatus.GRADED,
          assessment: { totalScore: 20.0 },
        },
      ]);

      mockPrismaService.groupEnrollment.count.mockResolvedValue(1);
      mockPrismaService.courseEnrollment.count.mockResolvedValue(2);

      mockPrismaService.studentPaymentRecord.findFirst.mockResolvedValue({
        paymentStatus: PaymentStatus.PAID,
        amountPaid: 450.0,
      });

      mockPrismaService.attendanceRecord.findMany.mockResolvedValue([]);

      const result = await service.getStudentOverview(parentId, studentId);

      expect(result.kpis.attendanceRatePercentage).toBe(80);
      expect(result.kpis.academicAveragePercentage).toBe(90);
      expect(result.kpis.enrolledPhysicalGroups).toBe(1);
      expect(result.kpis.enrolledOnlineCourses).toBe(2);
      expect(result.kpis.currentMonthBilling.isPaid).toBe(true);
    });
  });
});
