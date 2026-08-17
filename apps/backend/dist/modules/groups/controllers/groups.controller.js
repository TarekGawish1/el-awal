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
exports.GroupsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const groups_service_1 = require("../services/groups.service");
const create_group_dto_1 = require("../dto/create-group.dto");
const enroll_student_dto_1 = require("../dto/enroll-student.dto");
const roles_decorator_1 = require("../../../core/security/decorators/roles.decorator");
const current_user_decorator_1 = require("../../../core/security/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
let GroupsController = class GroupsController {
    constructor(groupsService) {
        this.groupsService = groupsService;
    }
    async createGroup(dto, user) {
        return this.groupsService.createGroup(user.teacherProfileId || user.id, dto);
    }
    async getGroups(user) {
        return this.groupsService.getTeacherGroups(user.teacherProfileId || user.id);
    }
    async getMyGroups(user) {
        return this.groupsService.getTeacherGroups(user.teacherProfileId || user.id);
    }
    async getGroupById(id) {
        return this.groupsService.getGroupById(id);
    }
    async enrollStudent(groupId, dto) {
        return this.groupsService.enrollStudent(groupId, dto.studentId);
    }
    async dropStudent(groupId, studentId) {
        return this.groupsService.dropStudent(groupId, studentId);
    }
    async getGroupRoster(groupId) {
        return this.groupsService.getGroupRoster(groupId);
    }
};
exports.GroupsController = GroupsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new physical academic classroom group' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Group successfully created' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_group_dto_1.CreateGroupDto, Object]),
    __metadata("design:returntype", Promise)
], GroupsController.prototype, "createGroup", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({ summary: 'Get all physical academic groups' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GroupsController.prototype, "getGroups", null);
__decorate([
    (0, common_1.Get)('my-groups'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: 'Get all physical academic groups managed by the authenticated teacher' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GroupsController.prototype, "getMyGroups", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({ summary: 'Get details, active count, and schedules of an academic group' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GroupsController.prototype, "getGroupById", null);
__decorate([
    (0, common_1.Post)(':id/students'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({ summary: 'Enroll student into academic group roster (Capacity checked)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Student enrolled in group' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Group max capacity exceeded' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, enroll_student_dto_1.EnrollStudentDto]),
    __metadata("design:returntype", Promise)
], GroupsController.prototype, "enrollStudent", null);
__decorate([
    (0, common_1.Delete)(':id/students/:studentId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({ summary: 'Drop or remove student from active academic group roster' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('studentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], GroupsController.prototype, "dropStudent", null);
__decorate([
    (0, common_1.Get)(':id/students'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({ summary: 'Get complete active student roster with attendance rates' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GroupsController.prototype, "getGroupRoster", null);
exports.GroupsController = GroupsController = __decorate([
    (0, swagger_1.ApiTags)('Academic Groups'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('groups'),
    __metadata("design:paramtypes", [groups_service_1.GroupsService])
], GroupsController);
//# sourceMappingURL=groups.controller.js.map