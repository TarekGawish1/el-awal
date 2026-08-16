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
exports.CoursesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../core/database/prisma.service");
const course_progress_repository_1 = require("../repositories/course-progress.repository");
const client_1 = require("@prisma/client");
let CoursesService = class CoursesService {
    constructor(prisma, progressRepository) {
        this.prisma = prisma;
        this.progressRepository = progressRepository;
    }
    async createCourse(dto) {
        return this.prisma.course.create({
            data: {
                title: dto.title,
                description: dto.description,
                subject: dto.subject,
                gradeLevel: dto.gradeLevel,
                coverImageUrl: dto.coverImageUrl,
                teacherId: dto.teacherId,
                status: client_1.CourseStatus.DRAFT,
            },
        });
    }
    async getPublishedCatalog(gradeLevel) {
        return this.prisma.course.findMany({
            where: {
                status: client_1.CourseStatus.PUBLISHED,
                ...(gradeLevel ? { gradeLevel } : {}),
            },
            orderBy: { orderIndex: 'asc' },
            include: {
                teacher: {
                    include: { user: { select: { fullName: true } } },
                },
                _count: { select: { modules: true, enrollments: true } },
            },
        });
    }
    async getCourseDetails(courseId) {
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
            include: {
                modules: {
                    orderBy: { orderIndex: 'asc' },
                    include: {
                        lessons: {
                            orderBy: { orderIndex: 'asc' },
                        },
                    },
                },
            },
        });
        if (!course) {
            throw new common_1.NotFoundException(`Course [${courseId}] not found`);
        }
        return course;
    }
    async applyMonotonicProgressBatch(studentId, items) {
        return this.progressRepository.syncBatch(studentId, items);
    }
};
exports.CoursesService = CoursesService;
exports.CoursesService = CoursesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        course_progress_repository_1.CourseProgressRepository])
], CoursesService);
//# sourceMappingURL=courses.service.js.map