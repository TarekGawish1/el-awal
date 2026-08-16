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
exports.AssessmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../core/database/prisma.service");
let AssessmentsService = class AssessmentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createAssessment(dto) {
        return this.prisma.assessment.create({
            data: {
                title: dto.title,
                description: dto.description,
                type: dto.type,
                totalScore: dto.totalScore || 100.0,
                passingScore: dto.passingScore,
                isAutoGraded: dto.isAutoGraded || false,
                dueDate: dto.dueDate,
                groupId: dto.groupId,
                courseId: dto.courseId,
                lessonId: dto.lessonId,
                teacherId: dto.teacherId,
            },
        });
    }
    async getAssessmentById(id) {
        const assessment = await this.prisma.assessment.findUnique({
            where: { id },
            include: {
                questions: {
                    orderBy: { questionNumber: 'asc' },
                },
            },
        });
        if (!assessment) {
            throw new common_1.NotFoundException(`Assessment [${id}] not found`);
        }
        return assessment;
    }
};
exports.AssessmentsService = AssessmentsService;
exports.AssessmentsService = AssessmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AssessmentsService);
//# sourceMappingURL=assessments.service.js.map