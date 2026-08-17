"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AssessmentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssessmentsService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../../core/database/prisma.service");
const client_1 = require("@prisma/client");
const cursor_pagination_helper_1 = require("../../../common/pagination/cursor-pagination.helper");
let AssessmentsService = AssessmentsService_1 = class AssessmentsService {
    constructor(prisma, eventEmitter) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(AssessmentsService_1.name);
    }
    async createAssessment(teacherId, isSecretariat, dto) {
        if (!isSecretariat) {
            if (dto.groupId) {
                const group = await this.prisma.academicGroup.findUnique({
                    where: { id: dto.groupId },
                });
                if (!group)
                    throw new common_1.NotFoundException(`Group [${dto.groupId}] not found`);
                if (group.teacherId !== teacherId) {
                    throw new common_1.ForbiddenException('You do not own this academic group');
                }
            }
            if (dto.courseId) {
                const course = await this.prisma.course.findUnique({
                    where: { id: dto.courseId },
                });
                if (!course)
                    throw new common_1.NotFoundException(`Course [${dto.courseId}] not found`);
                if (course.teacherId !== teacherId) {
                    throw new common_1.ForbiddenException('You do not own this course');
                }
            }
        }
        if (dto.lessonId && dto.courseId) {
            const lesson = await this.prisma.courseLesson.findUnique({
                where: { id: dto.lessonId },
                include: { module: true },
            });
            if (!lesson || lesson.module.courseId !== dto.courseId) {
                throw new common_1.BadRequestException('Lesson does not belong to the specified course');
            }
        }
        const totalCalculated = dto.questions.reduce((sum, q) => sum + Number(q.points), 0);
        if (Math.abs(totalCalculated - Number(dto.totalScore)) > 0.01) {
            throw new common_1.BadRequestException(`Sum of question points (${totalCalculated}) does not match declared totalScore (${dto.totalScore})`);
        }
        const isAutoGraded = dto.questions.every((q) => q.questionType === client_1.QuestionType.MULTIPLE_CHOICE ||
            q.questionType === client_1.QuestionType.TRUE_FALSE);
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
            this.logger.log(`Created assessment [${assessment.id}] with ${dto.questions.length} questions`);
            return {
                ...assessment,
                totalQuestions: dto.questions.length,
            };
        });
    }
    async getAssessments(query, user) {
        const limit = cursor_pagination_helper_1.CursorPaginationHelper.sanitizeLimit(query.limit);
        const decodedCursor = query.cursor
            ? cursor_pagination_helper_1.CursorPaginationHelper.decodeCursor(query.cursor)
            : null;
        const cursorFilter = cursor_pagination_helper_1.CursorPaginationHelper.buildPrismaWhereClause(decodedCursor, 'DESC');
        const where = {
            ...(query.groupId ? { groupId: query.groupId } : {}),
            ...(query.courseId ? { courseId: query.courseId } : {}),
            ...(query.type ? { type: query.type } : {}),
            ...(query.isPublished !== undefined
                ? { isPublished: query.isPublished }
                : {}),
            ...(cursorFilter || {}),
        };
        if (user.role === client_1.UserRole.STUDENT) {
            where.isPublished = true;
            const studentId = user.studentProfileId || user.id;
            where.OR = [
                { group: { enrollments: { some: { studentId, status: client_1.GroupEnrollmentStatus.ACTIVE } } } },
                { course: { enrollments: { some: { studentId, status: client_1.CourseEnrollmentStatus.ACTIVE } } } },
            ];
        }
        else if (user.role === client_1.UserRole.PARENT) {
            where.isPublished = true;
            const parentId = user.parentProfileId || user.id;
            where.OR = [
                { group: { enrollments: { some: { status: client_1.GroupEnrollmentStatus.ACTIVE, student: { parentLinks: { some: { parentId } } } } } } },
                { course: { enrollments: { some: { status: client_1.CourseEnrollmentStatus.ACTIVE, student: { parentLinks: { some: { parentId } } } } } } },
            ];
        }
        else if (user.role === client_1.UserRole.TEACHER) {
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
                course: { select: { id: true, title: true } },
                _count: { select: { questions: true, submissions: true } },
            },
        });
        return cursor_pagination_helper_1.CursorPaginationHelper.formatResponse(assessments, limit);
    }
    async getAssessmentById(assessmentId, user) {
        const studentId = user.studentProfileId || user.id;
        const assessment = await this.prisma.assessment.findUnique({
            where: { id: assessmentId },
            include: {
                teacher: {
                    include: { user: { select: { fullName: true } } },
                },
                group: {
                    include: {
                        enrollments: { where: { status: client_1.GroupEnrollmentStatus.ACTIVE } },
                    },
                },
                course: {
                    include: {
                        enrollments: { where: { status: client_1.CourseEnrollmentStatus.ACTIVE } },
                    },
                },
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
            throw new common_1.NotFoundException(`Assessment [${assessmentId}] not found`);
        }
        if (user.role === client_1.UserRole.STUDENT) {
            if (!assessment.isPublished) {
                throw new common_1.NotFoundException(`Assessment [${assessmentId}] not found`);
            }
            const isEnrolledInGroup = assessment.groupId
                ? assessment.group?.enrollments.some((e) => e.studentId === studentId)
                : false;
            const isEnrolledInCourse = assessment.courseId
                ? assessment.course?.enrollments.some((e) => e.studentId === studentId)
                : false;
            if (assessment.groupId && !isEnrolledInGroup && assessment.courseId && !isEnrolledInCourse) {
                throw new common_1.ForbiddenException('You are not enrolled in the group or course for this assessment');
            }
        }
        const mySubmission = assessment.submissions[0] || null;
        const isGraded = mySubmission?.status === client_1.SubmissionStatus.GRADED;
        const isPrivileged = user.role === client_1.UserRole.TEACHER || user.role === client_1.UserRole.SECRETARIAT;
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
    async submitAssessment(assessmentId, studentId, dto) {
        const assessment = await this.prisma.assessment.findUnique({
            where: { id: assessmentId },
            include: {
                questions: true,
                group: {
                    include: {
                        enrollments: { where: { studentId, status: client_1.GroupEnrollmentStatus.ACTIVE } },
                    },
                },
                course: {
                    include: {
                        enrollments: { where: { studentId, status: client_1.CourseEnrollmentStatus.ACTIVE } },
                    },
                },
            },
        });
        if (!assessment) {
            throw new common_1.NotFoundException(`Assessment [${assessmentId}] not found`);
        }
        if (!assessment.isPublished) {
            throw new common_1.BadRequestException('Cannot submit to an unpublished assessment');
        }
        if (assessment.groupId && assessment.group && assessment.group.enrollments.length === 0) {
            throw new common_1.ForbiddenException('You are not enrolled in the academic group for this assessment');
        }
        if (assessment.courseId && assessment.course && assessment.course.enrollments.length === 0) {
            throw new common_1.ForbiddenException('You are not enrolled in the course for this assessment');
        }
        const existingSubmission = await this.prisma.assessmentSubmission.findUnique({
            where: {
                assessmentId_studentId: {
                    assessmentId,
                    studentId,
                },
            },
        });
        if (existingSubmission) {
            throw new common_1.ConflictException('You have already submitted this assessment (Single attempt policy enforced)');
        }
        if (assessment.dueDate && new Date() > assessment.dueDate) {
            throw new common_1.BadRequestException('Assessment submission deadline has already passed');
        }
        const questionMap = new Map(assessment.questions.map((q) => [q.id, q]));
        let totalScoreObtained = 0;
        let hasPendingEssay = false;
        const answersToCreate = [];
        for (const ans of dto.answers) {
            const question = questionMap.get(ans.questionId);
            if (!question)
                continue;
            if (question.questionType === client_1.QuestionType.MULTIPLE_CHOICE ||
                question.questionType === client_1.QuestionType.TRUE_FALSE) {
                const isCorrect = ans.answerGiven.trim().toLowerCase() ===
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
            }
            else if (question.questionType === client_1.QuestionType.ESSAY) {
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
            ? client_1.SubmissionStatus.SUBMITTED
            : client_1.SubmissionStatus.GRADED;
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
        if (!hasPendingEssay) {
            this.eventEmitter.emit('assessment.graded', {
                submissionId: result.id,
                assessmentId,
                studentId,
                scoreObtained: finalScore,
            });
        }
        this.logger.log(`Assessment [${assessmentId}] submitted by student [${studentId}]. Status: ${status}, Score: ${finalScore}/${assessment.totalScore}`);
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
    async gradeSubmission(submissionId, teacherId, isSecretariat, dto) {
        const submission = await this.prisma.assessmentSubmission.findUnique({
            where: { id: submissionId },
            include: {
                assessment: true,
                answers: true,
            },
        });
        if (!submission) {
            throw new common_1.NotFoundException(`Submission [${submissionId}] not found`);
        }
        if (!isSecretariat &&
            submission.assessment.teacherId !== teacherId) {
            throw new common_1.ForbiddenException('You do not have permission to grade this assessment submission');
        }
        return this.prisma.$transaction(async (tx) => {
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
            const allAnswers = await tx.studentAnswer.findMany({
                where: { submissionId },
            });
            const totalScore = allAnswers.reduce((sum, a) => sum + (Number(a.pointsEarned) || 0), 0);
            const updatedSubmission = await tx.assessmentSubmission.update({
                where: { id: submissionId },
                data: {
                    status: client_1.SubmissionStatus.GRADED,
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
            this.logger.log(`Submission [${submissionId}] manually graded. Score: ${totalScore}/${submission.assessment.totalScore}`);
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
    async getAssessmentSubmissions(assessmentId, teacherId, isSecretariat) {
        const assessment = await this.prisma.assessment.findUnique({
            where: { id: assessmentId },
        });
        if (!assessment) {
            throw new common_1.NotFoundException(`Assessment [${assessmentId}] not found`);
        }
        if (!isSecretariat && assessment.teacherId !== teacherId) {
            throw new common_1.ForbiddenException('You do not have permission to view these submissions');
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
};
exports.AssessmentsService = AssessmentsService;
exports.AssessmentsService = AssessmentsService = AssessmentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], AssessmentsService);
//# sourceMappingURL=assessments.service.js.map