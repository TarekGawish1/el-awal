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
exports.ParentPortalController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const parent_portal_service_1 = require("../services/parent-portal.service");
const cursor_pagination_dto_1 = require("../../../common/dto/cursor-pagination.dto");
const roles_decorator_1 = require("../../../core/security/decorators/roles.decorator");
const current_user_decorator_1 = require("../../../core/security/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
let ParentPortalController = class ParentPortalController {
    constructor(parentPortalService) {
        this.parentPortalService = parentPortalService;
    }
    async getLinkedStudents(user) {
        return this.parentPortalService.getLinkedStudents(user.parentProfileId || user.id);
    }
    async getStudentOverview(studentId, user) {
        return this.parentPortalService.getStudentOverview(user.parentProfileId || user.id, studentId);
    }
    async getStudentAttendance(studentId, query, user) {
        return this.parentPortalService.getStudentAttendance(user.parentProfileId || user.id, studentId, query);
    }
    async getStudentAssessments(studentId, user) {
        return this.parentPortalService.getStudentAssessments(user.parentProfileId || user.id, studentId);
    }
    async getStudentCourses(studentId, user) {
        return this.parentPortalService.getStudentCourses(user.parentProfileId || user.id, studentId);
    }
};
exports.ParentPortalController = ParentPortalController;
__decorate([
    (0, common_1.Get)('students'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.PARENT),
    (0, swagger_1.ApiOperation)({ summary: 'List all children/students linked to the authenticated parent' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ParentPortalController.prototype, "getLinkedStudents", null);
__decorate([
    (0, common_1.Get)('students/:studentId/overview'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.PARENT),
    (0, swagger_1.ApiOperation)({ summary: 'Consolidated real-time KPI card overview (Attendance %, Exam averages, Billing alerts)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Child KPI metrics summary' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Guardianship link verification failed' }),
    __param(0, (0, common_1.Param)('studentId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ParentPortalController.prototype, "getStudentOverview", null);
__decorate([
    (0, common_1.Get)('students/:studentId/attendance'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.PARENT),
    (0, swagger_1.ApiOperation)({ summary: 'Keyset cursor-paginated physical classroom attendance history for child' }),
    __param(0, (0, common_1.Param)('studentId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, cursor_pagination_dto_1.CursorPaginationDto, Object]),
    __metadata("design:returntype", Promise)
], ParentPortalController.prototype, "getStudentAttendance", null);
__decorate([
    (0, common_1.Get)('students/:studentId/assessments'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.PARENT),
    (0, swagger_1.ApiOperation)({ summary: 'List graded exam/assignment submissions and instructor feedback for child' }),
    __param(0, (0, common_1.Param)('studentId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ParentPortalController.prototype, "getStudentAssessments", null);
__decorate([
    (0, common_1.Get)('students/:studentId/courses'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.PARENT),
    (0, swagger_1.ApiOperation)({ summary: 'Online course enrollment and lesson completion progress for child' }),
    __param(0, (0, common_1.Param)('studentId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ParentPortalController.prototype, "getStudentCourses", null);
exports.ParentPortalController = ParentPortalController = __decorate([
    (0, swagger_1.ApiTags)('Parent Guardian Portal'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('parent-portal'),
    __metadata("design:paramtypes", [parent_portal_service_1.ParentPortalService])
], ParentPortalController);
//# sourceMappingURL=parent-portal.controller.js.map