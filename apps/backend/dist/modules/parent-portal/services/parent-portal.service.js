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
var ParentPortalService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParentPortalService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../core/database/prisma.service");
const client_1 = require("@prisma/client");
const cursor_pagination_helper_1 = require("../../../common/pagination/cursor-pagination.helper");
let ParentPortalService = ParentPortalService_1 = class ParentPortalService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(ParentPortalService_1.name);
    }
    async verifyGuardianLink(parentId, studentId) {
        const link = await this.prisma.parentStudentLink.findUnique({
            where: {
                parentId_studentId: {
                    parentId,
                    studentId,
                },
            },
        });
        if (!link) {
            throw new common_1.ForbiddenException('Guardianship authorization failed: You are not linked to this student');
        }
    }
    async getLinkedStudents(parentId) {
        const links = await this.prisma.parentStudentLink.findMany({
            where: { parentId },
            include: {
                parent: true,
                student: {
                    include: {
                        user: { select: { id: true, fullName: true, phone: true, email: true } },
                        groupEnrollments: {
                            where: { status: client_1.GroupEnrollmentStatus.ACTIVE },
                            include: { group: { select: { id: true, name: true, gradeLevel: true } } },
                        },
                    },
                },
            },
        });
        return links.map((l) => ({
            linkId: l.id,
            relationshipType: l.parent?.relationshipType || 'Guardian',
            student: {
                id: l.student.id,
                studentCode: l.student.studentCode,
                fullName: l.student.user.fullName,
                phone: l.student.user.phone,
                email: l.student.user.email,
                gradeLevel: l.student.gradeLevel,
                academicStage: l.student.academicStage,
                activeGroups: l.student.groupEnrollments.map((ge) => ge.group),
            },
        }));
    }
    async getStudentOverview(parentId, studentId) {
        await this.verifyGuardianLink(parentId, studentId);
        const student = await this.prisma.studentProfile.findUnique({
            where: { id: studentId },
            include: { user: { select: { fullName: true, phone: true } } },
        });
        if (!student) {
            throw new common_1.NotFoundException(`Student [${studentId}] not found`);
        }
        const [totalSessions, presentSessions, absentSessions] = await Promise.all([
            this.prisma.attendanceRecord.count({ where: { studentId } }),
            this.prisma.attendanceRecord.count({
                where: { studentId, status: client_1.AttendanceStatus.PRESENT },
            }),
            this.prisma.attendanceRecord.count({
                where: { studentId, status: client_1.AttendanceStatus.ABSENT },
            }),
        ]);
        const attendanceRate = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 100;
        const gradedSubmissions = await this.prisma.assessmentSubmission.findMany({
            where: { studentId, status: client_1.SubmissionStatus.GRADED },
            include: { assessment: { select: { totalScore: true } } },
        });
        let totalScoreObtained = 0;
        let totalMaxScore = 0;
        for (const s of gradedSubmissions) {
            totalScoreObtained += Number(s.scoreObtained || 0);
            totalMaxScore += Number(s.assessment.totalScore || 0);
        }
        const academicAverage = totalMaxScore > 0 ? Math.round((totalScoreObtained / totalMaxScore) * 100) : 0;
        const [enrolledGroupsCount, enrolledCoursesCount] = await Promise.all([
            this.prisma.groupEnrollment.count({
                where: { studentId, status: client_1.GroupEnrollmentStatus.ACTIVE },
            }),
            this.prisma.courseEnrollment.count({
                where: { studentId, status: client_1.CourseEnrollmentStatus.ACTIVE },
            }),
        ]);
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const currentMonthPayment = await this.prisma.studentPaymentRecord.findFirst({
            where: {
                studentId,
                periodYear: currentYear,
                periodMonth: currentMonth,
            },
        });
        const isTuitionPaid = currentMonthPayment?.paymentStatus === client_1.PaymentStatus.PAID;
        const [recentAttendance, recentAssessments] = await Promise.all([
            this.prisma.attendanceRecord.findMany({
                where: { studentId },
                orderBy: { recordedAt: 'desc' },
                take: 3,
                include: {
                    session: {
                        include: { group: { select: { name: true } } },
                    },
                },
            }),
            this.prisma.assessmentSubmission.findMany({
                where: { studentId },
                orderBy: { submittedAt: 'desc' },
                take: 3,
                include: {
                    assessment: { select: { title: true, totalScore: true, type: true } },
                },
            }),
        ]);
        return {
            student: {
                id: student.id,
                studentCode: student.studentCode,
                fullName: student.user.fullName,
                gradeLevel: student.gradeLevel,
            },
            kpis: {
                attendanceRatePercentage: attendanceRate,
                totalSessionsAttended: presentSessions,
                totalSessionsMissed: absentSessions,
                academicAveragePercentage: academicAverage,
                totalGradedAssessments: gradedSubmissions.length,
                enrolledPhysicalGroups: enrolledGroupsCount,
                enrolledOnlineCourses: enrolledCoursesCount,
                currentMonthBilling: {
                    periodYear: currentYear,
                    periodMonth: currentMonth,
                    isPaid: isTuitionPaid,
                    amountPaid: Number(currentMonthPayment?.amountPaid || 0),
                    status: currentMonthPayment?.paymentStatus || client_1.PaymentStatus.PENDING,
                },
            },
            recentAttendance: recentAttendance.map((a) => ({
                sessionId: a.sessionId,
                groupName: a.session.group.name,
                sessionDate: a.session.sessionDate,
                status: a.status,
                recordedAt: a.recordedAt,
            })),
            recentAssessments: recentAssessments.map((sub) => ({
                submissionId: sub.id,
                assessmentTitle: sub.assessment.title,
                type: sub.assessment.type,
                status: sub.status,
                scoreObtained: sub.scoreObtained ? Number(sub.scoreObtained) : null,
                totalScore: Number(sub.assessment.totalScore),
                submittedAt: sub.submittedAt,
            })),
        };
    }
    async getStudentAttendance(parentId, studentId, query) {
        await this.verifyGuardianLink(parentId, studentId);
        const limit = cursor_pagination_helper_1.CursorPaginationHelper.sanitizeLimit(query.limit);
        const decodedCursor = query.cursor
            ? cursor_pagination_helper_1.CursorPaginationHelper.decodeCursor(query.cursor)
            : null;
        const cursorFilter = cursor_pagination_helper_1.CursorPaginationHelper.buildPrismaWhereClause(decodedCursor, 'DESC');
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
        return cursor_pagination_helper_1.CursorPaginationHelper.formatResponse(formatted, limit);
    }
    async getStudentAssessments(parentId, studentId) {
        await this.verifyGuardianLink(parentId, studentId);
        const submissions = await this.prisma.assessmentSubmission.findMany({
            where: { studentId },
            orderBy: { submittedAt: 'desc' },
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
        return submissions.map((s) => ({
            submissionId: s.id,
            assessmentId: s.assessmentId,
            title: s.assessment.title,
            type: s.assessment.type,
            teacherName: s.assessment.teacher.user.fullName,
            status: s.status,
            scoreObtained: s.scoreObtained ? Number(s.scoreObtained) : null,
            totalScore: Number(s.assessment.totalScore),
            passingScore: s.assessment.passingScore ? Number(s.assessment.passingScore) : null,
            isPassed: s.scoreObtained && s.assessment.passingScore
                ? Number(s.scoreObtained) >= Number(s.assessment.passingScore)
                : null,
            submittedAt: s.submittedAt,
            gradedAt: s.gradedAt,
            teacherFeedback: s.teacherFeedback,
        }));
    }
    async getStudentCourses(parentId, studentId) {
        await this.verifyGuardianLink(parentId, studentId);
        const enrollments = await this.prisma.courseEnrollment.findMany({
            where: {
                studentId,
                status: client_1.CourseEnrollmentStatus.ACTIVE,
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
        return Promise.all(enrollments.map(async (e) => {
            const totalLessons = await this.prisma.courseLesson.count({
                where: { module: { courseId: e.courseId } },
            });
            const completedLessons = await this.prisma.courseProgress.count({
                where: {
                    studentId,
                    courseId: e.courseId,
                    isCompleted: true,
                },
            });
            const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
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
        }));
    }
};
exports.ParentPortalService = ParentPortalService;
exports.ParentPortalService = ParentPortalService = ParentPortalService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ParentPortalService);
//# sourceMappingURL=parent-portal.service.js.map