import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { BunnyVideoService } from '../../../integrations/video/bunny-video.service';
import { CourseVideoService, generateBunnyEmbedTicket } from './course-video.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { CourseEnrollmentStatus, UserRole } from '@prisma/client';

@Injectable()
export class CourseAccessService {
  private readonly logger = new Logger(CourseAccessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bunnyVideoService: BunnyVideoService,
    private readonly videoService: CourseVideoService,
  ) {}

  /**
   * Asserts student enrollment or academic group access for a lesson.
   * Throws 403 Forbidden if not enrolled.
   */
  async assertStudentCourseAccess(lessonId: string, userId: string) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              include: {
                groupAccess: true,
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson [${lessonId}] not found`);
    }

    if (lesson.isPreview) {
      return lesson;
    }

    const course = lesson.module?.course;
    if (!course) {
      throw new NotFoundException(`Course for lesson [${lessonId}] not found`);
    }

    let studentProfile = await this.prisma.studentProfile
      .findUnique({
        where: { id: userId },
        include: { user: true, groupEnrollments: true },
      })
      .catch(() => null);

    if (!studentProfile) {
      studentProfile = await this.prisma.studentProfile
        .findFirst({
          where: {
            OR: [{ id: userId }, { user: { id: userId } }],
          },
          include: { user: true, groupEnrollments: true },
        })
        .catch(() => null);
    }

    if (studentProfile) {
      const enrollment = await this.prisma.courseEnrollment.findUnique({
        where: {
          courseId_studentId: {
            courseId: course.id,
            studentId: studentProfile.id,
          },
        },
      });

      if (enrollment && enrollment.status === CourseEnrollmentStatus.ACTIVE) {
        return lesson;
      }

      const studentGroupIds = studentProfile.groupEnrollments?.map((g: any) => g.groupId) || [];
      const courseGroupIds = course.groupAccess?.map((ga: any) => ga.groupId) || [];
      const hasMatchingGroup = studentGroupIds.some((gid: string) => courseGroupIds.includes(gid));
      if (hasMatchingGroup) {
        return lesson;
      }
    }

    throw new ForbiddenException('يجب الاشتراك في هذا الكورس أولاً لمشاهدة شرح هذا الدرس');
  }

  /**
   * Authorizes lesson streaming and returns video status, playback/embed URLs, and watermark.
   */
  async getLessonStreamAuth(lessonId: string, user: AuthenticatedUser) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              include: {
                groupAccess: true,
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
    const isTeacherOrSecretariat =
      user.role === UserRole.TEACHER ||
      user.role === UserRole.SECRETARIAT;

    let isAuthorized = isTeacherOrSecretariat || lesson.isPreview;

    let studentProfile: any = null;
    if (user.role === UserRole.STUDENT) {
      const studentId = user.studentProfileId || user.id;
      studentProfile = await this.prisma.studentProfile.findUnique({
        where: { id: studentId },
        include: { user: true, groupEnrollments: true },
      });

      if (!isAuthorized && studentProfile) {
        const enrollment = await this.prisma.courseEnrollment.findUnique({
          where: {
            courseId_studentId: {
              courseId: course.id,
              studentId: studentProfile.id,
            },
          },
        });

        if (enrollment && enrollment.status === CourseEnrollmentStatus.ACTIVE) {
          isAuthorized = true;
        } else {
          const studentGroupIds = studentProfile.groupEnrollments?.map((g: any) => g.groupId) || [];
          const courseGroupIds = course.groupAccess?.map((ga) => ga.groupId) || [];
          const hasMatchingGroup = studentGroupIds.some((gid: string) => courseGroupIds.includes(gid));
          if (hasMatchingGroup) {
            isAuthorized = true;
          }
        }
      }
    }

    if (!isAuthorized) {
      throw new ForbiddenException('يجب الاشتراك في هذا الكورس أولاً لمشاهدة شرح هذا الدرس');
    }

    const videoId = this.videoService.resolveLessonVideoId(lesson as any) || '';
    let embedUrl = '';
    let playbackUrl = '';
    let videoStatus: 'READY' | 'PROCESSING' | 'ERROR' = 'READY';
    let bunnyDetails: any = null;

    if (videoId) {
      try {
        bunnyDetails = await this.bunnyVideoService.getVideoDetails(videoId);
        if (bunnyDetails.status === 5 || bunnyDetails.status === 6) {
          videoStatus = 'ERROR';
        } else if (bunnyDetails.status === 4) {
          videoStatus = 'READY';
        } else if (
          bunnyDetails.status === 0 ||
          bunnyDetails.status === 1 ||
          bunnyDetails.status === 2 ||
          bunnyDetails.status === 3
        ) {
          videoStatus = 'PROCESSING';
        } else if (bunnyDetails.storageSize === 0 && bunnyDetails.duration === 0) {
          this.logger.warn(
            `Lesson [${lessonId}] references empty Bunny video [${videoId}] (status ${bunnyDetails.statusText}) - needs re-upload`,
          );
          videoStatus = 'ERROR';
        } else {
          videoStatus = 'READY';
        }

        if (bunnyDetails.duration > 0 && (!lesson.videoDurationSeconds || lesson.videoDurationSeconds === 0)) {
          this.prisma.courseLesson
            .update({ where: { id: lessonId }, data: { videoDurationSeconds: Math.round(bunnyDetails.duration) } })
            .catch((err) => this.logger.warn(`Failed to backfill duration for lesson [${lessonId}]`, err));
        }
      } catch (err) {
        if (err instanceof NotFoundException) {
          this.logger.warn(
            `Lesson [${lessonId}] references deleted/missing Bunny video [${videoId}] - clear and re-upload`,
          );
          videoStatus = 'ERROR';
        } else {
          videoStatus = 'READY';
        }
      }

      if (videoStatus !== 'ERROR') {
        playbackUrl = this.bunnyVideoService.generateSecurePlaybackUrl(videoId);
        embedUrl = this.bunnyVideoService.getEmbedUrl(videoId);
      }
    }

    const watermark = {
      studentName: studentProfile?.user?.fullName || user.fullName || user.email || 'طالب مسجل',
      studentPhone: studentProfile?.user?.phone || user.phone || '',
      studentCode: studentProfile?.studentCode || '',
    };

    return {
      lessonId: lesson.id,
      courseId: course.id,
      title: lesson.title,
      videoId,
      videoStatus,
      duration: bunnyDetails?.duration
        ? Math.round(bunnyDetails.duration)
        : (lesson.videoDurationSeconds || 0),
      libraryId: this.bunnyVideoService.getLibraryId(),
      embedUrl,
      playbackUrl,
      isPreview: lesson.isPreview,
      watermark,
    };
  }

  /**
   * Generates a cryptographically signed, short-lived Bunny Stream embed ticket for authenticated, enrolled students.
   */
  async getLessonStreamTicket(
    lessonId: string,
    user: AuthenticatedUser,
  ): Promise<{ embedUrl: string; expiresAt: number }> {
    if (user.role === UserRole.STUDENT) {
      await this.assertStudentCourseAccess(lessonId, user.id);
    }

    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson [${lessonId}] not found`);
    }

    const videoId = this.videoService.resolveLessonVideoId(lesson as any);
    if (!videoId || videoId.trim() === '') {
      throw new NotFoundException(
        `Bunny video ID not available for lesson [${lessonId}] - upload the video again`,
      );
    }

    const libraryId =
      process.env.BUNNY_STREAM_LIBRARY_ID ||
      this.bunnyVideoService.getLibraryId();
    const tokenSecurityKey =
      process.env.BUNNY_STREAM_TOKEN_KEY ||
      this.bunnyVideoService.getTokenSecurityKey();

    if (!libraryId || !tokenSecurityKey) {
      throw new NotFoundException(
        'Bunny Stream is not configured on the server (library / token key missing)',
      );
    }

    const ticket = generateBunnyEmbedTicket(libraryId, videoId, tokenSecurityKey, 7200);

    return {
      embedUrl: ticket.embedUrl,
      expiresAt: ticket.expires,
    };
  }
}
