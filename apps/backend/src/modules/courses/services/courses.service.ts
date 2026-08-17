import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  CourseProgressRepository,
  SyncProgressItemDto,
  SyncBatchResult,
} from '../repositories/course-progress.repository';
import { BunnyVideoService } from '../../../integrations/video/bunny-video.service';
import { StorageService } from '../../../integrations/storage/storage.service';
import { CreateCourseDto } from '../dto/create-course.dto';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { CreateModuleDto } from '../dto/create-module.dto';
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { CourseQueryDto } from '../dto/course-query.dto';
import { UpdateProgressDto } from '../dto/update-progress.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import {
  CourseStatus,
  CourseEnrollmentStatus,
  CourseAccessStatus,
  UserRole,
} from '@prisma/client';
import { CursorPaginationHelper } from '../../../common/pagination/cursor-pagination.helper';

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly progressRepository: CourseProgressRepository,
    private readonly bunnyVideoService: BunnyVideoService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Creates a new course scoped to the instructor.
   */
  async createCourse(teacherId: string, dto: CreateCourseDto) {
    return this.prisma.course.create({
      data: {
        title: dto.title,
        description: dto.description,
        subject: dto.subject,
        gradeLevel: dto.gradeLevel,
        academicStage: dto.academicStage,
        price: dto.price || 0.0,
        coverImageUrl: dto.coverImageUrl,
        teacherId,
        status: CourseStatus.DRAFT,
      },
    });
  }

  /**
   * Keyset cursor-paginated catalog of published courses with multi-criteria filtering.
   */
  async getPublishedCatalog(query: CourseQueryDto) {
    const limit = CursorPaginationHelper.sanitizeLimit(query.limit);
    const decodedCursor = query.cursor ? CursorPaginationHelper.decodeCursor(query.cursor) : null;
    const cursorFilter = CursorPaginationHelper.buildPrismaWhereClause(decodedCursor, 'DESC');

    const where: any = {
      status: CourseStatus.PUBLISHED,
      ...(query.gradeLevel ? { gradeLevel: query.gradeLevel } : {}),
      ...(query.academicStage ? { academicStage: query.academicStage } : {}),
      ...(query.subject ? { subject: query.subject } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(cursorFilter || {}),
    };

    const courses = await this.prisma.course.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        teacher: {
          include: { user: { select: { fullName: true } } },
        },
        _count: { select: { modules: true, enrollments: true } },
      },
    });

    return CursorPaginationHelper.formatResponse(courses, limit);
  }

  /**
   * Retrieves full course outline including ordered modules and lessons.
   * Scopes unpublished courses to the course creator teacher or secretariat.
   */
  async getCourseDetails(courseId: string, user?: AuthenticatedUser) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teacher: {
          include: { user: { select: { fullName: true, email: true } } },
        },
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                orderIndex: true,
                lessonType: true,
                videoDurationSeconds: true,
                isPreview: true,
                createdAt: true,
              },
            },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }

    if (user && course.status !== CourseStatus.PUBLISHED) {
      const isSecretariat = user.role === UserRole.SECRETARIAT;
      const isOwnerTeacher =
        user.role === UserRole.TEACHER &&
        (course.teacherId === user.teacherProfileId || course.teacherId === user.id);

      if (!isSecretariat && !isOwnerTeacher) {
        throw new NotFoundException(`Course [${courseId}] not found`);
      }
    }

    return course;
  }

  /**
   * Updates course metadata or transitions status (Draft -> Published -> Archived).
   */
  async updateCourse(
    courseId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: UpdateCourseDto,
  ) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }

    if (!isSecretariat && course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to modify this course');
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.subject ? { subject: dto.subject } : {}),
        ...(dto.gradeLevel ? { gradeLevel: dto.gradeLevel } : {}),
        ...(dto.academicStage !== undefined ? { academicStage: dto.academicStage } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.coverImageUrl !== undefined ? { coverImageUrl: dto.coverImageUrl } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
  }

  /**
   * Adds a module/chapter to a course with auto-computed order index.
   */
  async createModule(
    courseId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: CreateModuleDto,
  ) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }

    if (!isSecretariat && course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to manage this course curriculum');
    }

    let orderIndex = dto.orderIndex;
    if (!orderIndex) {
      const moduleCount = await this.prisma.courseModule.count({ where: { courseId } });
      orderIndex = moduleCount + 1;
    }

    return this.prisma.courseModule.create({
      data: {
        courseId,
        title: dto.title,
        description: dto.description,
        orderIndex,
      },
    });
  }

  /**
   * Creates a lesson in a module with DRM media identifiers and preview flags.
   */
  async createLesson(
    moduleId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: CreateLessonDto,
  ) {
    const module = await this.prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });

    if (!module) {
      throw new NotFoundException(`Course module [${moduleId}] not found`);
    }

    if (!isSecretariat && module.course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to manage this module');
    }

    let orderIndex = dto.orderIndex;
    if (!orderIndex) {
      const lessonCount = await this.prisma.courseLesson.count({ where: { moduleId } });
      orderIndex = lessonCount + 1;
    }

    return this.prisma.courseLesson.create({
      data: {
        moduleId,
        title: dto.title,
        description: dto.description,
        orderIndex,
        lessonType: dto.lessonType || 'VIDEO',
        bunnyVideoId: dto.bunnyVideoId,
        contentUrl: dto.contentUrl,
        videoDurationSeconds: dto.videoDurationSeconds,
        isPreview: dto.isFreePreview || false,
      },
    });
  }

  /**
   * Student course enrollment with atomic CourseEnrollment and CourseAccess provisioning.
   */
  async enrollCourse(courseId: string, studentId: string) {
    return this.prisma.$transaction(async (tx) => {
      const course = await tx.course.findUnique({ where: { id: courseId } });
      if (!course) {
        throw new NotFoundException(`Course [${courseId}] not found`);
      }

      if (course.status !== CourseStatus.PUBLISHED) {
        throw new BadRequestException('Cannot enroll in an unpublished or archived course');
      }

      const student = await tx.studentProfile.findUnique({ where: { id: studentId } });
      if (!student) {
        throw new NotFoundException(`Student [${studentId}] not found`);
      }

      // Upsert enrollment
      const enrollment = await tx.courseEnrollment.upsert({
        where: {
          courseId_studentId: {
            courseId,
            studentId,
          },
        },
        create: {
          courseId,
          studentId,
          status: CourseEnrollmentStatus.ACTIVE,
        },
        update: {
          status: CourseEnrollmentStatus.ACTIVE,
        },
      });

      // Upsert access entitlement
      const access = await tx.courseAccess.upsert({
        where: { enrollmentId: enrollment.id },
        create: {
          enrollmentId: enrollment.id,
          studentId,
          courseId,
          accessStatus: CourseAccessStatus.ACTIVE,
          validFrom: new Date(),
        },
        update: {
          accessStatus: CourseAccessStatus.ACTIVE,
        },
      });

      this.logger.log(`Student [${studentId}] enrolled in course [${courseId}]`);

      return {
        enrollmentId: enrollment.id,
        courseId,
        studentId,
        status: enrollment.status,
        accessStatus: access.accessStatus,
        enrolledAt: enrollment.enrolledAt,
      };
    });
  }

  /**
   * Retrieves all courses enrolled by the student with dynamic progress completion percentages.
   */
  async getMyCourses(studentId: string) {
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: {
        studentId,
        status: CourseEnrollmentStatus.ACTIVE,
      },
      include: {
        course: {
          include: {
            teacher: {
              include: { user: { select: { fullName: true } } },
            },
            _count: { select: { modules: true } },
          },
        },
        access: true,
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const results = await Promise.all(
      enrollments.map(async (e) => {
        const progressPercentage =
          await this.progressRepository.calculateCourseProgressPercentage(
            studentId,
            e.courseId,
          );

        const totalLessons = await this.prisma.courseLesson.count({
          where: { module: { courseId: e.courseId } },
        });

        return {
          courseId: e.course.id,
          title: e.course.title,
          description: e.course.description,
          subject: e.course.subject,
          gradeLevel: e.course.gradeLevel,
          coverImageUrl: e.course.coverImageUrl,
          teacherName: e.course.teacher.user.fullName,
          enrolledAt: e.enrolledAt,
          accessStatus: e.access?.accessStatus || CourseAccessStatus.ACTIVE,
          totalModules: e.course._count.modules,
          totalLessons,
          progressPercentage,
        };
      }),
    );

    return results;
  }

  /**
   * Secure Lesson Viewer:
   * 1. Verifies preview flag, active access entitlement, or teacher ownership.
   * 2. Issues signed time-limited Bunny Stream DRM HLS URLs or Cloudflare R2 download links.
   * 3. Returns student resume position.
   */
  async getLessonViewer(lessonId: string, user: AuthenticatedUser) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              include: {
                teacher: true,
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson [${lessonId}] not found`);
    }

    const course = lesson.module.course;
    const studentId = user.studentProfileId || user.id;

    // Authorization verification
    let isAuthorized = false;

    if (lesson.isPreview) {
      isAuthorized = true;
    } else if (
      user.role === UserRole.TEACHER &&
      (course.teacherId === user.teacherProfileId || course.teacherId === user.id)
    ) {
      isAuthorized = true;
    } else if (user.role === UserRole.SECRETARIAT) {
      isAuthorized = true;
    } else if (user.role === UserRole.STUDENT || user.studentProfileId) {
      const access = await this.prisma.courseAccess.findFirst({
        where: {
          courseId: course.id,
          studentId,
          accessStatus: CourseAccessStatus.ACTIVE,
          OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
        },
      });

      if (access) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw new ForbiddenException(
        'Active course enrollment or entitlement is required to access this lesson material',
      );
    }

    // Media Token / Signed URLs Generation
    let videoPlayerUrl: string | null = null;
    let documentDownloadUrl: string | null = null;

    if (lesson.lessonType === 'VIDEO' && lesson.bunnyVideoId) {
      videoPlayerUrl = await this.bunnyVideoService.generateSecurePlaybackUrl(
        lesson.bunnyVideoId,
        7200, // 2 hours
      );
    }

    if (lesson.lessonType === 'DOCUMENT' && lesson.contentUrl) {
      documentDownloadUrl = await this.storageService.generatePresignedDownloadUrl(
        lesson.contentUrl,
        3600, // 1 hour
      );
    }

    // Retrieve Student's existing playback progress
    let lastPositionSeconds = 0;
    let isCompleted = false;

    if (user.role === UserRole.STUDENT || user.studentProfileId) {
      const progress = await this.prisma.courseProgress.findUnique({
        where: {
          lessonId_studentId: {
            lessonId: lesson.id,
            studentId,
          },
        },
      });

      if (progress) {
        lastPositionSeconds = progress.lastPositionSeconds;
        isCompleted = progress.isCompleted;
      }
    }

    return {
      lessonId: lesson.id,
      moduleId: lesson.moduleId,
      courseId: course.id,
      courseTitle: course.title,
      title: lesson.title,
      description: lesson.description,
      lessonType: lesson.lessonType,
      isPreview: lesson.isPreview,
      videoDurationSeconds: lesson.videoDurationSeconds,
      videoPlayerUrl,
      documentDownloadUrl,
      lastPositionSeconds,
      isCompleted,
    };
  }

  /**
   * Real-time heartbeat lesson progress updater.
   */
  async updateLessonProgress(
    studentId: string,
    lessonId: string,
    dto: UpdateProgressDto,
  ) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson [${lessonId}] not found`);
    }

    const courseId = lesson.module.courseId;

    const progress = await this.progressRepository.upsertRealtimeProgress(
      studentId,
      lessonId,
      courseId,
      dto.lastPositionSeconds,
      dto.isCompleted || false,
    );

    const overallCourseCompletionPercentage =
      await this.progressRepository.calculateCourseProgressPercentage(
        studentId,
        courseId,
      );

    return {
      lessonId,
      courseId,
      lastPositionSeconds: progress.lastPositionSeconds,
      isCompleted: progress.isCompleted,
      overallCourseCompletionPercentage,
      lastSyncedAt: progress.lastSyncedAt,
    };
  }

  /**
   * Delegates offline batch intake to CourseProgressRepository after validating lesson-course integrity and student entitlements.
   */
  async applyMonotonicProgressBatch(
    studentId: string,
    items: SyncProgressItemDto[],
  ): Promise<SyncBatchResult> {
    if (!items || items.length === 0) {
      return {
        syncedCount: 0,
        processedOperationIds: [],
        courseId: '',
        overallCourseCompletionPercentage: 0,
      };
    }

    const lessonIds = items.map((i) => i.lessonId);
    const lessons = await this.prisma.courseLesson.findMany({
      where: { id: { in: lessonIds } },
      include: { module: true },
    });

    const lessonMap = new Map(lessons.map((l) => [l.id, l.module.courseId]));

    for (const item of items) {
      const actualCourseId = lessonMap.get(item.lessonId);
      if (!actualCourseId) {
        throw new NotFoundException(`Lesson [${item.lessonId}] not found`);
      }
      if (actualCourseId !== item.courseId) {
        throw new BadRequestException(
          `Lesson [${item.lessonId}] belongs to course [${actualCourseId}], not [${item.courseId}]`,
        );
      }
    }

    // Verify student course entitlement for courses in batch
    const uniqueCourseIds = [...new Set(items.map((i) => i.courseId))];
    for (const cId of uniqueCourseIds) {
      const hasEnrollment = await this.prisma.courseEnrollment.findFirst({
        where: {
          studentId,
          courseId: cId,
          status: CourseEnrollmentStatus.ACTIVE,
        },
      });

      const hasAccess = await this.prisma.courseAccess.findFirst({
        where: {
          studentId,
          courseId: cId,
          accessStatus: 'ACTIVE',
          OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
        },
      });

      if (!hasEnrollment && !hasAccess) {
        throw new ForbiddenException(
          `Student is not enrolled or entitled to course [${cId}]`,
        );
      }
    }

    return this.progressRepository.syncBatch(studentId, items);
  }
}
