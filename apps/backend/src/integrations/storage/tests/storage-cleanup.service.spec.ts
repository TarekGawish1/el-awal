import { Test, TestingModule } from '@nestjs/testing';
import { StorageCleanupService } from '../storage-cleanup.service';
import { StorageService } from '../storage.service';
import { PrismaService } from '../../../core/database/prisma.service';

describe('StorageCleanupService', () => {
  let service: StorageCleanupService;
  let mockPrisma: any;
  let mockStorageService: any;

  beforeEach(async () => {
    mockPrisma = {
      course: { findMany: jest.fn().mockResolvedValue([{ coverImageUrl: 'uploads/courses/active-course.jpg', previewVideoUrl: null }]) },
      courseLesson: { findMany: jest.fn().mockResolvedValue([]) },
      lessonAttachment: { findMany: jest.fn().mockResolvedValue([]) },
      courseEnrollment: { findMany: jest.fn().mockResolvedValue([]) },
      educationalContent: { findMany: jest.fn().mockResolvedValue([]) },
      assessmentQuestion: { findMany: jest.fn().mockResolvedValue([{ imageUrl: 'uploads/assessments/q1.png', optionImages: ['uploads/assessments/opt1.png'] }]) },
      assessmentSubmission: { findMany: jest.fn().mockResolvedValue([]) },
      certificate: { findMany: jest.fn().mockResolvedValue([{ fileUrl: 'https://pub-cdn.dev/certificates/cert1.png' }]) },
      siteSetting: { findMany: jest.fn().mockResolvedValue([]) },
      systemSetting: { findMany: jest.fn().mockResolvedValue([]) },
      studentAnswer: { findMany: jest.fn().mockResolvedValue([]) },
    };

    mockStorageService = {
      listObjects: jest.fn(),
      deleteObjects: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageCleanupService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<StorageCleanupService>(StorageCleanupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should accurately detect referenced files vs orphans', async () => {
    const oldDate = new Date(Date.now() - 48 * 3600 * 1000); // 48h ago
    mockStorageService.listObjects.mockResolvedValue([
      { key: 'uploads/courses/active-course.jpg', size: 100, lastModified: oldDate },
      { key: 'uploads/assessments/q1.png', size: 200, lastModified: oldDate },
      { key: 'certificates/cert1.png', size: 300, lastModified: oldDate },
      { key: 'uploads/orphans/dead-file.png', size: 500, lastModified: oldDate },
    ]);

    const report = await service.scanAndCleanOrphans({ dryRun: true, gracePeriodHours: 24 });

    expect(report.totalR2Objects).toBe(4);
    expect(report.referencedCount).toBe(3);
    expect(report.orphanCount).toBe(1);
    expect(report.orphanKeys).toEqual(['uploads/orphans/dead-file.png']);
    expect(report.freedSizeBytes).toBe(500);
    expect(mockStorageService.deleteObjects).not.toHaveBeenCalled();
  });

  it('should protect recent unreferenced files under grace period', async () => {
    const recentDate = new Date(Date.now() - 2 * 3600 * 1000); // 2h ago
    mockStorageService.listObjects.mockResolvedValue([
      { key: 'uploads/drafts/in-progress-exam.png', size: 400, lastModified: recentDate },
    ]);

    const report = await service.scanAndCleanOrphans({ dryRun: false, gracePeriodHours: 24 });

    expect(report.recentProtectedCount).toBe(1);
    expect(report.orphanCount).toBe(0);
    expect(mockStorageService.deleteObjects).not.toHaveBeenCalled();
  });

  it('should delete orphans in non-dry-run mode', async () => {
    const oldDate = new Date(Date.now() - 48 * 3600 * 1000);
    mockStorageService.listObjects.mockResolvedValue([
      { key: 'uploads/orphans/old-abandoned.pdf', size: 1024, lastModified: oldDate },
    ]);

    const report = await service.scanAndCleanOrphans({ dryRun: false, gracePeriodHours: 24 });

    expect(report.orphanCount).toBe(1);
    expect(report.deletedCount).toBe(1);
    expect(mockStorageService.deleteObjects).toHaveBeenCalledWith(['uploads/orphans/old-abandoned.pdf']);
  });
});
