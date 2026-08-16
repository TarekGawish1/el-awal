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
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { QuestionType, SubmissionStatus, UserRole } from '@prisma/client';
import { CursorPaginationHelper } from '../../../common/pagination/cursor-pagination.helper';

@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Creates an assessment along with its ordered question bank in an atomic transaction.
   */
  async createAssessment(
    teacherId: string,
    isSecretariat: boolean,
    dto: CreateAssessmentDto,
  ) {
    // 1. Verify sum of question points matches total assessment score
    const totalCalculated = dto.questions.reduce(
      (sum, q) => sum + Number(q.points),
      0,
    );

    if (Math.abs(totalCalculated - Number(dto.totalScore)) > 0.01) {
      throw new BadRequestException(
        `Sum of question points (${totalCalculated}) does not match declared totalScore (${dto.totalScore})`,
      );
    }

    // 2. Determine if assessment is 100% auto-gradable (no subjective essays)
    const isAutoGraded = dto.questions.every(
      (q) =>
        q.questionType === QuestionType.MULTIPLE_CHOICE ||
        q.questionType === QuestionType.TRUE_FALSE,
    );

    return this.prisma.$transaction(async (tx) => {
      const assessment = await tx.assessment.create({
        data: {
          title: dto.title,
          description: dto.description,
          type: dto.type,
          totalScore: dto.totalScore,
          passingScore: dto.passingScore,
          durationMinutes: dto.durationMinutes,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          groupId: dto.groupId,
          courseId: dto.courseId,
          lessonId: dto.lessonId,
          isAutoGraded,
          isPublished: dto.isPublished ?? true,
          teacherId,
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
  async getAssessments(query: AssessmentQueryDto) {
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

    const assessments = await this.prisma.assessment.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        teacher: {
          include: { user: { select: { fullName: true } } },
        },
        group: { select: { id: true, name: true } },
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
        group: { select: { id: true, name: true } },
        course: { select: { id: true, title: true } },
        questions: {
          orderBy: { questionNumber: 'asc' },
        },
        submissions: {
          where: { studentId },
          include: {
            answers: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment [${assessmentId}] not found`);
    }

    const mySubmission = assessment.submissions[0] || null;
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
      teacher: assessment.teacher,
      group: assessment.group,
      course: assessment.course,
      questions: sanitizedQuestions,
      mySubmission: mySubmission
        ? {
            id: mySubmission.id,
            status: mySubmission.status,
            scoreObtained: mySubmission.scoreObtained
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
   * Synchronous Auto-Grading Submission Engine.
   * Handles MCQ/True-False automatic evaluation and marks essay exams for teacher review.
   */
  async submitAssessment(
    assessmentId: string,
    studentId: string,
    dto: SubmitAssessmentDto,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { questions: true },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment [${assessmentId}] not found`);
    }

    if (!assessment.isPublished) {
      throw new BadRequestException('Cannot submit to an unpublished assessment');
    }

    // 1. Check for single attempt duplicate submission
    const existingSubmission = await this.prisma.assessmentSubmission.findUnique({
      where: {
        assessmentId_studentId: {
          assessmentId,
          studentId,
        },
      },
    });

    if (existingSubmission) {
      throw new ConflictException(
        'You have already submitted this assessment (Single attempt policy enforced)',
      );
    }

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

    return {
      assessmentId,
      assessmentTitle: assessment.title,
      totalScore: Number(assessment.totalScore),
      totalSubmissions: submissions.length,
      submissions: submissions.map((s) => ({
        id: s.id,
        studentId: s.studentId,
        studentName: s.student.user.fullName,
        studentPhone: s.student.user.phone,
        status: s.status,
        scoreObtained: s.scoreObtained ? Number(s.scoreObtained) : null,
        submittedAt: s.submittedAt,
        gradedAt: s.gradedAt,
        isAutoGraded: s.isAutoGraded,
      })),
    };
  }
}
