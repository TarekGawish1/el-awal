import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/database/prisma.service';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { SubmitAssessmentDto } from '../dto/submit-assessment.dto';
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
} from '@prisma/client';
import { CursorPaginationHelper } from '../../../common/pagination/cursor-pagination.helper';
import { resolveOfficialSubmission } from '../utils/submission-grade.util';

@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Authoring Pipeline for Exam / Homework creation with embedded questions.
   */
  async createAssessment(
    teacherId: string,
    isSecretariat: boolean,
    dto: CreateAssessmentDto,
  ) {
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

    return this.prisma.$transaction(async (tx) => {
      const assessment = await tx.assessment.create({
        data: {
          id: dto.id || undefined,
          title: dto.title,
          description: dto.description,
          type: dto.type,
          totalScore: dto.totalScore,
          passingScore: dto.passingScore,
          durationMinutes: dto.durationMinutes,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
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

      this.logger.log(
        `Created assessment [${assessment.id}] with ${dto.questions.length} questions`,
      );

      return {
        ...assessment,
        totalQuestions: dto.questions.length,
      };
    });
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
      where.OR = [
        { group: { enrollments: { some: { studentId, status: GroupEnrollmentStatus.ACTIVE } } } },
        { targetGroups: { some: { enrollments: { some: { studentId, status: GroupEnrollmentStatus.ACTIVE } } } } },
        { course: { enrollments: { some: { studentId, status: CourseEnrollmentStatus.ACTIVE } } } },
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

    const assessments = await this.prisma.assessment.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        teacher: {
          include: { user: { select: { fullName: true } } },
        },
        group: { select: { id: true, name: true } },
        targetGroups: { select: { id: true, name: true } },
        course: { select: { id: true, title: true } },
        _count: { select: { questions: true, submissions: true } },
      },
    });

    return CursorPaginationHelper.formatResponse(assessments, limit);
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
    }

    const mySubmission = resolveOfficialSubmission(assessment.submissions);
    const isGraded = mySubmission?.status === SubmissionStatus.GRADED;
    const isPrivileged =
      user.role === UserRole.TEACHER || user.role === UserRole.SECRETARIAT;

    // Security projection: Redact answers if student has not completed & graded
    const sanitizedQuestions = assessment.questions.map((q) => {
      if (isPrivileged || isGraded) {
        return q;
      }
      const { correctAnswer, explanation, ...safeQuestion } = q;
      return safeQuestion;
    });

    return {
      id: assessment.id,
      title: assessment.title,
      description: assessment.description,
      type: assessment.type,
      totalScore: Number(assessment.totalScore),
      passingScore: assessment.passingScore
        ? Number(assessment.passingScore)
        : null,
      durationMinutes: assessment.durationMinutes,
      dueDate: assessment.dueDate,
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
      },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment [${assessmentId}] not found`);
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

    // 2. Validate submission deadline
    if (assessment.dueDate && new Date() > assessment.dueDate) {
      throw new BadRequestException(
        'Assessment submission deadline has already passed',
      );
    }

    // 3. Auto-Grading Calculation
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
          questionId: question.id,
          selectedAnswer: ans.answerGiven,
          isCorrect,
          pointsEarned,
          maxPointsSnapshot: question.points,
        });
      } else if (question.questionType === QuestionType.ESSAY) {
        hasPendingEssay = true;
        answersToCreate.push({
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
        assessment: true,
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

    return this.prisma.$transaction(async (tx) => {
      // 1. Update manual grades for specified questions
      for (const grade of dto.manualGrades) {
        await tx.studentAnswer.updateMany({
          where: {
            submissionId,
            questionId: grade.questionId,
          },
          data: {
            pointsEarned: grade.pointsEarned,
            teacherFeedback: grade.teacherFeedback,
            isCorrect: grade.pointsEarned > 0,
          },
        });
      }

      // 2. Recompute total score across all answers
      const allAnswers = await tx.studentAnswer.findMany({
        where: { submissionId },
      });

      const totalScore = allAnswers.reduce(
        (sum, a) => sum + (Number(a.pointsEarned) || 0),
        0,
      );

      // 3. Mark submission as GRADED
      const updatedSubmission = await tx.assessmentSubmission.update({
        where: { id: submissionId },
        data: {
          status: SubmissionStatus.GRADED,
          scoreObtained: totalScore,
          teacherFeedback: dto.feedback,
          gradedAt: new Date(),
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
        `Submission [${submissionId}] manually graded. Score: ${totalScore}/${submission.assessment.totalScore}`,
      );

      return {
        id: updatedSubmission.id,
        assessmentId: updatedSubmission.assessmentId,
        student: updatedSubmission.student,
        status: updatedSubmission.status,
        scoreObtained: Number(updatedSubmission.scoreObtained),
        totalScore: Number(submission.assessment.totalScore),
        teacherFeedback: updatedSubmission.teacherFeedback,
        gradedAt: updatedSubmission.gradedAt,
        answers: updatedSubmission.answers,
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
        fullName: submission.student.user.fullName,
        phone: submission.student.user.phone,
        email: submission.student.user.email,
        studentCode: submission.student.studentCode,
      },
      assessment: {
        id: submission.assessment.id,
        title: submission.assessment.title,
        totalScore: Number(submission.assessment.totalScore),
      },
      answers: submission.answers.map(ans => ({
        id: ans.id,
        questionId: ans.questionId,
        questionText: ans.question.questionText,
        questionType: ans.question.questionType,
        correctAnswer: ans.question.correctAnswer,
        selectedAnswer: ans.selectedAnswer,
        isCorrect: ans.isCorrect,
        pointsEarned: ans.pointsEarned != null ? Number(ans.pointsEarned) : null,
        maxPointsSnapshot: Number(ans.maxPointsSnapshot),
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

    const updated = await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.durationMinutes !== undefined && { durationMinutes: dto.durationMinutes }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
        ...(dto.allowMultipleAttempts !== undefined && { allowMultipleAttempts: dto.allowMultipleAttempts }),
        ...(dto.courseId !== undefined && { courseId: dto.courseId || null }),
      },
    });

    this.logger.log(`Assessment [${assessmentId}] updated`);

    return updated;
  }
}
