import { Test, TestingModule } from '@nestjs/testing';
import { ContentService } from '../services/content.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { StorageService } from '../../../integrations/storage/storage.service';
import { BunnyVideoService } from '../../../integrations/video/bunny-video.service';

describe('SEC-03: ContentService.verifyStudentFileOwnership', () => {
  let service: ContentService;
  let prisma: PrismaService;

  const studentAId = 'stu-profile-a-uuid';
  const studentBId = 'stu-profile-b-uuid';

  const mockPrismaService = {
    assessmentSubmission: {
      findFirst: jest.fn(),
    },
    studentAnswer: {
      findFirst: jest.fn(),
    },
    courseEnrollment: {
      findFirst: jest.fn(),
    },
  };

  const mockStorageService = {
    uploadBuffer: jest.fn(),
    deleteObject: jest.fn(),
  };

  const mockBunnyService = {
    uploadVideo: jest.fn(),
    deleteVideo: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: BunnyVideoService, useValue: mockBunnyService },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('Authoritative Database Ownership Verification', () => {
    it('returns true when file is in assessmentSubmission owned by Student A', async () => {
      mockPrismaService.assessmentSubmission.findFirst.mockResolvedValue({
        studentId: studentAId,
      });

      const isOwner = await service.verifyStudentFileOwnership(
        studentAId,
        'homework-submissions/sub-1.pdf',
      );
      expect(isOwner).toBe(true);
      expect(mockPrismaService.assessmentSubmission.findFirst).toHaveBeenCalled();
    });

    it('returns false when file is in assessmentSubmission owned by Student B', async () => {
      mockPrismaService.assessmentSubmission.findFirst.mockResolvedValue({
        studentId: studentBId,
      });

      const isOwner = await service.verifyStudentFileOwnership(
        studentAId,
        'homework-submissions/sub-student-b.pdf',
      );
      expect(isOwner).toBe(false);
    });

    it('returns true when file is in studentAnswer owned by Student A', async () => {
      mockPrismaService.assessmentSubmission.findFirst.mockResolvedValue(null);
      mockPrismaService.studentAnswer.findFirst.mockResolvedValue({
        submission: { studentId: studentAId },
      });

      const isOwner = await service.verifyStudentFileOwnership(
        studentAId,
        'essay-answers/essay-student-a.png',
      );
      expect(isOwner).toBe(true);
    });

    it('returns false when file is in studentAnswer owned by Student B', async () => {
      mockPrismaService.assessmentSubmission.findFirst.mockResolvedValue(null);
      mockPrismaService.studentAnswer.findFirst.mockResolvedValue({
        submission: { studentId: studentBId },
      });

      const isOwner = await service.verifyStudentFileOwnership(
        studentAId,
        'essay-answers/essay-student-b.png',
      );
      expect(isOwner).toBe(false);
    });

    it('returns true when file is in courseEnrollment payment receipt owned by Student A', async () => {
      mockPrismaService.assessmentSubmission.findFirst.mockResolvedValue(null);
      mockPrismaService.studentAnswer.findFirst.mockResolvedValue(null);
      mockPrismaService.courseEnrollment.findFirst.mockResolvedValue({
        studentId: studentAId,
      });

      const isOwner = await service.verifyStudentFileOwnership(
        studentAId,
        'payment-receipts/receipt-a.jpg',
      );
      expect(isOwner).toBe(true);
    });

    it('returns false when file is in courseEnrollment payment receipt owned by Student B', async () => {
      mockPrismaService.assessmentSubmission.findFirst.mockResolvedValue(null);
      mockPrismaService.studentAnswer.findFirst.mockResolvedValue(null);
      mockPrismaService.courseEnrollment.findFirst.mockResolvedValue({
        studentId: studentBId,
      });

      const isOwner = await service.verifyStudentFileOwnership(
        studentAId,
        'payment-receipts/receipt-b.jpg',
      );
      expect(isOwner).toBe(false);
    });

    it('returns true when file path matches isolated staging folder for Student A', async () => {
      const isOwner = await service.verifyStudentFileOwnership(
        studentAId,
        `uploads/students/${studentAId}/temp-receipt.png`,
      );
      expect(isOwner).toBe(true);
    });

    it('returns false when file path points to Student B isolated folder', async () => {
      mockPrismaService.assessmentSubmission.findFirst.mockResolvedValue(null);
      mockPrismaService.studentAnswer.findFirst.mockResolvedValue(null);
      mockPrismaService.courseEnrollment.findFirst.mockResolvedValue(null);

      const isOwner = await service.verifyStudentFileOwnership(
        studentAId,
        `uploads/students/${studentBId}/temp-receipt.png`,
      );
      expect(isOwner).toBe(false);
    });

    it('returns false for nonexistent file across all database tables', async () => {
      mockPrismaService.assessmentSubmission.findFirst.mockResolvedValue(null);
      mockPrismaService.studentAnswer.findFirst.mockResolvedValue(null);
      mockPrismaService.courseEnrollment.findFirst.mockResolvedValue(null);

      const isOwner = await service.verifyStudentFileOwnership(
        studentAId,
        'homework-submissions/nonexistent-file.pdf',
      );
      expect(isOwner).toBe(false);
    });

    it('returns false for path traversal attempts', async () => {
      const isOwner = await service.verifyStudentFileOwnership(
        studentAId,
        '../../uploads/students/stu-2/file.png',
      );
      expect(isOwner).toBe(false);
    });

    it('returns false for empty or undefined target', async () => {
      expect(await service.verifyStudentFileOwnership(studentAId, undefined, undefined)).toBe(false);
      expect(await service.verifyStudentFileOwnership(studentAId, '   ', '')).toBe(false);
    });
  });
});
