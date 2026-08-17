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
exports.TeachersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const teachers_service_1 = require("../services/teachers.service");
const dashboard_overview_query_dto_1 = require("../dto/dashboard-overview-query.dto");
const roles_decorator_1 = require("../../../core/security/decorators/roles.decorator");
const current_user_decorator_1 = require("../../../core/security/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
let TeachersController = class TeachersController {
    constructor(teachersService) {
        this.teachersService = teachersService;
    }
    async getDashboardOverview(query, user) {
        const teacherId = user.teacherProfileId || user.id;
        return this.teachersService.getDashboardOverview(teacherId, query);
    }
};
exports.TeachersController = TeachersController;
__decorate([
    (0, common_1.Get)('dashboard/overview'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({
        summary: 'Consolidated teacher dashboard aggregated metrics, KPIs, and alerts',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Teacher dashboard overview data' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dashboard_overview_query_dto_1.DashboardOverviewQueryDto, Object]),
    __metadata("design:returntype", Promise)
], TeachersController.prototype, "getDashboardOverview", null);
exports.TeachersController = TeachersController = __decorate([
    (0, swagger_1.ApiTags)('Teachers Dashboard'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('teachers'),
    __metadata("design:paramtypes", [teachers_service_1.TeachersService])
], TeachersController);
//# sourceMappingURL=teachers.controller.js.map