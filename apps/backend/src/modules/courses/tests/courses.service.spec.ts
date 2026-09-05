import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CoursesService } from '../services/courses.service';
import { CourseProgressRepository } from '../repositories/course-progress.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { BunnyVideoService } from '../../../integrations/video/bunny-video.service';
import { StorageService } from '../../../integrations/storage/storage.service';
import { AiModerationService } from '../../../integrations/ai/ai-moderation.service';
import { CourseStatus, CourseAccessStatus, CourseEnrollmentStatus, UserRole } from '@prisma/client';

describe('CoursesService', () => {
  let service: CoursesService;
  let prisma: PrismaService;
  let progressRepo: CourseProgressRepository;
  let bunnyVideoService: BunnyVideoService;
  let storageService: StorageService;
  let aiModerationService: AiModerationService;

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
      findMany: jest.fn().mockResolvedValue([]),
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
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    lessonQuestion: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    lessonQuestionReply: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    courseEnrollment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    courseAccess: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
    },
    groupCourseAccess: {
      upsert: jest.fn(),
    },
    groupEnrollment: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    courseProgress: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    assessmentSubmission: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    studentProfile: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
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
    getEmbedUrl: jest.fn().mockReturnValue('https://iframe.mediadelivery.net/embed/12345/bunny-vid-123'),
    getLibraryId: jest.fn().mockReturnValue('12345'),
    deleteVideo: jest.fn().mockResolvedValue(undefined),
  };

  const mockStorageService = {
    generatePresignedDownloadUrl: jest.fn(),
    generatePresignedUploadUrl: jest.fn(),
    deleteObject: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CourseProgressRepository, useValue: mockProgressRepository },
        { provide: BunnyVideoService, useValue: mockBunnyVideoService },
        { provide: StorageService, useValue: mockStorageService },
        {
          provide: AiModerationService,
          useValue: {
            assertValidContent: jest.fn(async (text: string) => {
              const { containsProfanity } = require('../../../common/utils/content-moderation.util');
              if (containsProfanity(text)) {
                throw new BadRequestException('عذراً، يحتوي النص على كلمات أو عبارات غير لائقة');
              }
            }),
            evaluateContent: jest.fn(async (text: string) => ({ isValid: true, flaggedBy: 'CLEAN' })),
          },
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
    prisma = module.get<PrismaService>(PrismaService);
    progressRepo = module.get<CourseProgressRepository>(CourseProgressRepository);
    bunnyVideoService = module.get<BunnyVideoService>(BunnyVideoService);
    storageService = module.get<StorageService>(StorageService);
    aiModerationService = module.get<AiModerationService>(AiModerationService);
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

    it('should allow a teacher previewing the course to submit a question gracefully', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-teacher-1', fullName: 'أ. أحمد غريب' });
      mockPrismaService.studentProfile.create.mockResolvedValue({
        id: 'user-teacher-1',
        user: { fullName: 'أ. أحمد غريب' },
      });
      mockPrismaService.lessonQuestion.create.mockResolvedValue({
        id: 'q-teacher-1',
        content: 'سؤال تجريبي من المعلم أثناء المعاينة',
        videoTimestamp: 0,
        lessonId: 'lesson-1',
        studentId: 'user-teacher-1',
        student: { user: { fullName: 'أ. أحمد غريب' } },
        replies: [],
      });

      const teacherUser: any = {
        id: 'user-teacher-1',
        role: UserRole.TEACHER,
      };

      const result = await service.createLessonQuestion('lesson-1', teacherUser, {
        content: 'سؤال تجريبي من المعلم أثناء المعاينة',
        videoTimestamp: 0,
      });

      expect(result.id).toBe('q-teacher-1');
      expect(result.videoTimestamp).toBe(0);
      expect(result.studentName).toBe('أ. أحمد غريب');
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
      expect(result.content).toBe('نعم يجوز تقديم الخبر إذا كان شبه جملة.');
      expect(result.authorName).toBe('أ. طارق جاويش');
    });

    it('should reject questions and replies containing insults or profanity', async () => {
      const studentUser: any = {
        id: 'user-1',
        studentProfileId: 'stu-1',
        role: UserRole.STUDENT,
      };

      await expect(
        service.createLessonQuestion('lesson-1', studentUser, {
          content: 'fuck you bitch',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createLessonQuestion('lesson-1', studentUser, {
          content: 'احا ايه دا',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createQuestionReply('q-1', studentUser, {
          content: 'يا شرموط',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow author or teacher to update and delete questions and replies', async () => {
      mockPrismaService.lessonQuestion.findUnique.mockResolvedValue({
        id: 'q-1',
        studentId: 'stu-1',
        student: { user: { id: 'user-1' } },
        lesson: { module: { course: { teacherId: 'teacher-1' } } },
      });
      mockPrismaService.lessonQuestion.update.mockResolvedValue({
        id: 'q-1',
        content: 'سؤال محدث',
      });
      mockPrismaService.lessonQuestion.delete.mockResolvedValue({ id: 'q-1' });

      const authorUser: any = { id: 'user-1', studentProfileId: 'stu-1', role: UserRole.STUDENT };
      const updated = await service.updateLessonQuestion('q-1', authorUser, {
        content: 'سؤال محدث',
      });
      expect(updated.content).toBe('سؤال محدث');

      const deleted = await service.deleteLessonQuestion('q-1', authorUser);
      expect(deleted.id).toBe('q-1');

      // Test reply update & delete
      mockPrismaService.lessonQuestionReply.findUnique.mockResolvedValue({
        id: 'reply-1',
        authorId: 'user-1',
        question: { lesson: { module: { course: { teacherId: 'teacher-1' } } } },
      });
      mockPrismaService.lessonQuestionReply.update.mockResolvedValue({
        id: 'reply-1',
        content: 'رد محدث',
      });
      mockPrismaService.lessonQuestionReply.delete.mockResolvedValue({ id: 'reply-1' });

      const updatedReply = await service.updateQuestionReply('reply-1', authorUser, {
        content: 'رد محدث',
      });
      expect(updatedReply.content).toBe('رد محدث');

      const deletedReply = await service.deleteQuestionReply('reply-1', authorUser);
      expect(deletedReply.id).toBe('reply-1');
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

  describe('getLessonStreamAuth & Hybrid Enrollment', () => {
    it('should return signed DRM stream and anti-piracy watermark for authorized student', async () => {
      const mockLessonWithCourse = {
        id: 'les-stream-1',
        title: 'شرح الباب الأول',
        bunnyVideoId: 'bunny-vid-123',
        contentUrl: null,
        isPreview: false,
        module: {
          course: {
            id: 'course-1',
            teacherId: 'teacher-1',
            groupAccess: [],
          },
        },
      };

      mockPrismaService.courseLesson.findUnique.mockResolvedValue(mockLessonWithCourse);
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'stu-profile-1',
        studentCode: 'STU-2026-0001',
        user: { fullName: 'عاصم طارق', phone: '01012345678' },
        groupEnrollments: [],
      });
      mockPrismaService.courseEnrollment.findUnique.mockResolvedValue({
        id: 'enr-1',
        status: 'ACTIVE',
      });
      mockBunnyVideoService.generateSecurePlaybackUrl.mockReturnValue(
        'https://video.bunnycdn.com/bunny-vid-123/playlist.m3u8?token=sig&expires=12345',
      );

      const studentUser: any = {
        id: 'user-1',
        studentProfileId: 'stu-profile-1',
        role: UserRole.STUDENT,
      };

      const result = await service.getLessonStreamAuth('les-stream-1', studentUser);

      expect(result.videoId).toBe('bunny-vid-123');
      expect(result.watermark).toEqual({
        studentName: 'عاصم طارق',
        studentPhone: '01012345678',
        studentCode: 'STU-2026-0001',
      });
    });

    it('should throw ForbiddenException if student is not enrolled and lesson is not preview', async () => {
      const mockLessonLocked = {
        id: 'les-locked',
        title: 'درس مقفل',
        bunnyVideoId: 'bunny-locked',
        isPreview: false,
        module: {
          course: {
            id: 'course-1',
            teacherId: 'teacher-1',
            groupAccess: [],
          },
        },
      };

      mockPrismaService.courseLesson.findUnique.mockResolvedValue(mockLessonLocked);
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'stu-unauthorized',
        studentCode: 'STU-2026-9999',
        user: { fullName: 'طالب غير مشترك', phone: '01099999999' },
        groupEnrollments: [],
      });
      mockPrismaService.courseEnrollment.findUnique.mockResolvedValue(null);

      const studentUser: any = {
        id: 'user-2',
        studentProfileId: 'stu-unauthorized',
        role: UserRole.STUDENT,
      };

      await expect(service.getLessonStreamAuth('les-locked', studentUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should batch enroll students into course', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue({
        id: 'course-1',
        teacherId: 'teacher-1',
      });
      mockPrismaService.courseEnrollment.upsert.mockResolvedValue({
        id: 'enr-new-1',
        courseId: 'course-1',
        studentId: 'stu-1',
      });
      mockPrismaService.courseAccess.upsert.mockResolvedValue({
        id: 'acc-new-1',
      });

      const result = await service.enrollStudentsBatch(
        'course-1',
        'teacher-1',
        false,
        { studentIds: ['stu-1', 'stu-2'] },
      );

      expect(result.success).toBe(true);
      expect(result.enrolledCount).toBe(2);
    });

    it('should enroll student via QR code token', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue({
        id: 'course-1',
        teacherId: 'teacher-1',
      });
      mockPrismaService.studentProfile.findFirst.mockResolvedValue({
        id: 'stu-qr-1',
        studentCode: 'STU-2026-QR01',
        user: { fullName: 'طالب مسح QR', phone: '01122334455' },
        gradeLevel: 'الصف الأول الثانوي',
      });
      mockPrismaService.courseEnrollment.upsert.mockResolvedValue({
        id: 'enr-qr-1',
      });
      mockPrismaService.courseAccess.upsert.mockResolvedValue({
        id: 'acc-qr-1',
      });

      const result = await service.enrollByQrToken(
        'course-1',
        'teacher-1',
        false,
        { qrToken: 'qr_tok_valid_student_123' },
      );

      expect(result.success).toBe(true);
      expect(result.student.fullName).toBe('طالب مسح QR');
    });
  });

  describe('Bunny Video Deletion & Failure Rollback Lifecycle', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should delete all Bunny videos and attachments when a course is deleted', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue({
        id: 'course-1',
        teacherId: 'teacher-1',
        coverImageUrl: 'courses/covers/cover.jpg',
      });
      mockPrismaService.courseLesson.findMany.mockResolvedValue([
        { bunnyVideoId: 'bunny-vid-1', videoAssetId: null, contentUrl: null },
        { bunnyVideoId: null, videoAssetId: 'bunny-vid-2', contentUrl: 'https://iframe.mediadelivery.net/embed/12345/33333333-3333-3333-3333-333333333333' },
      ]);
      mockPrismaService.lessonAttachment.findMany.mockResolvedValue([
        { fileKey: 'courses/attachments/file1.pdf', fileUrl: null },
      ]);
      mockPrismaService.course.delete.mockResolvedValue({ id: 'course-1' });

      await service.deleteCourse('course-1', 'teacher-1', false);

      expect(mockBunnyVideoService.deleteVideo).toHaveBeenCalledWith('bunny-vid-1');
      expect(mockBunnyVideoService.deleteVideo).toHaveBeenCalledWith('bunny-vid-2');
      expect(mockBunnyVideoService.deleteVideo).toHaveBeenCalledWith('33333333-3333-3333-3333-333333333333');
      expect(mockStorageService.deleteObject).toHaveBeenCalledWith('courses/attachments/file1.pdf');
      expect(mockStorageService.deleteObject).toHaveBeenCalledWith('courses/covers/cover.jpg');
      expect(mockPrismaService.course.delete).toHaveBeenCalledWith({ where: { id: 'course-1' } });
    });

    it('should delete all Bunny videos and attachments when a module is deleted', async () => {
      mockPrismaService.courseModule.findUnique.mockResolvedValue({
        id: 'mod-1',
        course: { teacherId: 'teacher-1' },
      });
      mockPrismaService.courseLesson.findMany.mockResolvedValue([
        { bunnyVideoId: 'bunny-mod-vid-1', videoAssetId: null, contentUrl: null },
      ]);
      mockPrismaService.lessonAttachment.findMany.mockResolvedValue([
        { fileKey: 'courses/attachments/mod-file.pdf', fileUrl: null },
      ]);
      mockPrismaService.courseModule.delete.mockResolvedValue({ id: 'mod-1' });

      await service.deleteModule('mod-1', 'teacher-1', false);

      expect(mockBunnyVideoService.deleteVideo).toHaveBeenCalledWith('bunny-mod-vid-1');
      expect(mockStorageService.deleteObject).toHaveBeenCalledWith('courses/attachments/mod-file.pdf');
      expect(mockPrismaService.courseModule.delete).toHaveBeenCalledWith({ where: { id: 'mod-1' } });
    });

    it('should delete Bunny video and attachments when a lesson is deleted', async () => {
      mockPrismaService.courseLesson.findUnique.mockResolvedValue({
        id: 'les-1',
        bunnyVideoId: 'bunny-les-vid-1',
        videoAssetId: 'bunny-les-vid-2',
        contentUrl: 'bunny:44444444-4444-4444-4444-444444444444',
        module: { course: { teacherId: 'teacher-1' } },
      });
      mockPrismaService.lessonAttachment.findMany.mockResolvedValue([
        { fileKey: 'courses/attachments/les-file.pdf', fileUrl: null },
      ]);
      mockPrismaService.courseLesson.delete.mockResolvedValue({ id: 'les-1' });

      await service.deleteLesson('les-1', 'teacher-1', false);

      expect(mockBunnyVideoService.deleteVideo).toHaveBeenCalledWith('bunny-les-vid-1');
      expect(mockBunnyVideoService.deleteVideo).toHaveBeenCalledWith('bunny-les-vid-2');
      expect(mockBunnyVideoService.deleteVideo).toHaveBeenCalledWith('44444444-4444-4444-4444-444444444444');
      expect(mockStorageService.deleteObject).toHaveBeenCalledWith('courses/attachments/les-file.pdf');
      expect(mockPrismaService.courseLesson.delete).toHaveBeenCalledWith({ where: { id: 'les-1' } });
    });

    it('should rollback and delete uploaded Bunny video when lesson creation fails', async () => {
      mockPrismaService.courseModule.findUnique.mockResolvedValue({
        id: 'mod-1',
        course: { teacherId: 'teacher-1' },
      });
      mockPrismaService.courseLesson.count.mockResolvedValue(0);
      mockPrismaService.courseLesson.create.mockRejectedValue(new Error('DB Constraint Failure'));

      await expect(
        service.createLesson('mod-1', 'teacher-1', false, {
          title: 'درس جديد',
          bunnyVideoId: '55555555-5555-5555-5555-555555555555',
          attachments: [
            { title: 'ملخص', fileUrl: 'https://r2/file.pdf', fileKey: 'courses/att.pdf' },
          ],
        }),
      ).rejects.toThrow('DB Constraint Failure');

      expect(mockBunnyVideoService.deleteVideo).toHaveBeenCalledWith('55555555-5555-5555-5555-555555555555');
      expect(mockStorageService.deleteObject).toHaveBeenCalledWith('courses/att.pdf');
    });

    it('should delete old Bunny video when updating a lesson with a new video', async () => {
      mockPrismaService.courseLesson.findUnique.mockResolvedValue({
        id: 'les-1',
        bunnyVideoId: 'old-bunny-vid-1',
        module: { course: { teacherId: 'teacher-1' } },
      });
      mockPrismaService.courseLesson.update.mockResolvedValue({
        id: 'les-1',
        bunnyVideoId: 'new-bunny-vid-2',
      });

      await service.updateLesson('les-1', 'teacher-1', false, {
        bunnyVideoId: 'new-bunny-vid-2',
      });

      expect(mockPrismaService.courseLesson.update).toHaveBeenCalled();
      expect(mockBunnyVideoService.deleteVideo).toHaveBeenCalledWith('old-bunny-vid-1');
      expect(mockBunnyVideoService.deleteVideo).not.toHaveBeenCalledWith('new-bunny-vid-2');
    });

    it('should rollback and delete newly uploaded Bunny video when lesson update fails', async () => {
      mockPrismaService.courseLesson.findUnique.mockResolvedValue({
        id: 'les-1',
        bunnyVideoId: 'old-bunny-vid-1',
        module: { course: { teacherId: 'teacher-1' } },
      });
      mockPrismaService.courseLesson.update.mockRejectedValue(new Error('Database update failed'));

      await expect(
        service.updateLesson('les-1', 'teacher-1', false, {
          bunnyVideoId: 'failed-new-bunny-vid-99',
        }),
      ).rejects.toThrow('Database update failed');

      expect(mockBunnyVideoService.deleteVideo).toHaveBeenCalledWith('failed-new-bunny-vid-99');
      expect(mockBunnyVideoService.deleteVideo).not.toHaveBeenCalledWith('old-bunny-vid-1');
    });
  });

  describe('getPublishedCatalog & getPublicCourseDetails', () => {
    it('should return published catalog with full modules, lessons, and free video preview URLs', async () => {
      const mockCourses = [
        {
          id: 'course-cat-1',
          title: 'كورس الجبر للثانوية العامة',
          description: 'شرح تفصيلي',
          status: CourseStatus.PUBLISHED,
          price: 150,
          coverImageUrl: 'https://cdn.example.com/cover.jpg',
          academicTerm: 'FIRST_TERM',
          gradeLevel: 'الصف الأول الثانوي',
          academicStage: 'SECONDARY',
          subject: 'الرياضيات',
          createdAt: new Date(),
          teacher: { user: { fullName: 'أ. طارق جاويش' } },
          modules: [
            {
              id: 'mod-1',
              title: 'الوحدة الأولى: المصفوفات',
              description: 'شرح المصفوفات',
              orderIndex: 1,
              lessons: [
                {
                  id: 'les-free-1',
                  title: 'مقدمة في المصفوفات',
                  description: 'شرح الدرس الأول',
                  summary: 'ملخص شامل',
                  orderIndex: 1,
                  videoDurationSeconds: 1200,
                  lessonType: 'VIDEO',
                  isPreview: true,
                  bunnyVideoId: 'bunny-preview-vid-1',
                  contentUrl: null,
                },
                {
                  id: 'les-locked-2',
                  title: 'ضرب المصفوفات',
                  description: 'شرح متقدم',
                  summary: 'ملخص',
                  orderIndex: 2,
                  videoDurationSeconds: 1800,
                  lessonType: 'VIDEO',
                  isPreview: false,
                  bunnyVideoId: 'bunny-locked-vid-2',
                  contentUrl: null,
                },
              ],
            },
          ],
        },
      ];

      mockPrismaService.course.findMany.mockResolvedValue(mockCourses);
      mockBunnyVideoService.getEmbedUrl.mockImplementation(
        (id: string) => `https://iframe.mediadelivery.net/embed/123/${id}`,
      );

      const result = await service.getPublishedCatalog({ limit: 10 });

      expect(result.data).toHaveLength(1);
      const course = result.data[0];
      expect(course.title).toBe('كورس الجبر للثانوية العامة');
      expect(course.hasFreeVideo).toBe(true);
      expect(course.freeVideoUrl).toBe(
        'https://iframe.mediadelivery.net/embed/123/bunny-preview-vid-1',
      );
      expect(course.totalLessons).toBe(2);
      expect(course.modules).toHaveLength(1);
      expect(course.modules[0].lessons).toHaveLength(2);
      expect(course.modules[0].lessons[0].isPreview).toBe(true);
      expect(course.modules[0].lessons[0].freeVideoUrl).toBe(
        'https://iframe.mediadelivery.net/embed/123/bunny-preview-vid-1',
      );
      expect(course.modules[0].lessons[1].isPreview).toBe(false);
      expect(course.modules[0].lessons[1].freeVideoUrl).toBeNull();
    });

    it('should return public course details for unauthenticated preview', async () => {
      const mockCourse = {
        id: 'course-pub-1',
        title: 'كورس التفاضل والتكامل',
        description: 'شرح التفاضل',
        status: CourseStatus.PUBLISHED,
        price: 200,
        coverImageUrl: 'https://cdn.example.com/cover2.jpg',
        academicTerm: 'FIRST_TERM',
        gradeLevel: 'الصف الثالث الثانوي',
        academicStage: 'SECONDARY',
        subject: 'الرياضيات',
        teacher: { user: { fullName: 'أ. محمد سعيد' } },
        modules: [
          {
            id: 'mod-1',
            title: 'الوحدة الأولى: نهايات الدوال',
            description: 'شرح النهايات',
            orderIndex: 1,
            lessons: [
              {
                id: 'les-free-10',
                title: 'مقدمة النهايات',
                description: 'معاينة مجانية',
                summary: 'ملخص',
                orderIndex: 1,
                videoDurationSeconds: 900,
                lessonType: 'VIDEO',
                isPreview: true,
                bunnyVideoId: 'bunny-preview-vid-10',
                contentUrl: null,
              },
            ],
          },
        ],
      };

      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockBunnyVideoService.getEmbedUrl.mockReturnValue(
        'https://iframe.mediadelivery.net/embed/123/bunny-preview-vid-10',
      );

      const result = await service.getPublicCourseDetails('course-pub-1');

      expect(result.id).toBe('course-pub-1');
      expect(result.hasFreeVideo).toBe(true);
      expect(result.freeVideoUrl).toBe(
        'https://iframe.mediadelivery.net/embed/123/bunny-preview-vid-10',
      );
      expect(result.modules[0].lessons[0].freeVideoUrl).toBe(
        'https://iframe.mediadelivery.net/embed/123/bunny-preview-vid-10',
      );
    });
  });

  describe('Vodafone Cash Course Subscription & Review Lifecycle', () => {
    it('should submit a subscription request in PENDING status with receipt and sender phone', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue({
        id: 'course-paid-1',
        title: 'شرح تفاضل 2ث',
        price: 500,
        status: CourseStatus.PUBLISHED,
        teacher: { user: { fullName: 'أ. أحمد غريب', phone: '01011111111' } },
      });

      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'student-uuid-1',
      });

      mockPrismaService.courseEnrollment.upsert.mockResolvedValue({
        id: 'enroll-req-1',
        courseId: 'course-paid-1',
        studentId: 'student-uuid-1',
        status: CourseEnrollmentStatus.PENDING,
        senderPhone: '01012345678',
        transferAmount: 500,
        receiptImageUrl: 'https://r2.el-awal.online/receipts/rec-1.jpg',
      });

      const res = await service.requestCourseSubscription('course-paid-1', 'student-uuid-1', {
        senderPhone: '01012345678',
        transferAmount: 500,
        receiptImageUrl: 'https://r2.el-awal.online/receipts/rec-1.jpg',
      });

      expect(res.status).toBe(CourseEnrollmentStatus.PENDING);
      expect(res.enrollmentId).toBe('enroll-req-1');
      expect(mockPrismaService.courseEnrollment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            status: CourseEnrollmentStatus.PENDING,
            senderPhone: '01012345678',
          }),
        }),
      );
    });

    it('should approve subscription request and activate course access', async () => {
      const mockEnrollment = {
        id: 'enroll-req-1',
        courseId: 'course-paid-1',
        studentId: 'student-uuid-1',
        status: CourseEnrollmentStatus.PENDING,
        course: { teacherId: 'teacher-uuid-1' },
        student: { user: { id: 'u-1', fullName: 'أحمد طارق' } },
      };

      mockPrismaService.courseEnrollment.findUnique.mockResolvedValue(mockEnrollment);
      mockPrismaService.courseEnrollment.update.mockResolvedValue({
        ...mockEnrollment,
        status: CourseEnrollmentStatus.ACTIVE,
      });
      mockPrismaService.courseAccess.upsert.mockResolvedValue({
        accessStatus: CourseAccessStatus.ACTIVE,
      });

      const res = await service.approveSubscriptionRequest('enroll-req-1', {
        id: 'teacher-uuid-1',
        role: UserRole.TEACHER,
        teacherProfileId: 'teacher-uuid-1',
      } as any);

      expect(res.status).toBe(CourseEnrollmentStatus.ACTIVE);
      expect(res.accessStatus).toBe(CourseAccessStatus.ACTIVE);
    });

    it('should reject subscription request and suspend access with reason', async () => {
      const mockEnrollment = {
        id: 'enroll-req-1',
        courseId: 'course-paid-1',
        studentId: 'student-uuid-1',
        status: CourseEnrollmentStatus.PENDING,
        course: { teacherId: 'teacher-uuid-1' },
      };

      mockPrismaService.courseEnrollment.findUnique.mockResolvedValue(mockEnrollment);
      mockPrismaService.courseEnrollment.update.mockResolvedValue({
        ...mockEnrollment,
        status: CourseEnrollmentStatus.DROPPED,
        rejectionReason: 'إيصال غير واضح',
      });
      mockPrismaService.courseAccess.updateMany.mockResolvedValue({ count: 1 });

      const res = await service.rejectSubscriptionRequest(
        'enroll-req-1',
        { id: 'teacher-uuid-1', role: UserRole.TEACHER, teacherProfileId: 'teacher-uuid-1' } as any,
        { rejectionReason: 'إيصال غير واضح' },
      );

      expect(res.status).toBe(CourseEnrollmentStatus.DROPPED);
      expect(res.rejectionReason).toBe('إيصال غير واضح');
    });

    it('should retrieve teacher subscriptions with pending and active lists', async () => {
      mockPrismaService.courseEnrollment.findMany.mockResolvedValue([
        {
          id: 'enr-1',
          courseId: 'c-1',
          studentId: 's-1',
          status: CourseEnrollmentStatus.PENDING,
          senderPhone: '01012345678',
          transferAmount: 250,
          receiptImageUrl: '/uploads/payment-receipts/rec1.jpg',
          paymentMethod: 'VODAFONE_CASH',
          enrolledAt: new Date('2026-09-01'),
          course: { id: 'c-1', title: 'كورس الجبر', price: 250, gradeLevel: 'ثانوية عامة', subject: 'رياضة' },
          student: {
            studentCode: 'STU-100',
            user: { id: 'u-1', fullName: 'أحمد محمود', phone: '01012345678', email: 'ahmed@test.com' },
          },
        },
        {
          id: 'enr-2',
          courseId: 'c-1',
          studentId: 's-2',
          status: CourseEnrollmentStatus.ACTIVE,
          senderPhone: '01099999999',
          transferAmount: 250,
          receiptImageUrl: null,
          paymentMethod: 'VODAFONE_CASH',
          enrolledAt: new Date('2026-08-20'),
          course: { id: 'c-1', title: 'كورس الجبر', price: 250, gradeLevel: 'ثانوية عامة', subject: 'رياضة' },
          student: {
            studentCode: 'STU-101',
            user: { id: 'u-2', fullName: 'سارة خالد', phone: '01099999999', email: 'sara@test.com' },
          },
        },
      ]);

      const res = await service.getTeacherSubscriptions({
        id: 'teacher-uuid-1',
        role: UserRole.TEACHER,
        teacherProfileId: 'teacher-uuid-1',
      } as any);

      expect(res.counts.pending).toBe(1);
      expect(res.counts.active).toBe(1);
      expect(res.pendingRequests[0].studentName).toBe('أحمد محمود');
      expect(res.pendingRequests[0].receiptImageUrl).toBe('/uploads/payment-receipts/rec1.jpg');
      expect(res.activeStudents[0].studentName).toBe('سارة خالد');
    });

    it('should cancel active student subscription and suspend course access', async () => {
      mockPrismaService.courseEnrollment.findUnique.mockResolvedValue({
        id: 'enroll-act-1',
        courseId: 'c-1',
        studentId: 's-1',
        status: CourseEnrollmentStatus.ACTIVE,
        course: { id: 'c-1', teacherId: 'teacher-uuid-1', title: 'كورس الجبر' },
        student: { id: 's-1', user: { id: 'u-1', fullName: 'أحمد محمود' } },
      });
      mockPrismaService.courseEnrollment.update.mockResolvedValue({
        id: 'enroll-act-1',
        status: CourseEnrollmentStatus.DROPPED,
        rejectionReason: 'تم استرداد المبلغ',
      });
      mockPrismaService.courseAccess.updateMany.mockResolvedValue({ count: 1 });

      const res = await service.cancelStudentSubscription(
        'enroll-act-1',
        { id: 'teacher-uuid-1', role: UserRole.TEACHER, teacherProfileId: 'teacher-uuid-1' } as any,
        'تم استرداد المبلغ',
      );

      expect(res.status).toBe(CourseEnrollmentStatus.DROPPED);
      expect(mockPrismaService.courseAccess.updateMany).toHaveBeenCalledWith({
        where: { enrollmentId: 'enroll-act-1' },
        data: { accessStatus: CourseAccessStatus.SUSPENDED },
      });
    });
  });
});
