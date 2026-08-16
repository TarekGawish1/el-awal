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
    async getStudentSummary(studentId, user) {
        return this.parentPortalService.getStudentAcademicSummary(user.parentProfileId || user.id, studentId);
    }
};
exports.ParentPortalController = ParentPortalController;
__decorate([
    (0, common_1.Get)('students'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.PARENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get all children/students linked to authenticated parent' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ParentPortalController.prototype, "getLinkedStudents", null);
__decorate([
    (0, common_1.Get)('students/:studentId/summary'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.PARENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get consolidated academic summary, attendance and grades for linked child' }),
    __param(0, (0, common_1.Param)('studentId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ParentPortalController.prototype, "getStudentSummary", null);
exports.ParentPortalController = ParentPortalController = __decorate([
    (0, swagger_1.ApiTags)('Parent Portal'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('parent-portal'),
    __metadata("design:paramtypes", [parent_portal_service_1.ParentPortalService])
], ParentPortalController);
//# sourceMappingURL=parent-portal.controller.js.map