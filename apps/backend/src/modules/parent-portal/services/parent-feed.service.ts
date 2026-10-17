import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
import { CourseEnrollmentStatus } from '@prisma/client';
import { CursorPaginationHelper } from '../../../common/pagination/cursor-pagination.helper';
import {
  resolveOfficialSubmission,
  groupSubmissionsByAssessment,
} from '../../assessments/utils/submission-grade.util';
import { ParentChildrenService } from './parent-children.service';

@Injectable()
export class ParentFeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parentChildrenService: ParentChildrenService,
  ) {}

  /**
   * Keyset cursor-paginated attendance records for a linked child.
   */
  async getStudentAttendance(
    parentId: string,
    studentId: string,
    query: CursorPaginationDto,
  ) {
    await this.parentChildrenService.verifyGuardianLink(parentId, studentId);

    const limit = CursorPaginationHelper.sanitizeLimit(query.limit);
    const decodedCursor = query.cursor
      ? CursorPaginationHelper.decodeCursor(query.cursor)
      : null;
    const cursorFilter = CursorPaginationHelper.buildPrismaWhereClause(
      decodedCursor,
      'DESC',
    );

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        studentId,
        ...(cursorFilter || {}),
      },
      orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        session: {
          include: {
            group: { select: { id: true, name: true, gradeLevel: true } },
          },
        },
      },
    });

    const formatted = records.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      sessionDate: r.session.sessionDate,
      topic: r.session.topic,
      groupName: r.session.group.name,
      status: r.status,
      recordingMethod: r.recordingMethod,
      recordedAt: r.recordedAt,
      createdAt: r.recordedAt,
      notes: r.notes,
    }));

    return CursorPaginationHelper.formatResponse(formatted, limit);
  }

  /**
   * Comprehensive list of assessments, scores, and instructor feedback for a child.
   */
  async getStudentAssessments(parentId: string, studentId: string) {
    await this.parentChildrenService.verifyGuardianLink(parentId, studentId);

    const submissions = await this.prisma.assessmentSubmission.findMany({
      where: { studentId },
      orderBy: { attemptNumber: 'asc' },
      include: {
        assessment: {
          include: {
            teacher: {
              include: { user: { select: { fullName: true } } },
            },
          },
        },
      },
    });

    const byAssessment = groupSubmissionsByAssessment(submissions);
    const rows = [...byAssessment.values()].map((attempts) => {
      const official = resolveOfficialSubmission(attempts)!;
      const passingScore = official.assessment.passingScore
        ? Number(official.assessment.passingScore)
        : null;
      const officialScore =
        official.scoreObtained != null ? Number(official.scoreObtained) : null;

      return {
        submissionId: official.id,
        assessmentId: official.assessmentId,
        title: official.assessment.title,
        type: official.assessment.type,
        teacherName: official.assessment.teacher.user.fullName,
        status: official.status,
        scoreObtained: officialScore,
        totalScore: Number(official.assessment.totalScore),
        passingScore,
        isPassed:
          officialScore != null && passingScore != null
            ? officialScore >= passingScore
            : null,
        submittedAt: official.submittedAt,
        gradedAt: official.gradedAt,
        teacherFeedback: official.teacherFeedback,
        attemptCount: attempts.length,
        attempts: attempts.map((a) => ({
          attemptNumber: a.attemptNumber,
          status: a.status,
          scoreObtained: a.scoreObtained != null ? Number(a.scoreObtained) : null,
          submittedAt: a.submittedAt,
          gradedAt: a.gradedAt,
        })),
      };
    });

    return rows.sort(
      (a, b) => b.submittedAt.getTime() - a.submittedAt.getTime(),
    );
  }

  /**
   * Enrolled online course progress overview for a child.
   */
  async getStudentCourses(parentId: string, studentId: string) {
    await this.parentChildrenService.verifyGuardianLink(parentId, studentId);

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
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const courseIds = enrollments.map((e) => e.courseId);

    const totalLessonsByCourse = new Map<string, number>();
    for (const cid of courseIds) {
      totalLessonsByCourse.set(cid, 0);
    }

    if (courseIds.length > 0 && typeof this.prisma.courseLesson?.findMany === 'function') {
      try {
        const lessons = await this.prisma.courseLesson.findMany({
          where: { module: { courseId: { in: courseIds } } },
          select: { id: true, module: { select: { courseId: true } } },
        });
        for (const l of lessons) {
          const cid = l.module.courseId;
          totalLessonsByCourse.set(cid, (totalLessonsByCourse.get(cid) || 0) + 1);
        }
      } catch {
        // Retain default 0 counts
      }
    }

    const completedLessonsByCourse = new Map<string, number>();
    for (const cid of courseIds) {
      completedLessonsByCourse.set(cid, 0);
    }

    if (courseIds.length > 0 && typeof this.prisma.courseProgress?.groupBy === 'function') {
      try {
        const progressGroups = await this.prisma.courseProgress.groupBy({
          by: ['courseId'],
          where: {
            studentId,
            courseId: { in: courseIds },
            isCompleted: true,
          },
          _count: { _all: true },
        });
        for (const pg of progressGroups) {
          if (pg.courseId) {
            completedLessonsByCourse.set(
              pg.courseId,
              (pg as any)._count?._all ?? (pg as any)._count ?? 0,
            );
          }
        }
      } catch {
        try {
          if (typeof this.prisma.courseProgress?.findMany === 'function') {
            const list = await this.prisma.courseProgress.findMany({
              where: {
                studentId,
                courseId: { in: courseIds },
                isCompleted: true,
              },
              select: { courseId: true },
            });
            for (const item of list) {
              if (item.courseId) {
                completedLessonsByCourse.set(
                  item.courseId,
                  (completedLessonsByCourse.get(item.courseId) || 0) + 1,
                );
              }
            }
          }
        } catch {
          // Retain default 0 counts
        }
      }
    }

    return enrollments.map((e) => {
      const totalLessons = totalLessonsByCourse.get(e.courseId) ?? 0;
      const completedLessons = completedLessonsByCourse.get(e.courseId) ?? 0;
      const progressPercentage =
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      return {
        courseId: e.course.id,
        title: e.course.title,
        subject: e.course.subject,
        gradeLevel: e.course.gradeLevel,
        teacherName: e.course.teacher.user.fullName,
        enrolledAt: e.enrolledAt,
        totalModules: e.course._count.modules,
        totalLessons,
        completedLessons,
        progressPercentage,
      };
    });
  }
}
