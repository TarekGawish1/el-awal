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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoursesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const courses_service_1 = require("../services/courses.service");
const create_course_dto_1 = require("../dto/create-course.dto");
const update_course_dto_1 = require("../dto/update-course.dto");
const create_module_dto_1 = require("../dto/create-module.dto");
const create_lesson_dto_1 = require("../dto/create-lesson.dto");
const course_query_dto_1 = require("../dto/course-query.dto");
const update_progress_dto_1 = require("../dto/update-progress.dto");
const roles_decorator_1 = require("../../../core/security/decorators/roles.decorator");
const public_decorator_1 = require("../../../core/security/decorators/public.decorator");
const current_user_decorator_1 = require("../../../core/security/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
let CoursesController = class CoursesController {
    constructor(coursesService) {
        this.coursesService = coursesService;
    }
    async getCatalog(query) {
        return this.coursesService.getPublishedCatalog(query);
    }
    async createCourse(dto, user) {
        return this.coursesService.createCourse(user.teacherProfileId || user.id, dto);
    }
    async getMyCourses(user) {
        return this.coursesService.getMyCourses(user.studentProfileId || user.id);
    }
    async getCourseDetails(id, user) {
        return this.coursesService.getCourseDetails(id, user);
    }
    async updateCourse(id, dto, user) {
        const isSecretariat = user.role === client_1.UserRole.SECRETARIAT;
        return this.coursesService.updateCourse(id, user.teacherProfileId || user.id, isSecretariat, dto);
    }
    async createModule(courseId, dto, user) {
        const isSecretariat = user.role === client_1.UserRole.SECRETARIAT;
        return this.coursesService.createModule(courseId, user.teacherProfileId || user.id, isSecretariat, dto);
    }
    async createLesson(moduleId, dto, user) {
        const isSecretariat = user.role === client_1.UserRole.SECRETARIAT;
        return this.coursesService.createLesson(moduleId, user.teacherProfileId || user.id, isSecretariat, dto);
    }
    async enrollCourse(courseId, user) {
        return this.coursesService.enrollCourse(courseId, user.studentProfileId || user.id);
    }
    async getLessonViewer(lessonId, user) {
        return this.coursesService.getLessonViewer(lessonId, user);
    }
    async updateLessonProgress(lessonId, dto, user) {
        return this.coursesService.updateLessonProgress(user.studentProfileId || user.id, lessonId, dto);
    }
};
exports.CoursesController = CoursesController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('catalog'),
    (0, swagger_1.ApiOperation)({ summary: 'Public catalog of published courses with Keyset pagination and filters' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [course_query_dto_1.CourseQueryDto]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "getCatalog", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new online course (Draft) scoped to authenticated instructor' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Course created in draft status' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_course_dto_1.CreateCourseDto, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "createCourse", null);
__decorate([
    (0, common_1.Get)('my-courses'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.STUDENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get all enrolled online courses for the authenticated student with progress %' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "getMyCourses", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT, client_1.UserRole.STUDENT, client_1.UserRole.PARENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get course outline, modules, and ordered lesson list' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "getCourseDetails", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({ summary: 'Update course metadata or publish status (Ownership protected)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_course_dto_1.UpdateCourseDto, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "updateCourse", null);
__decorate([
    (0, common_1.Post)(':id/modules'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({ summary: 'Add a new module/chapter to course outline' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Module created' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_module_dto_1.CreateModuleDto, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "createModule", null);
__decorate([
    (0, common_1.Post)('modules/:moduleId/lessons'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({ summary: 'Add a new lesson to a course module with media identifiers' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Lesson created' }),
    __param(0, (0, common_1.Param)('moduleId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_lesson_dto_1.CreateLessonDto, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "createLesson", null);
__decorate([
    (0, common_1.Post)(':id/enroll'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.STUDENT, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({ summary: 'Enroll authenticated student in a published course' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Enrollment and CourseAccess activated' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "enrollCourse", null);
__decorate([
    (0, common_1.Get)('lessons/:lessonId'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT, client_1.UserRole.STUDENT),
    (0, swagger_1.ApiOperation)({ summary: 'Secure Lesson Viewer with signed DRM video streaming token and resume state' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lesson details with signed media playback token' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied: active course entitlement required' }),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "getLessonViewer", null);
__decorate([
    (0, common_1.Post)('lessons/:lessonId/progress'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)(client_1.UserRole.STUDENT),
    (0, swagger_1.ApiOperation)({ summary: 'Real-time heartbeat to update lesson video playback position and completion' }),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_progress_dto_1.UpdateProgressDto, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "updateLessonProgress", null);
exports.CoursesController = CoursesController = __decorate([
    (0, swagger_1.ApiTags)('Online Courses'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('courses'),
    __metadata("design:paramtypes", [courses_service_1.CoursesService])
], CoursesController);
//# sourceMappingURL=courses.controller.js.map