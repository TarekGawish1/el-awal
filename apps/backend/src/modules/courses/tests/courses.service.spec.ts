import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CoursesService } from '../services/courses.service';
import { CourseProgressRepository } from '../repositories/course-progress.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { BunnyVideoService } from '../../../integrations/video/bunny-video.service';
import { StorageService } from '../../../integrations/storage/storage.service';
import { CourseStatus, CourseAccessStatus, UserRole } from '@prisma/client';

describe('CoursesService', () => {
  let service: CoursesService;
  let prisma: PrismaService;
  let progressRepo: CourseProgressRepository;
  let bunnyVideoService: BunnyVideoService;
  let storageService: StorageService;

  const mockPrismaService = {
    course: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    courseModule: {
      create: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    courseLesson: {
      create: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    courseEnrollment: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    courseAccess: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    courseProgress: {
      findUnique: jest.fn(),
    },
    studentProfile: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockProgressRepository = {
    calculateCourseProgressPercentage: jest.fn(),
    upsertRealtimeProgress: jest.fn(),
    syncBatch: jest.fn(),
  };

  const mockBunnyVideoService = {
    generateSecurePlaybackUrl: jest.fn(),
  };

  const mockStorageService = {
    generatePresignedDownloadUrl: jest.fn(),
    generatePresignedUploadUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CourseProgressRepository, useValue: mockProgressRepository },
        { provide: BunnyVideoService, useValue: mockBunnyVideoService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
    prisma = module.get<PrismaService>(PrismaService);
    progressRepo = module.get<CourseProgressRepository>(CourseProgressRepository);
    bunnyVideoService = module.get<BunnyVideoService>(BunnyVideoService);
    storageService = module.get<StorageService>(StorageService);
    jest.clearAllMocks();
  });

  describe('createCourse', () => {
    it('should create a course in DRAFT status assigned to teacher', async () => {
      const mockCreated = {
        id: 'course-uuid-1',
        title: 'دورة النحو والبلاغة',
        subject: 'اللغة العربية',
        gradeLevel: 'الصف الثالث الثانوي',
        status: CourseStatus.DRAFT,
        teacherId: 'teacher-uuid-1',
      };

      mockPrismaService.course.create.mockResolvedValue(mockCreated);

      const result = await service.createCourse('teacher-uuid-1', {
        title: 'دورة النحو والبلاغة',
        subject: 'اللغة العربية',
        gradeLevel: 'الصف الثالث الثانوي',
      });

      expect(result.status).toBe(CourseStatus.DRAFT);
      expect(result.teacherId).toBe('teacher-uuid-1');
    });
  });

  describe('getLessonViewer', () => {
    const lessonId = 'lesson-1';
    const mockLesson = {
      id: lessonId,
      moduleId: 'module-1',
      title: 'الدرس الأول',
      description: 'شرح مبسط',
      lessonType: 'VIDEO',
      bunnyVideoId: 'bunny-vid-123',
      contentUrl: null,
      isPreview: false,
      videoDurationSeconds: 1200,
      module: {
        courseId: 'course-1',
        course: {
          id: 'course-1',
          title: 'دورة النحو',
          teacherId: 'teacher-1',
        },
      },
    };

    it('should grant access to free preview lesson without enrollment', async () => {
      mockPrismaService.courseLesson.findUnique.mockResolvedValue({
        ...mockLesson,
        isPreview: true,
      });

      mockBunnyVideoService.generateSecurePlaybackUrl.mockResolvedValue(
        'https://video.bunnycdn.com/play/m3u8?token=signed-token',
      );

      const studentUser: any = {
        id: 'user-stu-1',
        studentProfileId: 'stu-profile-1',
        role: UserRole.STUDENT,
      };

      const result = await service.getLessonViewer(lessonId, studentUser);

      expect(result.videoPlayerUrl).toBe(
        'https://video.bunnycdn.com/play/m3u8?token=signed-token',
      );
      expect(result.isPreview).toBe(true);
    });

    it('should grant access to enrolled student with active CourseAccess', async () => {
      mockPrismaService.courseLesson.findUnique.mockResolvedValue(mockLesson);
      mockPrismaService.courseAccess.findFirst.mockResolvedValue({
        id: 'access-1',
        accessStatus: CourseAccessStatus.ACTIVE,
        validUntil: null,
      });
      mockPrismaService.courseProgress.findUnique.mockResolvedValue({
        lastPositionSeconds: 450,
        isCompleted: false,
      });
      mockBunnyVideoService.generateSecurePlaybackUrl.mockResolvedValue(
        'https://video.bunnycdn.com/play/m3u8?token=signed-token',
      );

      const studentUser: any = {
        id: 'user-stu-1',
        studentProfileId: 'stu-profile-1',
        role: UserRole.STUDENT,
      };

      const result = await service.getLessonViewer(lessonId, studentUser);

      expect(result.lastPositionSeconds).toBe(450);
      expect(result.videoPlayerUrl).toBe(
        'https://video.bunnycdn.com/play/m3u8?token=signed-token',
      );
    });

    it('should throw ForbiddenException if student has no active CourseAccess', async () => {
      mockPrismaService.courseLesson.findUnique.mockResolvedValue(mockLesson);
      mockPrismaService.courseAccess.findFirst.mockResolvedValue(null); // No access

      const studentUser: any = {
        id: 'user-stu-1',
        studentProfileId: 'stu-profile-1',
        role: UserRole.STUDENT,
      };

      await expect(service.getLessonViewer(lessonId, studentUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
