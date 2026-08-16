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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParentPortalService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../core/database/prisma.service");
let ParentPortalService = class ParentPortalService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getLinkedStudents(parentId) {
        return this.prisma.parentStudentLink.findMany({
            where: { parentId },
            include: {
                student: {
                    include: {
                        user: { select: { fullName: true, phone: true } },
                        groupEnrollments: {
                            where: { status: 'ACTIVE' },
                            include: { group: { select: { name: true, gradeLevel: true } } },
                        },
                    },
                },
            },
        });
    }
    async getStudentAcademicSummary(parentId, studentId) {
        const link = await this.prisma.parentStudentLink.findUnique({
            where: {
                parentId_studentId: {
                    parentId,
                    studentId,
                },
            },
        });
        if (!link) {
            throw new common_1.ForbiddenException('You do not have guardianship authorization for this student');
        }
        const [attendanceCount, evaluations, submissions] = await Promise.all([
            this.prisma.attendanceRecord.groupBy({
                by: ['status'],
                where: { studentId },
                _count: { id: true },
            }),
            this.prisma.studentEvaluation.findMany({
                where: { studentId },
                orderBy: { evaluationDate: 'desc' },
                take: 10,
            }),
            this.prisma.assessmentSubmission.findMany({
                where: { studentId },
                orderBy: { submittedAt: 'desc' },
                take: 10,
                include: { assessment: { select: { title: true, totalScore: true, type: true } } },
            }),
        ]);
        return {
            attendanceSummary: attendanceCount,
            recentEvaluations: evaluations,
            recentSubmissions: submissions,
        };
    }
};
exports.ParentPortalService = ParentPortalService;
exports.ParentPortalService = ParentPortalService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ParentPortalService);
//# sourceMappingURL=parent-portal.service.js.map