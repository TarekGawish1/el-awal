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
var CoursesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoursesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../core/database/prisma.service");
const course_progress_repository_1 = require("../repositories/course-progress.repository");
const bunny_video_service_1 = require("../../../integrations/video/bunny-video.service");
const storage_service_1 = require("../../../integrations/storage/storage.service");
const client_1 = require("@prisma/client");
const cursor_pagination_helper_1 = require("../../../common/pagination/cursor-pagination.helper");
let CoursesService = CoursesService_1 = class CoursesService {
    constructor(prisma, progressRepository, bunnyVideoService, storageService) {
        this.prisma = prisma;
        this.progressRepository = progressRepository;
        this.bunnyVideoService = bunnyVideoService;
        this.storageService = storageService;
        this.logger = new common_1.Logger(CoursesService_1.name);
    }
    async createCourse(teacherId, dto) {
        return this.prisma.course.create({
            data: {
                title: dto.title,
                description: dto.description,
                subject: dto.subject,
                gradeLevel: dto.gradeLevel,
                academicStage: dto.academicStage,
                price: dto.price || 0.0,
                coverImageUrl: dto.coverImageUrl,
                teacherId,
                status: client_1.CourseStatus.DRAFT,
            },
        });
    }
    async getPublishedCatalog(query) {
        const limit = cursor_pagination_helper_1.CursorPaginationHelper.sanitizeLimit(query.limit);
        const decodedCursor = query.cursor ? cursor_pagination_helper_1.CursorPaginationHelper.decodeCursor(query.cursor) : null;
        const cursorFilter = cursor_pagination_helper_1.CursorPaginationHelper.buildPrismaWhereClause(decodedCursor, 'DESC');
        const where = {
            status: client_1.CourseStatus.PUBLISHED,
            ...(query.gradeLevel ? { gradeLevel: query.gradeLevel } : {}),
            ...(query.academicStage ? { academicStage: query.academicStage } : {}),
            ...(query.subject ? { subject: query.subject } : {}),
            ...(query.search
                ? {
                    OR: [
                        { title: { contains: query.search, mode: 'insensitive' } },
                        { description: { contains: query.search, mode: 'insensitive' } },
                    ],
                }
                : {}),
            ...(cursorFilter || {}),
        };
        const courses = await this.prisma.course.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            include: {
                teacher: {
                    include: { user: { select: { fullName: true } } },
                },
                _count: { select: { modules: true, enrollments: true } },
            },
        });
        return cursor_pagination_helper_1.CursorPaginationHelper.formatResponse(courses, limit);
    }
    async getCourseDetails(courseId) {
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
            include: {
                teacher: {
                    include: { user: { select: { fullName: true, email: true } } },
                },
                modules: {
                    orderBy: { orderIndex: 'asc' },
                    include: {
                        lessons: {
                            orderBy: { orderIndex: 'asc' },
                            select: {
                                id: true,
                                title: true,
                                description: true,
                                orderIndex: true,
                                lessonType: true,
                                videoDurationSeconds: true,
                                isPreview: true,
                                createdAt: true,
                            },
                        },
                    },
                },
                _count: { select: { enrollments: true } },
            },
        });
        if (!course) {
            throw new common_1.NotFoundException(`Course [${courseId}] not found`);
        }
        return course;
    }
    async updateCourse(courseId, teacherId, isSecretariat, dto) {
        const course = await this.prisma.course.findUnique({ where: { id: courseId } });
        if (!course) {
            throw new common_1.NotFoundException(`Course [${courseId}] not found`);
        }
        if (!isSecretariat && course.teacherId !== teacherId) {
            throw new common_1.ForbiddenException('You do not have permission to modify this course');
        }
        return this.prisma.course.update({
            where: { id: courseId },
            data: {
                ...(dto.title ? { title: dto.title } : {}),
                ...(dto.description !== undefined ? { description: dto.description } : {}),
                ...(dto.subject ? { subject: dto.subject } : {}),
                ...(dto.gradeLevel ? { gradeLevel: dto.gradeLevel } : {}),
                ...(dto.academicStage !== undefined ? { academicStage: dto.academicStage } : {}),
                ...(dto.price !== undefined ? { price: dto.price } : {}),
                ...(dto.coverImageUrl !== undefined ? { coverImageUrl: dto.coverImageUrl } : {}),
                ...(dto.status ? { status: dto.status } : {}),
            },
        });
    }
    async createModule(courseId, teacherId, isSecretariat, dto) {
        const course = await this.prisma.course.findUnique({ where: { id: courseId } });
        if (!course) {
            throw new common_1.NotFoundException(`Course [${courseId}] not found`);
        }
        if (!isSecretariat && course.teacherId !== teacherId) {
            throw new common_1.ForbiddenException('You do not have permission to manage this course curriculum');
        }
        let orderIndex = dto.orderIndex;
        if (!orderIndex) {
            const moduleCount = await this.prisma.courseModule.count({ where: { courseId } });
            orderIndex = moduleCount + 1;
        }
        return this.prisma.courseModule.create({
            data: {
                courseId,
                title: dto.title,
                description: dto.description,
                orderIndex,
            },
        });
    }
    async createLesson(moduleId, teacherId, isSecretariat, dto) {
        const module = await this.prisma.courseModule.findUnique({
            where: { id: moduleId },
            include: { course: true },
        });
        if (!module) {
            throw new common_1.NotFoundException(`Course module [${moduleId}] not found`);
        }
        if (!isSecretariat && module.course.teacherId !== teacherId) {
            throw new common_1.ForbiddenException('You do not have permission to manage this module');
        }
        let orderIndex = dto.orderIndex;
        if (!orderIndex) {
            const lessonCount = await this.prisma.courseLesson.count({ where: { moduleId } });
            orderIndex = lessonCount + 1;
        }
        return this.prisma.courseLesson.create({
            data: {
                moduleId,
                title: dto.title,
                description: dto.description,
                orderIndex,
                lessonType: dto.lessonType || 'VIDEO',
                bunnyVideoId: dto.bunnyVideoId,
                contentUrl: dto.contentUrl,
                videoDurationSeconds: dto.videoDurationSeconds,
                isPreview: dto.isFreePreview || false,
            },
        });
    }
    async enrollCourse(courseId, studentId) {
        return this.prisma.$transaction(async (tx) => {
            const course = await tx.course.findUnique({ where: { id: courseId } });
            if (!course) {
                throw new common_1.NotFoundException(`Course [${courseId}] not found`);
            }
            if (course.status !== client_1.CourseStatus.PUBLISHED) {
                throw new common_1.BadRequestException('Cannot enroll in an unpublished or archived course');
            }
            const student = await tx.studentProfile.findUnique({ where: { id: studentId } });
            if (!student) {
                throw new common_1.NotFoundException(`Student [${studentId}] not found`);
            }
            const enrollment = await tx.courseEnrollment.upsert({
                where: {
                    courseId_studentId: {
                        courseId,
                        studentId,
                    },
                },
                create: {
                    courseId,
                    studentId,
                    status: client_1.CourseEnrollmentStatus.ACTIVE,
                },
                update: {
                    status: client_1.CourseEnrollmentStatus.ACTIVE,
                },
            });
            const access = await tx.courseAccess.upsert({
                where: { enrollmentId: enrollment.id },
                create: {
                    enrollmentId: enrollment.id,
                    studentId,
                    courseId,
                    accessStatus: client_1.CourseAccessStatus.ACTIVE,
                    validFrom: new Date(),
                },
                update: {
                    accessStatus: client_1.CourseAccessStatus.ACTIVE,
                },
            });
            this.logger.log(`Student [${studentId}] enrolled in course [${courseId}]`);
            return {
                enrollmentId: enrollment.id,
                courseId,
                studentId,
                status: enrollment.status,
                accessStatus: access.accessStatus,
                enrolledAt: enrollment.enrolledAt,
            };
        });
    }
    async getMyCourses(studentId) {
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
                access: true,
            },
            orderBy: { enrolledAt: 'desc' },
        });
        const results = await Promise.all(enrollments.map(async (e) => {
            const progressPercentage = await this.progressRepository.calculateCourseProgressPercentage(studentId, e.courseId);
            const totalLessons = await this.prisma.courseLesson.count({
                where: { module: { courseId: e.courseId } },
            });
            return {
                courseId: e.course.id,
                title: e.course.title,
                description: e.course.description,
                subject: e.course.subject,
                gradeLevel: e.course.gradeLevel,
                coverImageUrl: e.course.coverImageUrl,
                teacherName: e.course.teacher.user.fullName,
                enrolledAt: e.enrolledAt,
                accessStatus: e.access?.accessStatus || client_1.CourseAccessStatus.ACTIVE,
                totalModules: e.course._count.modules,
                totalLessons,
                progressPercentage,
            };
        }));
        return results;
    }
    async getLessonViewer(lessonId, user) {
        const lesson = await this.prisma.courseLesson.findUnique({
            where: { id: lessonId },
            include: {
                module: {
                    include: {
                        course: {
                            include: {
                                teacher: true,
                            },
                        },
                    },
                },
            },
        });
        if (!lesson) {
            throw new common_1.NotFoundException(`Lesson [${lessonId}] not found`);
        }
        const course = lesson.module.course;
        const studentId = user.studentProfileId || user.id;
        let isAuthorized = false;
        if (lesson.isPreview) {
            isAuthorized = true;
        }
        else if (user.role === client_1.UserRole.TEACHER &&
            (course.teacherId === user.teacherProfileId || course.teacherId === user.id)) {
            isAuthorized = true;
        }
        else if (user.role === client_1.UserRole.SECRETARIAT) {
            isAuthorized = true;
        }
        else if (user.role === client_1.UserRole.STUDENT || user.studentProfileId) {
            const access = await this.prisma.courseAccess.findFirst({
                where: {
                    courseId: course.id,
                    studentId,
                    accessStatus: client_1.CourseAccessStatus.ACTIVE,
                    OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
                },
            });
            if (access) {
                isAuthorized = true;
            }
        }
        if (!isAuthorized) {
            throw new common_1.ForbiddenException('Active course enrollment or entitlement is required to access this lesson material');
        }
        let videoPlayerUrl = null;
        let documentDownloadUrl = null;
        if (lesson.lessonType === 'VIDEO' && lesson.bunnyVideoId) {
            videoPlayerUrl = await this.bunnyVideoService.generateSecurePlaybackUrl(lesson.bunnyVideoId, 7200);
        }
        if (lesson.lessonType === 'DOCUMENT' && lesson.contentUrl) {
            documentDownloadUrl = await this.storageService.generatePresignedDownloadUrl(lesson.contentUrl, 3600);
        }
        let lastPositionSeconds = 0;
        let isCompleted = false;
        if (user.role === client_1.UserRole.STUDENT || user.studentProfileId) {
            const progress = await this.prisma.courseProgress.findUnique({
                where: {
                    lessonId_studentId: {
                        lessonId: lesson.id,
                        studentId,
                    },
                },
            });
            if (progress) {
                lastPositionSeconds = progress.lastPositionSeconds;
                isCompleted = progress.isCompleted;
            }
        }
        return {
            lessonId: lesson.id,
            moduleId: lesson.moduleId,
            courseId: course.id,
            courseTitle: course.title,
            title: lesson.title,
            description: lesson.description,
            lessonType: lesson.lessonType,
            isPreview: lesson.isPreview,
            videoDurationSeconds: lesson.videoDurationSeconds,
            videoPlayerUrl,
            documentDownloadUrl,
            lastPositionSeconds,
            isCompleted,
        };
    }
    async updateLessonProgress(studentId, lessonId, dto) {
        const lesson = await this.prisma.courseLesson.findUnique({
            where: { id: lessonId },
            include: { module: true },
        });
        if (!lesson) {
            throw new common_1.NotFoundException(`Lesson [${lessonId}] not found`);
        }
        const courseId = lesson.module.courseId;
        const progress = await this.progressRepository.upsertRealtimeProgress(studentId, lessonId, courseId, dto.lastPositionSeconds, dto.isCompleted || false);
        const overallCourseCompletionPercentage = await this.progressRepository.calculateCourseProgressPercentage(studentId, courseId);
        return {
            lessonId,
            courseId,
            lastPositionSeconds: progress.lastPositionSeconds,
            isCompleted: progress.isCompleted,
            overallCourseCompletionPercentage,
            lastSyncedAt: progress.lastSyncedAt,
        };
    }
    async applyMonotonicProgressBatch(studentId, items) {
        return this.progressRepository.syncBatch(studentId, items);
    }
};
exports.CoursesService = CoursesService;
exports.CoursesService = CoursesService = CoursesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        course_progress_repository_1.CourseProgressRepository,
        bunny_video_service_1.BunnyVideoService,
        storage_service_1.StorageService])
], CoursesService);
//# sourceMappingURL=courses.service.js.map