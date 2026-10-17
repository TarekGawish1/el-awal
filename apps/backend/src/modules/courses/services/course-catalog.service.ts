import {
  Injectable,
  NotFoundException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CourseVideoService } from './course-video.service';
import { CourseCoreService } from './course-core.service';
import { CourseQueryDto } from '../dto/course-query.dto';
import { CourseStatus } from '@prisma/client';
import { CursorPaginationHelper } from '../../../common/pagination/cursor-pagination.helper';
import { createHash } from 'crypto';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';
import { MemoryCache } from '../../../common/utils/memory-cache.util';

@Injectable()
export class CourseCatalogService {
  private readonly logger = new Logger(CourseCatalogService.name);
  private readonly catalogCache = new MemoryCache(90, 100);

  constructor(
    private readonly prisma: PrismaService,
    private readonly videoService: CourseVideoService,
    private readonly coreService: CourseCoreService,
    @Optional() private readonly redisCache?: RedisCacheService,
  ) {}

  /**
   * Keyset cursor-paginated catalog of published courses with multi-criteria filtering.
   */
  async getPublishedCatalog(query: CourseQueryDto) {
    const queryHash = createHash('md5').update(JSON.stringify(query || {})).digest('hex');
    const redisKey = `courses:catalog:${queryHash}`;
    if (this.redisCache) {
      const cached = await this.redisCache.get<any>(redisKey);
      if (cached) return cached;
    }

    const cacheKey = `catalog:${queryHash}`;
    const result = await this.catalogCache.getOrSet(cacheKey, async () => {
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
          modules: {
            orderBy: { orderIndex: 'asc' },
            include: {
              lessons: {
                orderBy: { orderIndex: 'asc' },
                select: {
                  id: true,
                  title: true,
                  description: true,
                  summary: true,
                  orderIndex: true,
                  videoDurationSeconds: true,
                  lessonType: true,
                  isPreview: true,
                  bunnyVideoId: true,
                  contentUrl: true,
                },
              },
            },
          },
          _count: { select: { modules: true, enrollments: true } },
        },
      });

      const mappedCourses = courses.map((c) => {
        let totalLessons = 0;
        let firstFreeLesson: any = null;
        let firstAnyLessonWithVideo: any = null;

        const formattedModules = c.modules.map((m) => {
          const formattedLessons = m.lessons.map((l) => {
            totalLessons++;
            const embedUrl = this.videoService.resolveFreshLessonEmbed(l);

            if (embedUrl && !firstAnyLessonWithVideo) {
              firstAnyLessonWithVideo = { ...l, freeVideoUrl: embedUrl };
            }
            if (l.isPreview && embedUrl && !firstFreeLesson) {
              firstFreeLesson = { ...l, freeVideoUrl: embedUrl };
            }

            return {
              id: l.id,
              title: l.title,
              description: l.description,
              summary: l.summary,
              orderIndex: l.orderIndex,
              videoDurationSeconds: l.videoDurationSeconds,
              lessonType: l.lessonType,
              isPreview: l.isPreview,
              freeVideoUrl: l.isPreview ? embedUrl : null,
            };
          });

          return {
            id: m.id,
            title: m.title,
            description: m.description,
            orderIndex: m.orderIndex,
            lessonsCount: formattedLessons.length,
            lessons: formattedLessons,
          };
        });

        const previewLesson = firstFreeLesson || firstAnyLessonWithVideo;
        const hasFreeVideo = Boolean(previewLesson?.freeVideoUrl);

        return {
          id: c.id,
          title: c.title,
          description: c.description,
          subject: c.subject,
          gradeLevel: c.gradeLevel,
          academicStage: c.academicStage,
          academicYear: c.academicYear,
          academicTerm: c.academicTerm,
          price: c.price,
          coverImageUrl: c.coverImageUrl,
          hasCertificate: c.hasCertificate,
          createdAt: c.createdAt,
          teacher: c.teacher,
          modules: formattedModules,
          totalModules: formattedModules.length,
          totalLessons,
          hasFreeVideo,
          freeVideoLessonId: previewLesson?.id || null,
          freeVideoUrl: previewLesson?.freeVideoUrl || null,
        };
      });

      return CursorPaginationHelper.formatResponse(mappedCourses, limit);
    });

    if (this.redisCache && result) {
      await this.redisCache.set(redisKey, result, 300);
    }

    return result;
  }

  /**
   * Returns public course details with outline and signed preview video URLs.
   */
  async getPublicCourseDetails(courseId: string) {
    const redisKey = `courses:public:${courseId}`;
    if (this.redisCache) {
      const cached = await this.redisCache.get<any>(redisKey);
      if (cached) return cached;
    }

    const cacheKey = `course_public:${courseId}`;
    const result = await this.catalogCache.getOrSet(cacheKey, async () => {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        include: {
          teacher: {
            include: { user: { select: { fullName: true } } },
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
                  summary: true,
                  orderIndex: true,
                  videoDurationSeconds: true,
                  lessonType: true,
                  isPreview: true,
                  bunnyVideoId: true,
                  contentUrl: true,
                },
              },
            },
          },
          _count: { select: { modules: true, enrollments: true } },
        },
      });

      if (!course || course.status !== CourseStatus.PUBLISHED) {
        throw new NotFoundException(`Course [${courseId}] not found or not published`);
      }

      let totalLessons = 0;
      let firstFreeLesson: any = null;
      let firstAnyLessonWithVideo: any = null;

      const formattedModules = course.modules.map((m) => {
        const formattedLessons = m.lessons.map((l) => {
          totalLessons++;
          const embedUrl = this.videoService.resolveFreshLessonEmbed(l);

          if (embedUrl && !firstAnyLessonWithVideo) {
            firstAnyLessonWithVideo = { ...l, freeVideoUrl: embedUrl };
          }
          if (l.isPreview && embedUrl && !firstFreeLesson) {
            firstFreeLesson = { ...l, freeVideoUrl: embedUrl };
          }

          return {
            id: l.id,
            title: l.title,
            description: l.description,
            summary: l.summary,
            orderIndex: l.orderIndex,
            videoDurationSeconds: l.videoDurationSeconds,
            lessonType: l.lessonType,
            isPreview: l.isPreview,
            freeVideoUrl: l.isPreview ? embedUrl : null,
          };
        });

        return {
          id: m.id,
          title: m.title,
          description: m.description,
          orderIndex: m.orderIndex,
          lessonsCount: formattedLessons.length,
          lessons: formattedLessons,
        };
      });

      const previewLesson = firstFreeLesson || firstAnyLessonWithVideo;

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        subject: course.subject,
        gradeLevel: course.gradeLevel,
        academicStage: course.academicStage,
        academicYear: course.academicYear,
        academicTerm: course.academicTerm,
        price: course.price,
        coverImageUrl: course.coverImageUrl,
        previewVideoUrl: this.videoService.signPreviewVideoUrl(course.previewVideoUrl),
        hasCertificate: course.hasCertificate,
        createdAt: course.createdAt,
        teacher: course.teacher,
        modules: formattedModules,
        totalModules: formattedModules.length,
        totalLessons,
        hasFreeVideo: Boolean(previewLesson?.freeVideoUrl),
        freeVideoLessonId: previewLesson?.id || null,
        freeVideoUrl: previewLesson?.freeVideoUrl || null,
      };
    });

    if (this.redisCache && result) {
      await this.redisCache.set(redisKey, result, 3600);
    }

    return result;
  }
}
