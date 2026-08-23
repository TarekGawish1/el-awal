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
      delete: jest.fn(),
    },
    courseModule: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    courseLesson: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    lessonAttachment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    lessonQuestion: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    lessonQuestionReply: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    courseEnrollment: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    courseAccess: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    groupCourseAccess: {
      upsert: jest.fn(),
    },
    groupEnrollment: {
      findMany: jest.fn(),
    },
    courseProgress: {
      findUnique: jest.fn(),
    },
    studentProfile: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callbackOrArray) => {
      if (typeof callbackOrArray === 'function') {
        return callbackOrArray(mockPrismaService);
      }
      return Promise.all(callbackOrArray);
    }),
  };

  const mockProgressRepository = {
    calculateCourseProgressPercentage: jest.fn(),
    upsertRealtimeProgress: jest.fn(),
    syncBatch: jest.fn(),
  };

  const mockBunnyVideoService = {
    generateSecurePlaybackUrl: jest.fn(),
    generateDirectUploadCredentials: jest.fn(),
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

  describe('createCourse with multi-level quiz linkage', () => {
    it('should create a course in DRAFT status with optional course final quiz ID', async () => {
      const mockCreated = {
        id: 'course-uuid-1',
        title: 'دورة النحو والبلاغة',
        subject: 'اللغة العربية',
        gradeLevel: 'الصف الثالث الثانوي',
        status: CourseStatus.DRAFT,
        teacherId: 'teacher-uuid-1',
        courseQuizId: 'quiz-final-uuid',
      };

      mockPrismaService.course.create.mockResolvedValue(mockCreated);

      const result = await service.createCourse('teacher-uuid-1', {
        title: 'دورة النحو والبلاغة',
        subject: 'اللغة العربية',
        gradeLevel: 'الصف الثالث الثانوي',
        courseQuizId: 'quiz-final-uuid',
      });

      expect(result.status).toBe(CourseStatus.DRAFT);
      expect(result.teacherId).toBe('teacher-uuid-1');
      expect(result.courseQuizId).toBe('quiz-final-uuid');
    });
  });

  describe('createModule & createLesson with Unit and Lesson Quizzes', () => {
    it('should create a unit module linked to a unit comprehensive quiz', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue({
        id: 'course-1',
        teacherId: 'teacher-1',
      });
      mockPrismaService.courseModule.count.mockResolvedValue(0);
      mockPrismaService.courseModule.create.mockResolvedValue({
        id: 'module-1',
        courseId: 'course-1',
        title: 'الوحدة الأولى: قواعد النحو',
        orderIndex: 1,
        unitQuizId: 'quiz-unit-1',
      });

      const result = await service.createModule('course-1', 'teacher-1', false, {
        title: 'الوحدة الأولى: قواعد النحو',
        unitQuizId: 'quiz-unit-1',
      });

      expect(result.id).toBe('module-1');
      expect(result.unitQuizId).toBe('quiz-unit-1');
    });

    it('should create a lesson with rich summary, Bunny video ID, and lesson quiz ID', async () => {
      mockPrismaService.courseModule.findUnique.mockResolvedValue({
        id: 'module-1',
        course: { id: 'course-1', teacherId: 'teacher-1' },
      });
      mockPrismaService.courseLesson.count.mockResolvedValue(0);
      mockPrismaService.courseLesson.create.mockResolvedValue({
        id: 'lesson-1',
        moduleId: 'module-1',
        title: 'الدرس الأول: كان وأخواتها',
        summary: '### ملخص كان وأخواتها',
        bunnyVideoId: 'bunny-12345',
        videoDurationSeconds: 1800,
        lessonQuizId: 'quiz-lesson-1',
        isPreview: true,
      });

      const result = await service.createLesson('module-1', 'teacher-1', false, {
        title: 'الدرس الأول: كان وأخواتها',
        summary: '### ملخص كان وأخواتها',
        bunnyVideoId: 'bunny-12345',
        videoDurationSeconds: 1800,
        lessonQuizId: 'quiz-lesson-1',
        isFreePreview: true,
      });

      expect(result.id).toBe('lesson-1');
      expect(result.summary).toBe('### ملخص كان وأخواتها');
      expect(result.lessonQuizId).toBe('quiz-lesson-1');
    });
  });

  describe('Lesson Attachments & PDF Resources', () => {
    it('should attach a downloadable PDF resource to a lesson', async () => {
      mockPrismaService.courseLesson.findUnique.mockResolvedValue({
        id: 'lesson-1',
        module: { course: { teacherId: 'teacher-1' } },
      });
      mockPrismaService.lessonAttachment.create.mockResolvedValue({
        id: 'att-1',
        lessonId: 'lesson-1',
        title: 'ملخص قوانين الدرس PDF',
        fileUrl: 'https://assets.elawal.com/summary.pdf',
        fileKey: 'courses/summary.pdf',
        fileSize: 1048576,
        fileType: 'application/pdf',
      });

      const result = await service.addLessonAttachment('lesson-1', 'teacher-1', false, {
        title: 'ملخص قوانين الدرس PDF',
        fileUrl: 'https://assets.elawal.com/summary.pdf',
        fileKey: 'courses/summary.pdf',
        fileSize: 1048576,
        fileType: 'application/pdf',
      });

      expect(result.id).toBe('att-1');
      expect(result.title).toBe('ملخص قوانين الدرس PDF');
    });
  });

  describe('Timestamped Video Q&A Discussion', () => {
    it('should submit a question with videoTimestamp in seconds', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'stu-1',
      });
      mockPrismaService.lessonQuestion.create.mockResolvedValue({
        id: 'q-1',
        content: 'هل يجوز تقديم خبر كان في هذه الحالة؟',
        videoTimestamp: 145,
        lessonId: 'lesson-1',
        studentId: 'stu-1',
        student: { user: { fullName: 'أحمد محمد' } },
        replies: [],
      });

      const user: any = {
        id: 'user-1',
        studentProfileId: 'stu-1',
        role: UserRole.STUDENT,
      };

      const result = await service.createLessonQuestion('lesson-1', user, {
        content: 'هل يجوز تقديم خبر كان في هذه الحالة؟',
        videoTimestamp: 145,
      });

      expect(result.id).toBe('q-1');
      expect(result.videoTimestamp).toBe(145);
      expect(result.studentName).toBe('أحمد محمد');
    });

    it('should create a reply to a question with author role and name', async () => {
      mockPrismaService.lessonQuestion.findUnique.mockResolvedValue({
        id: 'q-1',
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-teacher-1',
        fullName: 'أ. طارق جاويش',
      });
      mockPrismaService.lessonQuestionReply.create.mockResolvedValue({
        id: 'reply-1',
        questionId: 'q-1',
        content: 'نعم يجوز تقديم الخبر إذا كان شبه جملة.',
        authorId: 'user-teacher-1',
        authorRole: UserRole.TEACHER,
        authorName: 'أ. طارق جاويش',
      });

      const teacherUser: any = {
        id: 'user-teacher-1',
        teacherProfileId: 'teacher-1',
        role: UserRole.TEACHER,
      };

      const result = await service.createQuestionReply('q-1', teacherUser, {
        content: 'نعم يجوز تقديم الخبر إذا كان شبه جملة.',
      });

      expect(result.id).toBe('reply-1');
      expect(result.authorName).toBe('أ. طارق جاويش');
    });
  });

  describe('Batch Group Course Access', () => {
    it('should provision course enrollments and access for all students in group', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue({
        id: 'course-1',
        teacherId: 'teacher-1',
      });
      mockPrismaService.groupCourseAccess.upsert.mockResolvedValue({
        id: 'gca-1',
        courseId: 'course-1',
        groupId: 'group-1',
      });
      mockPrismaService.groupEnrollment.findMany.mockResolvedValue([
        { studentId: 'stu-1' },
        { studentId: 'stu-2' },
      ]);
      mockPrismaService.courseEnrollment.upsert.mockResolvedValue({
        id: 'enr-1',
      });
      mockPrismaService.courseAccess.upsert.mockResolvedValue({
        id: 'acc-1',
      });

      const result = await service.grantGroupAccess('course-1', 'teacher-1', false, {
        groupIds: ['group-1'],
      });

      expect(result.courseId).toBe('course-1');
      expect(result.groupsGranted).toBe(1);
    });
  });

  describe('getLessonViewer', () => {
    const lessonId = 'lesson-1';
    const mockLesson = {
      id: lessonId,
      moduleId: 'module-1',
      title: 'الدرس الأول',
      description: 'شرح مبسط',
      summary: 'ملخص الدرس',
      lessonType: 'VIDEO',
      bunnyVideoId: 'bunny-vid-123',
      contentUrl: null,
      isPreview: false,
      videoDurationSeconds: 1200,
      attachments: [],
      lessonQuiz: { id: 'quiz-1', title: 'اختبار الدرس' },
      module: {
        unitQuiz: { id: 'quiz-unit-1', title: 'اختبار الوحدة' },
        courseId: 'course-1',
        course: {
          id: 'course-1',
          title: 'دورة النحو',
          teacherId: 'teacher-1',
          courseQuiz: { id: 'quiz-course-1', title: 'الاختبار الشامل' },
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
      expect(result.lessonQuiz).toBeDefined();
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
