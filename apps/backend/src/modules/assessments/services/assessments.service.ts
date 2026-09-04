import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  AssessmentCourseLinkScope,
  CreateAssessmentDto,
} from '../dto/create-assessment.dto';
import { SubmitAssessmentDto } from '../dto/submit-assessment.dto';
import { SubmitHomeworkDto } from '../dto/submit-homework.dto';
import { GradeSubmissionDto } from '../dto/grade-submission.dto';
import { AssessmentQueryDto } from '../dto/assessment-query.dto';
import { UpdateAssessmentDto } from '../dto/update-assessment.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import {
  QuestionType,
  SubmissionStatus,
  UserRole,
  GroupEnrollmentStatus,
  CourseEnrollmentStatus,
  AssessmentType,
  ExamTimingType,
  NotificationChannel,
  NotificationType,
} from '@prisma/client';
import { CursorPaginationHelper } from '../../../common/pagination/cursor-pagination.helper';
import { resolveOfficialSubmission } from '../utils/submission-grade.util';
import {
  computeEffectiveDueDate,
  SessionForDeadline,
} from '../utils/effective-due-date.util';
import { NotificationsService } from '../../notifications/services/notifications.service';

@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  /**
   * Authoring Pipeline for Exam / Homework creation with embedded questions.
   */
  async createAssessment(
    teacherId: string,
    isSecretariat: boolean,
    dto: CreateAssessmentDto,
  ) {
    const logicalType = dto.assessmentType || dto.type;
    if (!logicalType) {
      throw new BadRequestException('Assessment type is required');
    }

    // Keep the existing API/storage values working while exposing the clearer
    // HOMEWORK and QUIZ names to newer clients.
    const storedType =
      logicalType === AssessmentType.HOMEWORK
        ? AssessmentType.ASSIGNMENT
        : logicalType === AssessmentType.QUIZ
          ? AssessmentType.EXAM
          : logicalType;
    const deadline = dto.deadline || dto.dueDate;
    const storedAssessmentType =
      logicalType === AssessmentType.ASSIGNMENT
        ? AssessmentType.HOMEWORK
        : logicalType;

    // 1. Validate resource ownership and consistency
    if (!isSecretariat) {
      if (dto.groupId) {
        const group = await this.prisma.academicGroup.findUnique({
          where: { id: dto.groupId },
        });
        if (!group) throw new NotFoundException(`Group [${dto.groupId}] not found`);
        if (group.teacherId !== teacherId) {
          throw new ForbiddenException('You do not own this academic group');
        }
      }

      if (dto.courseId) {
        const course = await this.prisma.course.findUnique({
          where: { id: dto.courseId },
        });
        if (!course) throw new NotFoundException(`Course [${dto.courseId}] not found`);
        if (course.teacherId !== teacherId) {
          throw new ForbiddenException('You do not own this course');
        }
      }
    }

    if (dto.lessonId && dto.courseId) {
      const lesson = await this.prisma.courseLesson.findUnique({
        where: { id: dto.lessonId },
        include: { module: true },
      });
      if (!lesson || lesson.module.courseId !== dto.courseId) {
        throw new BadRequestException('Lesson does not belong to the specified course');
      }
    }

    if (dto.courseLinkScope && !dto.courseId) {
      throw new BadRequestException('A course is required to link the assessment');
    }

    if (dto.courseLinkScope === AssessmentCourseLinkScope.UNIT) {
      if (!dto.moduleId) {
        throw new BadRequestException('A module is required to link a unit assessment');
      }

      const courseModule = await this.prisma.courseModule.findUnique({
        where: { id: dto.moduleId },
      });
      if (!courseModule || courseModule.courseId !== dto.courseId) {
        throw new BadRequestException('Module does not belong to the specified course');
      }
    } else if (dto.courseLinkScope === AssessmentCourseLinkScope.LESSON) {
      if (!dto.lessonId) {
        throw new BadRequestException('A lesson ID is required to link a lesson assessment');
      }

      const courseLesson = await this.prisma.courseLesson.findUnique({
        where: { id: dto.lessonId },
        include: { module: true },
      });
      if (!courseLesson || courseLesson.module.courseId !== dto.courseId) {
        throw new BadRequestException('Lesson does not belong to the specified course');
      }
    }

    // 2. Verify sum of question points matches total assessment score
    const totalCalculated = dto.questions.reduce(
      (sum, q) => sum + Number(q.points),
      0,
    );

    if (Math.abs(totalCalculated - Number(dto.totalScore)) > 0.01) {
      throw new BadRequestException(
        `Sum of question points (${totalCalculated}) does not match declared totalScore (${dto.totalScore})`,
      );
    }

    // 3. Determine if assessment is 100% auto-gradable (no subjective essays)
    const isAutoGraded = dto.questions.every(
      (q) =>
        q.questionType === QuestionType.MULTIPLE_CHOICE ||
        q.questionType === QuestionType.TRUE_FALSE,
    );

    const rawStartTime = dto.startTime || dto.startDate;
    const rawEndTime = dto.endTime || dto.deadline || dto.dueDate;
    const startTimeDate = rawStartTime ? new Date(rawStartTime) : null;
    const endTimeDate = rawEndTime ? new Date(rawEndTime) : null;
    const timingType =
      dto.timingType ||
      (storedType === AssessmentType.EXAM
        ? ExamTimingType.FIXED_SESSION
        : undefined);

    const assessment = await this.prisma.$transaction(async (tx) => {
      const assessment = await tx.assessment.create({
        data: {
          id: dto.id || undefined,
          title: dto.title,
          description: dto.description,
          type: storedType,
          assessmentType: storedAssessmentType,
          timingType,
          totalScore: dto.totalScore,
          passingScore: dto.passingScore,
          durationMinutes: dto.durationMinutes,
          startTime: startTimeDate,
          endTime: endTimeDate,
          startDate: startTimeDate,
          dueDate: endTimeDate,
          deadline: endTimeDate,
          academicStage: dto.academicStage,
          gradeLevel: dto.gradeLevel,
          groupId: dto.groupId,
          courseId: dto.courseId,
          lessonId: dto.lessonId,
          isAutoGraded,
          isPublished: dto.isPublished ?? true,
          allowMultipleAttempts: dto.allowMultipleAttempts ?? false,
          teacherId,
          targetGroups: dto.targetGroupIds?.length ? {
            connect: dto.targetGroupIds.map(id => ({ id }))
          } : undefined,
        },
      });

      const questionData = dto.questions.map((q) => ({
        assessmentId: assessment.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        questionType: q.questionType,
        optionsData: q.optionsData ? q.optionsData : undefined,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        imageUrl: q.imageUrl,
        points: q.points,
      }));

      await tx.assessmentQuestion.createMany({
        data: questionData,
      });

      if (dto.courseLinkScope === AssessmentCourseLinkScope.COURSE) {
        await tx.course.update({
          where: { id: dto.courseId! },
          data: { courseQuizId: assessment.id },
        });
      } else if (dto.courseLinkScope === AssessmentCourseLinkScope.UNIT) {
        await tx.courseModule.update({
          where: { id: dto.moduleId! },
          data: { unitQuizId: assessment.id },
        });
      } else if (dto.courseLinkScope === AssessmentCourseLinkScope.LESSON && dto.lessonId) {
        await tx.courseLesson.update({
          where: { id: dto.lessonId },
          data: { lessonQuizId: assessment.id },
        });
      }

      this.logger.log(
        `Created assessment [${assessment.id}] with ${dto.questions.length} questions`,
      );

      return {
        ...assessment,
        totalQuestions: dto.questions.length,
      };
    });

    if (assessment.isPublished) {
      await this.notifyAssessmentPublished(assessment);
    }

    return assessment;
  }

  /**
   * Keyset cursor-paginated list of assessments with course, group, and publication status filters.
   */
  async getAssessments(query: AssessmentQueryDto, user: AuthenticatedUser) {
    const limit = CursorPaginationHelper.sanitizeLimit(query.limit);
    const decodedCursor = query.cursor
      ? CursorPaginationHelper.decodeCursor(query.cursor)
      : null;
    const cursorFilter = CursorPaginationHelper.buildPrismaWhereClause(
      decodedCursor,
      'DESC',
    );

    const where: any = {
      ...(query.groupId ? { groupId: query.groupId } : {}),
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.isPublished !== undefined
        ? { isPublished: query.isPublished }
        : {}),
      ...(cursorFilter || {}),
    };

    if (user.role === UserRole.STUDENT) {
      where.isPublished = true;
      const studentId = user.studentProfileId || user.id;
      // Students only see physical (onsite) group exams: strictly exclude
      // online course / lesson quizzes and only surface assessments linked to a
      // physical group the student is actively enrolled in.
      where.lessonId = null;
      where.courseId = null;
      where.OR = [
        { group: { enrollments: { some: { studentId, status: GroupEnrollmentStatus.ACTIVE } } } },
        { targetGroups: { some: { enrollments: { some: { studentId, status: GroupEnrollmentStatus.ACTIVE } } } } },
      ];
    } else if (user.role === UserRole.PARENT) {
      where.isPublished = true;
      const parentId = user.parentProfileId || user.id;
      where.OR = [
        { group: { enrollments: { some: { status: GroupEnrollmentStatus.ACTIVE, student: { parentLinks: { some: { parentId } } } } } } },
        { targetGroups: { some: { enrollments: { some: { status: GroupEnrollmentStatus.ACTIVE, student: { parentLinks: { some: { parentId } } } } } } } },
        { course: { enrollments: { some: { status: CourseEnrollmentStatus.ACTIVE, student: { parentLinks: { some: { parentId } } } } } } },
      ];
    } else if (user.role === UserRole.TEACHER) {
      const teacherId = user.teacherProfileId || user.id;
      where.teacherId = teacherId;
    }

    if (query.academicYear || query.academicTerm) {
      where.AND = where.AND || [];
      const periodConditions: any[] = [];

      // Matches group
      periodConditions.push({
        group: {
          ...(query.academicYear ? { academicYear: query.academicYear } : {}),
          ...(query.academicTerm ? { academicTerm: query.academicTerm } : {}),
        },
      });

      // Matches targetGroups
      periodConditions.push({
        targetGroups: {
          some: {
            ...(query.academicYear ? { academicYear: query.academicYear } : {}),
            ...(query.academicTerm ? { academicTerm: query.academicTerm } : {}),
          },
        },
      });

      // Matches course
      periodConditions.push({
        course: {
          ...(query.academicYear ? { academicYear: query.academicYear } : {}),
          ...(query.academicTerm ? { academicTerm: query.academicTerm } : {}),
        },
      });

      where.AND.push({ OR: periodConditions });
    }

    const assessments = await this.prisma.assessment.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        teacher: {
          include: { user: { select: { fullName: true } } },
        },
        group: { select: { id: true, name: true, academicYear: true, academicTerm: true } },
        targetGroups: { select: { id: true, name: true, academicYear: true, academicTerm: true } },
        course: { select: { id: true, title: true, academicYear: true, academicTerm: true } },
        _count: { select: { questions: true, submissions: true } },
      },
    });

    // Students see session-linked homework at its effective deadline (next
    // session), so expired-by-record homework stays visible while actionable.
    if (user.role === UserRole.STUDENT) {
      await this.maybeApplyEffectiveDueDates(assessments as any[]);
    }

    return CursorPaginationHelper.formatResponse(assessments, limit);
  }

  /**
   * Overrides `dueDate` on session-linked homework (ASSIGNMENT) rows with the
   * computed effective deadline. Batched per involved group to keep it cheap.
   */
  private async maybeApplyEffectiveDueDates(assessments: any[]) {
    const groupIds = [
      ...new Set(
        assessments
          .filter((a) => a?.type === 'ASSIGNMENT' && a.dueDate && (a.groupId || a.targetGroups?.[0]?.id))
          .map((a) => a.groupId || a.targetGroups?.[0]?.id),
      ),
    ];
    if (groupIds.length === 0) return;

    const sessions = await this.prisma.lessonSession.findMany({
      where: { groupId: { in: groupIds } },
      select: {
        groupId: true,
        sessionDate: true,
        startTime: true,
        endTime: true,
        isCancelled: true,
      },
      orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
    });

    for (const a of assessments) {
      const gId = a?.groupId || a?.targetGroups?.[0]?.id;
      if (a?.type !== 'ASSIGNMENT' || !a.dueDate || !gId) continue;
      const groupSessions: SessionForDeadline[] = sessions.filter(
        (s) => s.groupId === gId,
      );
      a.dueDate = computeEffectiveDueDate(a.type, a.dueDate, groupSessions);
    }
  }

  /**
   * Resolves the effective deadline for a single student-visible assessment.
   */
  private async resolveEffectiveDueDate(
    assessment: { type: string; dueDate: Date | null; groupId?: string | null; targetGroups?: any[] },
  ): Promise<Date | null> {
    const effectiveGroupId = assessment.groupId || assessment.targetGroups?.[0]?.id;
    if (assessment.type !== 'ASSIGNMENT' || !assessment.dueDate || !effectiveGroupId) {
      return assessment.dueDate;
    }
    const sessions = await this.prisma.lessonSession.findMany({
      where: { groupId: effectiveGroupId },
      select: {
        sessionDate: true,
        startTime: true,
        endTime: true,
        isCancelled: true,
      },
      orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
    });
    return computeEffectiveDueDate(assessment.type, assessment.dueDate, sessions);
  }

  /**
   * Secure Assessment Retrieval:
   * Redacts correctAnswer and explanation for students to prevent client-side answer leaking.
   */
  async getAssessmentById(assessmentId: string, user: AuthenticatedUser) {
    const studentId = user.studentProfileId || user.id;

    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        teacher: {
          include: { user: { select: { fullName: true } } },
        },
        group: {
          include: {
            enrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } },
          },
        },
        targetGroups: {
          include: {
            enrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } },
          },
        },
        course: {
          include: {
            enrollments: { where: { status: CourseEnrollmentStatus.ACTIVE } },
          },
        },
        courseFinalQuizOf: {
          select: {
            id: true,
            enforceSequentialLessons: true,
            modules: {
              include: {
                unitQuiz: { select: { id: true } },
                lessons: { select: { id: true } },
              },
            },
          },
        },
        unitQuizOf: {
          select: {
            id: true,
            courseId: true,
            course: {
              select: {
                enforceSequentialLessons: true,
              },
            },
            lessons: { select: { id: true } },
          },
        },
        questions: {
          orderBy: { questionNumber: 'asc' },
        },
        submissions: {
          where: { studentId },
          orderBy: { attemptNumber: 'asc' },
          include: {
            answers: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment [${assessmentId}] not found`);
    }

    if (user.role === UserRole.STUDENT) {
      if (!assessment.isPublished) {
        throw new NotFoundException(`Assessment [${assessmentId}] not found`);
      }
      const isEnrolledInGroup = assessment.groupId
        ? assessment.group?.enrollments.some((e) => e.studentId === studentId)
        : assessment.targetGroups?.some(g => g.enrollments.some(e => e.studentId === studentId)) || false;
      const isEnrolledInCourse = assessment.courseId
        ? assessment.course?.enrollments.some((e) => e.studentId === studentId)
        : false;

      if ((assessment.groupId || assessment.targetGroups?.length > 0) && !isEnrolledInGroup && assessment.courseId && !isEnrolledInCourse) {
        throw new ForbiddenException('You are not enrolled in the group or course for this assessment');
      }

      // Sequential Course Assessment Progression Enforcement
      if (assessment.courseFinalQuizOf?.enforceSequentialLessons) {
        const course = assessment.courseFinalQuizOf;
        const allCourseLessons = course.modules.flatMap((m) => m.lessons);
        const allCourseLessonIds = allCourseLessons.map((l) => l.id);

        if (allCourseLessonIds.length > 0 && studentId) {
          const completedCount = await this.prisma.courseProgress.count({
            where: {
              studentId,
              lessonId: { in: allCourseLessonIds },
              isCompleted: true,
            },
          });
          if (completedCount < allCourseLessonIds.length) {
            throw new ForbiddenException(
              'الامتحان النهائي للكورس مقفل: يجب إتمام جميع دروس المنهج أولاً وفقاً لترتيب المنهج المحدد من المعلم',
            );
          }
        }

        const unitQuizIds = course.modules
          .map((m) => m.unitQuiz?.id)
          .filter((id): id is string => Boolean(id) && id !== assessment.id);

        if (unitQuizIds.length > 0 && studentId) {
          const distinctSubmissions = await this.prisma.assessmentSubmission.findMany({
            where: {
              studentId,
              assessmentId: { in: unitQuizIds },
            },
            select: { assessmentId: true },
            distinct: ['assessmentId'],
          });
          if (distinctSubmissions.length < unitQuizIds.length) {
            throw new ForbiddenException(
              'الامتحان النهائي للكورس مقفل: يجب إنهاء اختبارات جميع الوحدات أولاً قبل دخول الامتحان النهائي',
            );
          }
        }
      } else if (assessment.unitQuizOf?.course?.enforceSequentialLessons) {
        const unit = assessment.unitQuizOf;
        const unitLessonIds = unit.lessons.map((l) => l.id);

        if (unitLessonIds.length > 0 && studentId) {
          const completedCount = await this.prisma.courseProgress.count({
            where: {
              studentId,
              lessonId: { in: unitLessonIds },
              isCompleted: true,
            },
          });
          if (completedCount < unitLessonIds.length) {
            throw new ForbiddenException(
              'اختبار الوحدة الشامل مقفل: يجب إتمام جميع دروس الوحدة أولاً وفقاً لترتيب المنهج المحدد من المعلم',
            );
          }
        }
      }
    }

    const mySubmission = resolveOfficialSubmission(assessment.submissions);
    const isGraded = mySubmission?.status === SubmissionStatus.GRADED;
    const hasSubmitted = mySubmission?.status === SubmissionStatus.SUBMITTED || isGraded;
    const isPrivileged =
      user.role === UserRole.TEACHER || user.role === UserRole.SECRETARIAT;

    const effectiveStartTime = assessment.startTime || assessment.startDate;
    const effectiveEndTime = assessment.endTime || assessment.dueDate || assessment.deadline;
    const timingType =
      assessment.timingType ||
      (assessment.type === AssessmentType.EXAM
        ? ExamTimingType.FIXED_SESSION
        : null);
    const now = new Date();

    // Server-side timing enforcement for students attempting exams
    if (user.role === UserRole.STUDENT && (assessment.type === AssessmentType.EXAM || timingType)) {
      if (!hasSubmitted) {
        if (effectiveStartTime && now.getTime() < effectiveStartTime.getTime()) {
          throw new ForbiddenException({
            message: 'لم يحن موعد الاختبار بعد',
            startTime: effectiveStartTime.toISOString(),
          });
        }
        if (effectiveEndTime && now.getTime() > effectiveEndTime.getTime()) {
          throw new ForbiddenException({
            message: 'انتهت فترة الدخول للاختبار',
          });
        }
      }
    }

    // Compute effective student remaining time
    const durationSecs = assessment.durationMinutes
      ? assessment.durationMinutes * 60
      : null;
    let effectiveRemainingSeconds: number | null = null;
    let isLate = false;

    if (timingType === ExamTimingType.FIXED_SESSION) {
      if (effectiveEndTime) {
        const remainingUntilEnd = Math.floor(
          (effectiveEndTime.getTime() - now.getTime()) / 1000,
        );
        const bounded = durationSecs
          ? Math.min(durationSecs, remainingUntilEnd)
          : remainingUntilEnd;
        effectiveRemainingSeconds = Math.max(0, bounded);
      } else {
        effectiveRemainingSeconds = durationSecs;
      }
      if (effectiveStartTime && now.getTime() > effectiveStartTime.getTime()) {
        isLate = true;
      }
    } else if (timingType === ExamTimingType.FLEXIBLE_WINDOW) {
      const startedAtDate = mySubmission?.startedAt
        ? new Date(mySubmission.startedAt)
        : now;
      if (durationSecs) {
        const remainingFromStart = Math.floor(
          (startedAtDate.getTime() + durationSecs * 1000 - now.getTime()) /
            1000,
        );
        effectiveRemainingSeconds = Math.max(
          0,
          Math.min(durationSecs, remainingFromStart),
        );
      } else {
        effectiveRemainingSeconds = null;
      }
      isLate = false;
    } else {
      effectiveRemainingSeconds = durationSecs;
    }

    // Security projection: Redact answers if student has not completed & graded
    const sanitizedQuestions = assessment.questions.map((q) => {
      if (isPrivileged || isGraded) {
        return q;
      }
      const { correctAnswer, explanation, ...safeQuestion } = q;
      return safeQuestion;
    });

    // Session-linked homework is shown to students at its effective deadline
    // (start of the next session), keeping it open while actionable.
    const effectiveDueDate =
      user.role === UserRole.STUDENT
        ? await this.resolveEffectiveDueDate(assessment)
        : assessment.dueDate;

    return {
      id: assessment.id,
      title: assessment.title,
      description: assessment.description,
      type: assessment.type,
      assessmentType: assessment.assessmentType,
      timingType,
      startTime: effectiveStartTime,
      endTime: effectiveEndTime,
      serverTime: now.toISOString(),
      effectiveRemainingSeconds,
      isLate,
      totalScore: Number(assessment.totalScore),
      passingScore: assessment.passingScore
        ? Number(assessment.passingScore)
        : null,
      durationMinutes: assessment.durationMinutes,
      startDate: effectiveStartTime,
      dueDate: effectiveDueDate,
      deadline: effectiveEndTime,
      isPublished: assessment.isPublished,
      allowMultipleAttempts: assessment.allowMultipleAttempts,
      teacher: assessment.teacher,
      group: assessment.group,
      targetGroups: assessment.targetGroups,
      course: assessment.course,
      questions: sanitizedQuestions,
      attemptCount: assessment.submissions.length,
      bestScore:
        mySubmission?.scoreObtained != null
          ? Number(mySubmission.scoreObtained)
          : null,
      attempts: assessment.submissions.map((s) => ({
        id: s.id,
        attemptNumber: s.attemptNumber,
        status: s.status,
        scoreObtained: s.scoreObtained != null ? Number(s.scoreObtained) : null,
        submittedAt: s.submittedAt,
        gradedAt: s.gradedAt,
      })),
      mySubmission: mySubmission
        ? {
            id: mySubmission.id,
            attemptNumber: mySubmission.attemptNumber,
            status: mySubmission.status,
            scoreObtained:
              mySubmission.scoreObtained != null
                ? Number(mySubmission.scoreObtained)
                : null,
            submittedAt: mySubmission.submittedAt,
            gradedAt: mySubmission.gradedAt,
            teacherFeedback: mySubmission.teacherFeedback,
            answers: mySubmission.answers,
          }
        : null,
    };
  }

  /**
   * Lightweight attempt-status summary for the authenticated student.
   * Returns the official (highest-scoring) result plus the attempt policy so the
   * learning-room assessment card can render without pulling the full question bank.
   */
  async getMyAssessmentStatus(assessmentId: string, user: AuthenticatedUser) {
    const studentId =
      user.studentProfileId ||
      (user.role === UserRole.STUDENT ? user.id : null);

    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        totalScore: true,
        allowMultipleAttempts: true,
      },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment [${assessmentId}] not found`);
    }

    const totalScore = Number(assessment.totalScore);

    if (!studentId) {
      return {
        hasSubmitted: false,
        score: null,
        totalScore,
        percentage: null,
        attemptsCount: 0,
        allowMultipleAttempts: assessment.allowMultipleAttempts,
      };
    }

    const submissions = await this.prisma.assessmentSubmission.findMany({
      where: { assessmentId, studentId },
      orderBy: { attemptNumber: 'asc' },
      select: { attemptNumber: true, status: true, scoreObtained: true },
    });

    const official = resolveOfficialSubmission(submissions);
    const score =
      official?.scoreObtained != null ? Number(official.scoreObtained) : null;
    const percentage =
      score != null && totalScore > 0
        ? Math.round((score / totalScore) * 100)
        : null;

    return {
      hasSubmitted: submissions.length > 0,
      score,
      totalScore,
      percentage,
      attemptsCount: submissions.length,
      allowMultipleAttempts: assessment.allowMultipleAttempts,
    };
  }

  /**
   * Synchronous Auto-Grading Submission Engine.
   * Handles MCQ/True-False automatic evaluation and marks essay exams for teacher review.
   */
  async submitAssessment(
    assessmentId: string,
    user: AuthenticatedUser,
    dto: SubmitAssessmentDto,
  ) {
    const studentId = user.studentProfileId || (user.role === UserRole.STUDENT ? user.id : null);

    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: true,
        group: {
          include: {
            enrollments: studentId ? { where: { studentId, status: GroupEnrollmentStatus.ACTIVE } } : false,
          },
        },
        targetGroups: {
          include: {
            enrollments: studentId ? { where: { studentId, status: GroupEnrollmentStatus.ACTIVE } } : false,
          },
        },
        course: {
          include: {
            enrollments: studentId ? { where: { studentId, status: CourseEnrollmentStatus.ACTIVE } } : false,
          },
        },
        courseFinalQuizOf: {
          select: {
            id: true,
            enforceSequentialLessons: true,
            modules: {
              include: {
                unitQuiz: { select: { id: true } },
                lessons: { select: { id: true } },
              },
            },
          },
        },
        unitQuizOf: {
          select: {
            id: true,
            courseId: true,
            course: {
              select: {
                enforceSequentialLessons: true,
              },
            },
            lessons: { select: { id: true } },
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment [${assessmentId}] not found`);
    }

    if (user.role === UserRole.STUDENT && studentId) {
      if (assessment.courseFinalQuizOf?.enforceSequentialLessons) {
        const course = assessment.courseFinalQuizOf;
        const allCourseLessons = course.modules.flatMap((m) => m.lessons);
        const allCourseLessonIds = allCourseLessons.map((l) => l.id);

        if (allCourseLessonIds.length > 0) {
          const completedCount = await this.prisma.courseProgress.count({
            where: {
              studentId,
              lessonId: { in: allCourseLessonIds },
              isCompleted: true,
            },
          });
          if (completedCount < allCourseLessonIds.length) {
            throw new ForbiddenException(
              'الامتحان النهائي للكورس مقفل: يجب إتمام جميع دروس المنهج أولاً وفقاً لترتيب المنهج المحدد من المعلم',
            );
          }
        }

        const unitQuizIds = course.modules
          .map((m) => m.unitQuiz?.id)
          .filter((id): id is string => Boolean(id) && id !== assessment.id);

        if (unitQuizIds.length > 0) {
          const distinctSubmissions = await this.prisma.assessmentSubmission.findMany({
            where: {
              studentId,
              assessmentId: { in: unitQuizIds },
            },
            select: { assessmentId: true },
            distinct: ['assessmentId'],
          });
          if (distinctSubmissions.length < unitQuizIds.length) {
            throw new ForbiddenException(
              'الامتحان النهائي للكورس مقفل: يجب إنهاء اختبارات جميع الوحدات أولاً قبل دخول الامتحان النهائي',
            );
          }
        }
      } else if (assessment.unitQuizOf?.course?.enforceSequentialLessons) {
        const unit = assessment.unitQuizOf;
        const unitLessonIds = unit.lessons.map((l) => l.id);

        if (unitLessonIds.length > 0) {
          const completedCount = await this.prisma.courseProgress.count({
            where: {
              studentId,
              lessonId: { in: unitLessonIds },
              isCompleted: true,
            },
          });
          if (completedCount < unitLessonIds.length) {
            throw new ForbiddenException(
              'اختبار الوحدة الشامل مقفل: يجب إتمام جميع دروس الوحدة أولاً وفقاً لترتيب المنهج المحدد من المعلم',
            );
          }
        }
      }
    }

    // If teacher/secretariat previewing or student profile is absent, perform instant preview evaluation
    if (user.role === UserRole.TEACHER || user.role === UserRole.SECRETARIAT || !studentId) {
      const questionMap = new Map(assessment.questions.map((q) => [q.id, q]));
      let totalScoreObtained = 0;
      let hasPendingEssay = false;
      const answersToCreate = [];

      for (const ans of dto.answers) {
        const question = questionMap.get(ans.questionId);
        if (!question) continue;

        if (
          question.questionType === QuestionType.MULTIPLE_CHOICE ||
          question.questionType === QuestionType.TRUE_FALSE
        ) {
          const isCorrect =
            ans.answerGiven.trim().toLowerCase() ===
            question.correctAnswer.trim().toLowerCase();

          const pointsEarned = isCorrect ? Number(question.points) : 0;
          totalScoreObtained += pointsEarned;

          answersToCreate.push({
            id: 'preview-ans-' + question.id,
            questionId: question.id,
            selectedAnswer: ans.answerGiven,
            isCorrect,
            pointsEarned,
            maxPointsSnapshot: question.points,
          });
        } else if (question.questionType === QuestionType.ESSAY) {
          hasPendingEssay = true;
          answersToCreate.push({
            id: 'preview-ans-' + question.id,
            questionId: question.id,
            selectedAnswer: ans.answerGiven,
            isCorrect: null,
            pointsEarned: null,
            maxPointsSnapshot: question.points,
          });
        }
      }

      const status = hasPendingEssay
        ? SubmissionStatus.SUBMITTED
        : SubmissionStatus.GRADED;
      const finalScore = hasPendingEssay ? null : totalScoreObtained;
      const isAutoGraded = !hasPendingEssay;
      const gradedAt = hasPendingEssay ? null : new Date();

      const linkedLesson = this.prisma.courseLesson?.findFirst
        ? await this.prisma.courseLesson.findFirst({
            where: { lessonQuizId: assessmentId },
            include: { module: true },
          })
        : null;

      return {
        id: 'preview-submission',
        // Teacher/secretariat (or any non-student) submissions are a PREVIEW only:
        // nothing is persisted, so the attempt policy is not enforced and no mark is
        // stored against a student. The client uses this flag to label the result as a
        // preview instead of masquerading as a real, saved grade.
        isPreview: true,
        assessmentId,
        studentId: user.id,
        status,
        scoreObtained: finalScore,
        isAutoGraded,
        gradedAt,
        attachmentUrl: dto.attachmentUrl,
        submittedAt: new Date(),
        answers: answersToCreate,
        lessonId: linkedLesson?.id,
        courseId: linkedLesson?.module.courseId,
      };
    }

    if (!assessment.isPublished) {
      throw new BadRequestException('Cannot submit to an unpublished assessment');
    }

    if (dto.idempotencyKey) {
      const existingSubmission = await this.prisma.assessmentSubmission.findUnique({
        where: { operationId: dto.idempotencyKey },
      });

      if (existingSubmission) {
        this.logger.debug(`Idempotent submission replay for assessment ${assessmentId} with key ${dto.idempotencyKey}`);
        return {
          submissionId: existingSubmission.id,
          assessmentId,
          status: existingSubmission.status,
          scoreObtained: existingSubmission.scoreObtained != null ? Number(existingSubmission.scoreObtained) : null,
          totalScore: Number(assessment.totalScore),
          isAutoGraded: existingSubmission.isAutoGraded,
          submittedAt: existingSubmission.submittedAt,
          gradedAt: existingSubmission.gradedAt,
          isIdempotentReplay: true,
        };
      }
    }

    // Verify enrollment entitlement
    if (assessment.groupId && assessment.group && assessment.group.enrollments.length === 0) {
      throw new ForbiddenException('You are not enrolled in the academic group for this assessment');
    }
    if (assessment.targetGroups?.length > 0 && !assessment.targetGroups.some(g => g.enrollments.length > 0)) {
      throw new ForbiddenException('You are not enrolled in any of the target groups for this assessment');
    }
    if (assessment.courseId && assessment.course && assessment.course.enrollments.length === 0) {
      throw new ForbiddenException('You are not enrolled in the course for this assessment');
    }

    // 1. Enforce the attempt policy and compute the next attempt number.
    //    (The single-submission unique constraint was replaced by a per-attempt
    //     one, so we resolve the history explicitly instead of a compound findUnique.)
    const priorSubmissions = await this.prisma.assessmentSubmission.findMany({
      where: { assessmentId, studentId },
      orderBy: { attemptNumber: 'desc' },
    });

    if (priorSubmissions.length > 0 && !assessment.allowMultipleAttempts) {
      throw new BadRequestException({
        code: 'SINGLE_ATTEMPT_ONLY',
        message:
          'غير مسموح بإعادة هذا الاختبار، تم استنفاد المحاولة الوحيدة المتاحة',
      });
    }

    const attemptNumber = (priorSubmissions[0]?.attemptNumber ?? 0) + 1;

    // 2. Validate timing window & submission cutoff (with 60-second grace buffer)
    const now = new Date();
    const GRACE_PERIOD_MS = 60 * 1000; // 60s network latency allowance
    const effectiveStartTime = assessment.startTime || assessment.startDate;
    const effectiveEndTime = assessment.endTime || assessment.dueDate || assessment.deadline;
    const timingType =
      assessment.timingType ||
      (assessment.type === AssessmentType.EXAM
        ? ExamTimingType.FIXED_SESSION
        : null);

    if (
      effectiveStartTime &&
      now.getTime() < effectiveStartTime.getTime() - GRACE_PERIOD_MS
    ) {
      throw new BadRequestException({
        message: 'لم يحن موعد الاختبار بعد',
        startTime: effectiveStartTime.toISOString(),
      });
    }

    if (timingType === ExamTimingType.FIXED_SESSION) {
      if (
        effectiveEndTime &&
        now.getTime() > effectiveEndTime.getTime() + GRACE_PERIOD_MS
      ) {
        throw new BadRequestException({
          message: 'انتهت المدة المحددة لتسليم الاختبار',
          code: 'EXAM_TIME_EXPIRED',
        });
      }
    } else if (timingType === ExamTimingType.FLEXIBLE_WINDOW) {
      if (
        effectiveEndTime &&
        now.getTime() > effectiveEndTime.getTime() + GRACE_PERIOD_MS
      ) {
        throw new BadRequestException({
          message: 'انتهت فترة الدخول وتسليم الاختبار',
          code: 'EXAM_WINDOW_EXPIRED',
        });
      }
      if (assessment.durationMinutes) {
        const studentStartedAt =
          priorSubmissions[0]?.startedAt || now;
        const allowedDurationMs = assessment.durationMinutes * 60 * 1000;
        const individualExpiry = studentStartedAt.getTime() + allowedDurationMs;
        if (now.getTime() > individualExpiry + GRACE_PERIOD_MS) {
          throw new BadRequestException({
            message: 'انتهت المدة المحددة لتسليم الاختبار',
            code: 'EXAM_TIME_EXPIRED',
          });
        }
      }
    } else {
      // Session-linked homework due date check
      const effectiveDueDate = await this.resolveEffectiveDueDate(assessment);
      if (
        effectiveDueDate &&
        now.getTime() > effectiveDueDate.getTime() + GRACE_PERIOD_MS
      ) {
        throw new BadRequestException(
          'Assessment submission deadline has already passed',
        );
      }
    }

    // 3. Auto-Grading Calculation
    const answerSubmissionMap = new Map(
      dto.answers.map((a) => [a.questionId, a.answerGiven]),
    );
    let totalScoreObtained = 0;
    let hasPendingEssay = false;
    const answersToCreate = [];

    for (const question of assessment.questions) {
      const studentGivenAnswer = answerSubmissionMap.get(question.id) || '';

      if (
        question.questionType === QuestionType.MULTIPLE_CHOICE ||
        question.questionType === QuestionType.TRUE_FALSE
      ) {
        const isCorrect = isAnswerCorrect(
          question.questionType,
          studentGivenAnswer,
          question.correctAnswer,
        );

        const pointsEarned = isCorrect ? Number(question.points) : 0;
        totalScoreObtained += pointsEarned;

        answersToCreate.push({
          questionId: question.id,
          selectedAnswer: studentGivenAnswer,
          isCorrect,
          pointsEarned,
          maxPointsSnapshot: question.points,
        });
      } else if (question.questionType === QuestionType.ESSAY) {
        hasPendingEssay = true;
        answersToCreate.push({
          questionId: question.id,
          selectedAnswer: studentGivenAnswer,
          isCorrect: null,
          pointsEarned: null,
          maxPointsSnapshot: question.points,
        });
      }
    }

    const status = hasPendingEssay
      ? SubmissionStatus.SUBMITTED
      : SubmissionStatus.GRADED;
    const finalScore = hasPendingEssay ? null : totalScoreObtained;
    const isAutoGraded = !hasPendingEssay;
    const gradedAt = hasPendingEssay ? null : new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const submission = await tx.assessmentSubmission.create({
        data: {
          assessmentId,
          studentId,
          attemptNumber,
          status,
          scoreObtained: finalScore,
          isAutoGraded,
          gradedAt,
          attachmentUrl: dto.attachmentUrl,
          operationId: dto.idempotencyKey || undefined,
          answers: {
            create: answersToCreate,
          },
        },
      });

      // Auto-mark associated course lesson as completed if linked
      if (tx.courseLesson?.findFirst && tx.courseProgress?.upsert) {
        const linkedLesson = await tx.courseLesson.findFirst({
          where: { lessonQuizId: assessmentId },
          include: { module: true },
        });

        if (linkedLesson && studentId) {
          await tx.courseProgress.upsert({
            where: {
              lessonId_studentId: {
                lessonId: linkedLesson.id,
                studentId,
              },
            },
            update: {
              isCompleted: true,
              completedAt: new Date(),
            },
            create: {
              studentId,
              lessonId: linkedLesson.id,
              courseId: linkedLesson.module.courseId,
              lastPositionSeconds: 0,
              isCompleted: true,
              completedAt: new Date(),
            },
          });
        }
      }

      return submission;
    });

    // If fully auto-graded, dispatch domain event
    if (!hasPendingEssay) {
      this.eventEmitter.emit('assessment.graded', {
        submissionId: result.id,
        assessmentId,
        studentId,
        scoreObtained: finalScore,
      });
    }

    this.logger.log(
      `Assessment [${assessmentId}] submitted by student [${studentId}]. Status: ${status}, Score: ${finalScore}/${assessment.totalScore}`,
    );

    return {
      submissionId: result.id,
      assessmentId,
      status,
      scoreObtained: finalScore,
      totalScore: Number(assessment.totalScore),
      isAutoGraded,
      submittedAt: result.submittedAt,
      gradedAt: result.gradedAt,
    };
  }

  /**
   * Records a student's homework answer (PDF/image) for a physical group
   * session assessment. Links the submission to both the assessment and the
   * lesson session and marks the per-session homework state as SUBMITTED.
   */
  async submitHomework(
    assessmentId: string,
    user: AuthenticatedUser,
    dto: SubmitHomeworkDto,
  ) {
    const studentId = user.studentProfileId || user.id;

    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        group: {
          include: {
            enrollments: {
              where: { studentId, status: GroupEnrollmentStatus.ACTIVE },
            },
          },
        },
      },
    });

    if (!assessment || !assessment.isPublished) {
      throw new NotFoundException(`Assessment [${assessmentId}] not found`);
    }

    // Homework is only allowed for physical group assessments.
    if (assessment.courseId || assessment.lessonId) {
      throw new BadRequestException(
        'Homework submission is only supported for physical group assessments',
      );
    }

    if (!assessment.group || assessment.group.enrollments.length === 0) {
      throw new ForbiddenException(
        'You are not enrolled in the physical group for this assessment',
      );
    }

    const session = await this.prisma.lessonSession.findUnique({
      where: { id: dto.sessionId },
    });
    if (!session) {
      throw new NotFoundException(`Lesson session [${dto.sessionId}] not found`);
    }
    if (session.groupId !== assessment.groupId) {
      throw new BadRequestException(
        'The lesson session does not belong to the assessment group',
      );
    }

    const submission = await this.prisma.assessmentSubmission.upsert({
      where: {
        assessmentId_studentId_attemptNumber: {
          assessmentId,
          studentId,
          attemptNumber: 1,
        },
      },
      create: {
        assessmentId,
        studentId,
        attemptNumber: 1,
        status: SubmissionStatus.SUBMITTED,
        attachmentUrl: dto.fileUrl,
        fileKey: dto.fileKey,
        sessionId: dto.sessionId,
        studentNotes: dto.studentNotes,
        submittedAt: new Date(),
      },
      update: {
        status: SubmissionStatus.SUBMITTED,
        attachmentUrl: dto.fileUrl,
        fileKey: dto.fileKey,
        sessionId: dto.sessionId,
        studentNotes: dto.studentNotes,
        submittedAt: new Date(),
        scoreObtained: null,
        gradedAt: null,
      },
    });

    this.logger.log(
      `Homework [${assessmentId}] submitted by student [${studentId}] for session [${dto.sessionId}]`,
    );

    return {
      submissionId: submission.id,
      assessmentId,
      sessionId: submission.sessionId,
      status: submission.status,
      fileUrl: submission.attachmentUrl,
      fileKey: submission.fileKey,
      studentNotes: submission.studentNotes,
      submittedAt: submission.submittedAt,
    };
  }

  /**
   * Manual grading for essay/subjective questions by instructor.
   */
  async gradeSubmission(
    submissionId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: GradeSubmissionDto,
  ) {
    const submission = await this.prisma.assessmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assessment: {
          include: { questions: true },
        },
        answers: true,
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission [${submissionId}] not found`);
    }

    if (
      !isSecretariat &&
      submission.assessment.teacherId !== teacherId
    ) {
      throw new ForbiddenException(
        'You do not have permission to grade this assessment submission',
      );
    }

    // Validate per-question score limits against question max points
    const questionMap = new Map(submission.assessment.questions.map((q) => [q.id, q]));
    for (const grade of dto.manualGrades) {
      const q = questionMap.get(grade.questionId);
      if (q && grade.pointsEarned > Number(q.points)) {
        throw new BadRequestException(
          `الدرجة الممنوحة للسؤال (${grade.pointsEarned}) تتجاوز الحد الأقصى للسؤال (${Number(q.points)})`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update or create grades for specified questions
      for (const grade of dto.manualGrades) {
        const existingAnswer = await tx.studentAnswer.findFirst({
          where: {
            submissionId,
            questionId: grade.questionId,
          },
        });

        if (existingAnswer) {
          await tx.studentAnswer.update({
            where: { id: existingAnswer.id },
            data: {
              pointsEarned: grade.pointsEarned,
              teacherFeedback: grade.teacherFeedback,
              isCorrect: grade.pointsEarned > 0,
            },
          });
        } else {
          const q = questionMap.get(grade.questionId);
          await tx.studentAnswer.create({
            data: {
              submissionId,
              questionId: grade.questionId,
              selectedAnswer: '',
              pointsEarned: grade.pointsEarned,
              maxPointsSnapshot: q?.points ?? 1,
              teacherFeedback: grade.teacherFeedback,
              isCorrect: grade.pointsEarned > 0,
            },
          });
        }
      }

      // 2. Recompute total score across all answers
      const allAnswers = await tx.studentAnswer.findMany({
        where: { submissionId },
      });

      const totalScore = allAnswers.reduce(
        (sum, a) => sum + (Number(a.pointsEarned) || 0),
        0,
      );

      const maxTotal = Number(submission.assessment.totalScore);
      if (totalScore > maxTotal) {
        throw new BadRequestException(
          `مجموع الدرجات (${totalScore}) يتجاوز الدرجة الكلية للاختبار (${maxTotal})`,
        );
      }

      const passingScore = Number(submission.assessment.passingScore || 0);
      const isPassed = totalScore >= passingScore;

      // 3. Mark submission as GRADED
      const graderName = isSecretariat ? 'المساعد' : 'المعلم';
      const updatedSubmission = await tx.assessmentSubmission.update({
        where: { id: submissionId },
        data: {
          status: SubmissionStatus.GRADED,
          scoreObtained: totalScore,
          teacherFeedback: dto.feedback,
          gradedAt: new Date(),
          gradedById: teacherId,
          gradedByName: graderName,
        },
        include: {
          answers: { include: { question: true } },
          student: {
            include: { user: { select: { fullName: true, phone: true } } },
          },
        },
      });

      this.eventEmitter.emit('assessment.graded', {
        submissionId: updatedSubmission.id,
        assessmentId: submission.assessmentId,
        studentId: submission.studentId,
        scoreObtained: totalScore,
      });

      this.logger.log(
        `Submission [${submissionId}] manually graded. Score: ${totalScore}/${maxTotal}`,
      );

      return {
        id: updatedSubmission.id,
        assessmentId: updatedSubmission.assessmentId,
        student: (updatedSubmission as any).student,
        status: updatedSubmission.status,
        scoreObtained: Number(updatedSubmission.scoreObtained),
        totalScore: maxTotal,
        isPassed,
        teacherFeedback: updatedSubmission.teacherFeedback,
        gradedAt: updatedSubmission.gradedAt,
        answers: (updatedSubmission as any).answers,
      };
    });
  }

  /**
   * Retrieves all student submissions for an instructor's assessment.
   */
  async getAssessmentSubmissions(
    assessmentId: string,
    teacherId: string,
    isSecretariat: boolean,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment [${assessmentId}] not found`);
    }

    if (!isSecretariat && assessment.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to view these submissions');
    }

    const submissions = await this.prisma.assessmentSubmission.findMany({
      where: { assessmentId },
      orderBy: { submittedAt: 'desc' },
      include: {
        student: {
          include: {
            user: { select: { fullName: true, phone: true, email: true } },
          },
        },
        _count: { select: { answers: true } },
      },
    });

    // Under the retake policy a student can have several attempts. Group by student
    // and flag the official (highest) attempt so the gradebook can highlight the
    // counting grade, while still listing every attempt for review.
    const attemptsByStudent = new Map<string, typeof submissions>();
    for (const s of submissions) {
      const existing = attemptsByStudent.get(s.studentId);
      if (existing) existing.push(s);
      else attemptsByStudent.set(s.studentId, [s]);
    }
    const officialSubmissionIds = new Set<string>();
    for (const [, attempts] of attemptsByStudent) {
      const official = resolveOfficialSubmission(attempts);
      if (official) officialSubmissionIds.add(official.id);
    }

    return {
      assessmentId,
      assessmentTitle: assessment.title,
      totalScore: Number(assessment.totalScore),
      totalSubmissions: submissions.length,
      totalStudents: attemptsByStudent.size,
      submissions: submissions.map((s) => ({
        id: s.id,
        studentId: s.studentId,
        studentName: s.student.user.fullName,
        studentPhone: s.student.user.phone,
        attemptNumber: s.attemptNumber,
        isOfficial: officialSubmissionIds.has(s.id),
        status: s.status,
        scoreObtained: s.scoreObtained != null ? Number(s.scoreObtained) : null,
        submittedAt: s.submittedAt,
        gradedAt: s.gradedAt,
        isAutoGraded: s.isAutoGraded,
      })),
    };
  }

  /**
   * Retrieves full details of a specific submission including answers for grading.
   */
  async getSubmissionById(
    submissionId: string,
    teacherId: string,
    isSecretariat: boolean,
  ) {
    const submission = await this.prisma.assessmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assessment: {
          include: {
            questions: true,
          }
        },
        student: {
          include: {
            user: { select: { fullName: true, phone: true, email: true } },
          },
        },
        answers: {
          include: {
            question: true,
          }
        },
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission [${submissionId}] not found`);
    }

    if (!isSecretariat && submission.assessment.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to view this submission');
    }

    return {
      id: submission.id,
      attemptNumber: submission.attemptNumber,
      status: submission.status,
      scoreObtained: submission.scoreObtained != null ? Number(submission.scoreObtained) : null,
      isAutoGraded: submission.isAutoGraded,
      submittedAt: submission.submittedAt,
      gradedAt: submission.gradedAt,
      attachmentUrl: submission.attachmentUrl,
      teacherFeedback: submission.teacherFeedback,
      student: {
        id: submission.studentId,
        user: {
          fullName: submission.student.user.fullName,
          phone: submission.student.user.phone,
          email: submission.student.user.email,
        },
        studentCode: submission.student.studentCode,
      },
      assessment: {
        id: submission.assessment.id,
        title: submission.assessment.title,
        totalScore: Number(submission.assessment.totalScore),
        questions: submission.assessment.questions.map(q => ({
          id: q.id,
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          questionType: q.questionType,
          imageUrl: q.imageUrl,
          points: Number(q.points),
          correctAnswer: q.correctAnswer,
          optionsData: q.optionsData ? q.optionsData : undefined,
          explanation: q.explanation,
        })),
      },
      answers: submission.answers.map(ans => ({
        id: ans.id,
        questionId: ans.questionId,
        answerGiven: ans.selectedAnswer,
        isCorrect: ans.isCorrect,
        pointsAwarded: ans.pointsEarned != null ? Number(ans.pointsEarned) : null,
        teacherFeedback: ans.teacherFeedback,
      }))
    };
  }

  /**
   * Updates an assessment. Only specific fields are allowed.
   */
  async updateAssessment(
    assessmentId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: UpdateAssessmentDto,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { _count: { select: { submissions: true } } }
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment [${assessmentId}] not found`);
    }

    if (!isSecretariat && assessment.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to update this assessment');
    }

    // Lifecycle rule: Do not allow unpublishing if there are submissions
    if (
      assessment._count.submissions > 0 &&
      dto.isPublished === false &&
      assessment.isPublished === true
    ) {
      throw new ConflictException('Cannot unpublish an assessment that already has student submissions.');
    }

    const rawStartTime =
      dto.startTime !== undefined ? dto.startTime : dto.startDate;
    const rawEndTime =
      dto.endTime !== undefined
        ? dto.endTime
        : dto.deadline !== undefined
          ? dto.deadline
          : dto.dueDate;
    const startTimeDate =
      rawStartTime !== undefined
        ? rawStartTime
          ? new Date(rawStartTime)
          : null
        : undefined;
    const endTimeDate =
      rawEndTime !== undefined
        ? rawEndTime
          ? new Date(rawEndTime)
          : null
        : undefined;

    const updated = await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.timingType !== undefined && { timingType: dto.timingType }),
        ...(dto.durationMinutes !== undefined && {
          durationMinutes: dto.durationMinutes,
        }),
        ...(startTimeDate !== undefined && {
          startTime: startTimeDate,
          startDate: startTimeDate,
        }),
        ...(endTimeDate !== undefined && {
          endTime: endTimeDate,
          dueDate: endTimeDate,
          deadline: endTimeDate,
        }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
        ...(dto.allowMultipleAttempts !== undefined && {
          allowMultipleAttempts: dto.allowMultipleAttempts,
        }),
        ...(dto.courseId !== undefined && { courseId: dto.courseId || null }),
        ...(dto.assessmentType !== undefined && {
          assessmentType: dto.assessmentType,
          type:
            dto.assessmentType === AssessmentType.HOMEWORK
              ? AssessmentType.ASSIGNMENT
              : dto.assessmentType === AssessmentType.QUIZ
                ? AssessmentType.EXAM
                : dto.assessmentType,
        }),
      },
    });

    if (dto.isPublished === true && !assessment.isPublished) {
      await this.notifyAssessmentPublished({ ...assessment, ...updated });
    }

    this.logger.log(`Assessment [${assessmentId}] updated`);

    return updated;
  }

  private async notifyAssessmentPublished(assessment: {
    id: string;
    title: string;
    type: AssessmentType;
    assessmentType?: AssessmentType | null;
    totalScore: unknown;
    groupId?: string | null;
    isPublished: boolean;
    deadline?: Date | null;
    dueDate?: Date | null;
  }) {
    if (!this.notifications || !assessment.isPublished || !assessment.groupId) return;

    const isHomework =
      assessment.assessmentType === AssessmentType.HOMEWORK ||
      assessment.type === AssessmentType.ASSIGNMENT;
    const isExam =
      assessment.assessmentType === AssessmentType.EXAM ||
      assessment.assessmentType === AssessmentType.QUIZ ||
      assessment.type === AssessmentType.EXAM;
    if (!isHomework && !isExam) return;

    try {
      const [group, enrollments] = await Promise.all([
        this.prisma.academicGroup.findUnique({
          where: { id: assessment.groupId },
          select: { name: true },
        }),
        this.prisma.groupEnrollment.findMany({
          where: { groupId: assessment.groupId, status: GroupEnrollmentStatus.ACTIVE },
          select: { student: { select: { id: true, user: { select: { id: true } } } } },
        }),
      ]);

      const targetUserIds = enrollments
        .map(
          (enrollment) =>
            enrollment.student?.user?.id ||
            (enrollment.student as { userId?: string })?.userId ||
            enrollment.student?.id,
        )
        .filter((id): id is string => Boolean(id));
      if (targetUserIds.length === 0) return;

      const notificationType = isHomework
        ? NotificationType.NEW_HOMEWORK_ASSIGNED
        : NotificationType.NEW_EXAM_PUBLISHED;
      const groupName = group?.name || 'مجموعتك الدراسية';
      const deadline = assessment.deadline || assessment.dueDate;
      const deadlineText = deadline
        ? deadline.toLocaleString('ar-EG', {
            timeZone: 'Africa/Cairo',
            dateStyle: 'short',
            timeStyle: 'short',
          })
        : 'غير محدد';
      const body = isHomework
        ? `تمت إضافة واجب جديد لمجموعتك (${groupName}). آخر موعد للتسليم: ${deadlineText}.`
        : `تم نشر اختبار جديد لمجموعتك (${groupName}). الدرجة: ${Number(assessment.totalScore)} درجة.`;

      await this.notifications.dispatchToUsers(
        targetUserIds,
        {
          notificationType,
          title: isHomework
            ? `📝 واجب جديد: ${assessment.title}`
            : `📋 اختبار جديد: ${assessment.title}`,
          body,
          referenceEntityId: assessment.id,
          data: {
            assessmentId: assessment.id,
            groupId: assessment.groupId,
            groupName,
            deadline: deadline?.toISOString(),
            priority: 'high',
          },
        },
        [NotificationChannel.IN_APP, NotificationChannel.WEB_PUSH],
      );
    } catch (error) {
      this.logger.error(`Failed to notify students about assessment [${assessment.id}]`, error);
    }
  }

  /**
   * Batch re-evaluate auto-graded (MCQ / True-False) questions for all submissions of an assessment.
   */
  async reEvaluateAutoGradedSubmissions(
    assessmentId: string,
    teacherId: string,
    isSecretariat: boolean,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: true,
        submissions: {
          include: {
            answers: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment [${assessmentId}] not found`);
    }

    if (!isSecretariat && assessment.teacherId !== teacherId) {
      throw new ForbiddenException(
        'You do not have permission to re-evaluate this assessment',
      );
    }

    const hasEssayQuestions = assessment.questions.some(
      (q) => q.questionType === QuestionType.ESSAY,
    );

    let updatedSubmissionsCount = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const submission of assessment.submissions) {
        let totalScore = 0;
        let hasPendingManualEssay = false;

        for (const question of assessment.questions) {
          const ans = submission.answers.find((a) => a.questionId === question.id);
          const maxPoints = Number(question.points);

          if (
            question.questionType === QuestionType.MULTIPLE_CHOICE ||
            question.questionType === QuestionType.TRUE_FALSE
          ) {
            const isCorrect = isAnswerCorrect(
              question.questionType,
              ans?.selectedAnswer,
              question.correctAnswer,
            );
            const pointsEarned = isCorrect ? maxPoints : 0;
            totalScore += pointsEarned;

            if (ans) {
              await tx.studentAnswer.update({
                where: { id: ans.id },
                data: {
                  isCorrect,
                  pointsEarned,
                  maxPointsSnapshot: question.points,
                },
              });
            } else {
              await tx.studentAnswer.create({
                data: {
                  submissionId: submission.id,
                  questionId: question.id,
                  selectedAnswer: '',
                  isCorrect,
                  pointsEarned,
                  maxPointsSnapshot: question.points,
                },
              });
            }
          } else if (question.questionType === QuestionType.ESSAY) {
            if (ans && ans.pointsEarned !== null) {
              totalScore += Number(ans.pointsEarned);
            } else {
              hasPendingManualEssay = true;
            }
          }
        }

        const isFullyGraded = !hasPendingManualEssay;

        await tx.assessmentSubmission.update({
          where: { id: submission.id },
          data: {
            ...(isFullyGraded
              ? {
                  status: SubmissionStatus.GRADED,
                  scoreObtained: totalScore,
                  isAutoGraded: !hasEssayQuestions,
                  gradedAt: submission.gradedAt || new Date(),
                }
              : {
                  status: submission.status,
                }),
          },
        });

        updatedSubmissionsCount++;
      }
    });

    this.logger.log(
      `Re-evaluated ${updatedSubmissionsCount} submissions for assessment [${assessmentId}]`,
    );

    return {
      success: true,
      assessmentId,
      reEvaluatedCount: updatedSubmissionsCount,
      message: `تمت إعادة تقييم ${updatedSubmissionsCount} تسليم بنجاح`,
    };
  }
}

/**
 * Normalizes and compares student answer with model answer for MCQ & True/False questions.
 */
export function isAnswerCorrect(
  questionType: QuestionType,
  answerGiven: string | null | undefined,
  correctAnswer: string | null | undefined,
): boolean {
  if (!answerGiven || !correctAnswer) return false;
  const a = answerGiven.trim().toLowerCase();
  const c = correctAnswer.trim().toLowerCase();
  if (a === c) return true;

  if (questionType === QuestionType.TRUE_FALSE) {
    const trueVariants = ['true', 'صح', 'صحيحة', 'صواب', '1', 'نعم'];
    const falseVariants = ['false', 'خطأ', 'خاطئة', 'غلط', '0', 'لا'];
    if (trueVariants.includes(a) && trueVariants.includes(c)) return true;
    if (falseVariants.includes(a) && falseVariants.includes(c)) return true;
  }
  return false;
}

