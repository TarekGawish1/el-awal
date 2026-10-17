import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../core/database/prisma.service";

export interface CourseEngagementStats {
  courseId: string;
  courseTitle: string;
  totalEnrolled: number;
  totalLessons: number;
  completedLessonsCount: number;
  avgCompletionRate: number;
}

@Injectable()
export class CourseAnalyticsService {
  private readonly logger = new Logger(CourseAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  public async getCourseEngagementOverview(
    teacherId?: string,
  ): Promise<CourseEngagementStats[]> {
    const courses = await this.prisma.course.findMany({
      where: {
        ...(teacherId ? { teacherId } : {}),
      },
      include: {
        modules: {
          include: {
            lessons: { select: { id: true } },
          },
        },
        enrollments: { select: { id: true } },
      },
      take: 50,
    });

    const results: CourseEngagementStats[] = [];

    for (const c of courses) {
      const lessonIds = c.modules.flatMap((m) => m.lessons.map((l) => l.id));
      const totalLessons = lessonIds.length;
      const totalEnrolled = c.enrollments?.length || 0;

      let completedLessonsCount = 0;
      if (lessonIds.length > 0 && typeof this.prisma.courseProgress?.count === 'function') {
        completedLessonsCount = await this.prisma.courseProgress.count({
          where: {
            lessonId: { in: lessonIds },
            isCompleted: true,
          },
        }).catch(() => 0);
      }

      const maxPossibleCompletions = totalLessons * Math.max(1, totalEnrolled);
      const avgCompletionRate =
        maxPossibleCompletions > 0
          ? Math.round((completedLessonsCount / maxPossibleCompletions) * 100)
          : 0;

      results.push({
        courseId: c.id,
        courseTitle: c.title,
        totalEnrolled,
        totalLessons,
        completedLessonsCount,
        avgCompletionRate,
      });
    }

    return results;
  }

  public async getLessonWatchTimeStats(courseId: string) {
    const lessons = await this.prisma.courseLesson.findMany({
      where: { module: { courseId } },
      select: {
        id: true,
        title: true,
        videoDurationSeconds: true,
      },
    });

    const lessonIds = lessons.map((l) => l.id);
    const progressRecords = await this.prisma.courseProgress.findMany({
      where: { lessonId: { in: lessonIds } },
      select: {
        lessonId: true,
        lastPositionSeconds: true,
        isCompleted: true,
      },
    });

    const map = new Map<string, { totalWatchTime: number; completedCount: number }>();
    for (const p of progressRecords) {
      if (!map.has(p.lessonId)) {
        map.set(p.lessonId, { totalWatchTime: 0, completedCount: 0 });
      }
      const entry = map.get(p.lessonId)!;
      entry.totalWatchTime += p.lastPositionSeconds || 0;
      if (p.isCompleted) entry.completedCount++;
    }

    return lessons.map((l) => ({
      lessonId: l.id,
      title: l.title,
      durationMinutes: Math.round((l.videoDurationSeconds || 0) / 60),
      totalWatchTimeMinutes: Math.round((map.get(l.id)?.totalWatchTime || 0) / 60),
      completionsCount: map.get(l.id)?.completedCount || 0,
    }));
  }
}
