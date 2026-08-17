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
exports.SchedulesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const schedules_service_1 = require("../services/schedules.service");
const create_schedule_dto_1 = require("../dto/create-schedule.dto");
const generate_sessions_dto_1 = require("../dto/generate-sessions.dto");
const roles_decorator_1 = require("../../../core/security/decorators/roles.decorator");
const current_user_decorator_1 = require("../../../core/security/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
let SchedulesController = class SchedulesController {
    constructor(schedulesService) {
        this.schedulesService = schedulesService;
    }
    async createSchedule(dto, user) {
        return this.schedulesService.createSchedule(dto, user);
    }
    async getGroupSchedules(groupId, user) {
        return this.schedulesService.getGroupSchedules(groupId, user);
    }
    async deleteSchedule(id, user) {
        return this.schedulesService.deleteSchedule(id, user);
    }
    async generateSessions(groupId, dto, user) {
        return this.schedulesService.generateSessionsFromSchedule(groupId, dto, user);
    }
};
exports.SchedulesController = SchedulesController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({ summary: 'Create a recurring weekly lesson schedule for a group' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Schedule rule created' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_schedule_dto_1.CreateScheduleDto, Object]),
    __metadata("design:returntype", Promise)
], SchedulesController.prototype, "createSchedule", null);
__decorate([
    (0, common_1.Get)('group/:groupId'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT, client_1.UserRole.STUDENT, client_1.UserRole.PARENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get all recurring lesson schedules for an academic group' }),
    __param(0, (0, common_1.Param)('groupId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SchedulesController.prototype, "getGroupSchedules", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a recurring lesson schedule rule' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SchedulesController.prototype, "deleteSchedule", null);
__decorate([
    (0, common_1.Post)('group/:groupId/generate-sessions'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({ summary: 'Generate physical LessonSession records from recurring schedule over a date window' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Sessions generated successfully' }),
    __param(0, (0, common_1.Param)('groupId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, generate_sessions_dto_1.GenerateSessionsDto, Object]),
    __metadata("design:returntype", Promise)
], SchedulesController.prototype, "generateSessions", null);
exports.SchedulesController = SchedulesController = __decorate([
    (0, swagger_1.ApiTags)('Lesson Schedules'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('schedules'),
    __metadata("design:paramtypes", [schedules_service_1.SchedulesService])
], SchedulesController);
//# sourceMappingURL=schedules.controller.js.map