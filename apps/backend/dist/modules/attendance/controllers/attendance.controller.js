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
exports.AttendanceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const attendance_service_1 = require("../services/attendance.service");
const scan_qr_dto_1 = require("../dto/scan-qr.dto");
const batch_attendance_dto_1 = require("../dto/batch-attendance.dto");
const roles_decorator_1 = require("../../../core/security/decorators/roles.decorator");
const current_user_decorator_1 = require("../../../core/security/decorators/current-user.decorator");
const cursor_pagination_dto_1 = require("../../../common/dto/cursor-pagination.dto");
const client_1 = require("@prisma/client");
let AttendanceController = class AttendanceController {
    constructor(attendanceService) {
        this.attendanceService = attendanceService;
    }
    async scanQrCode(sessionId, dto, user) {
        return this.attendanceService.processQrScan(sessionId, dto.qrCodeToken, user);
    }
    async recordManualBatch(sessionId, dto, user) {
        return this.attendanceService.recordManualBatch(sessionId, dto, user);
    }
    async getSessionReport(sessionId, user) {
        return this.attendanceService.getSessionReport(sessionId, user);
    }
    async getStudentHistory(studentId, pagination, user, status) {
        return this.attendanceService.getStudentHistory(studentId, pagination, status, user);
    }
};
exports.AttendanceController = AttendanceController;
__decorate([
    (0, common_1.Post)('sessions/:sessionId/scan-qr'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({ summary: 'Atomically record student attendance for a session via scanned QR code' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Attendance successfully recorded or confirmed duplicate' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid QR token or student not enrolled in group' }),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, scan_qr_dto_1.ScanQrDto, Object]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "scanQrCode", null);
__decorate([
    (0, common_1.Post)('sessions/:sessionId/manual'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({ summary: 'Batch update manual roll-call attendance for a lesson session' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Manual roll-call recorded' }),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, batch_attendance_dto_1.BatchAttendanceDto, Object]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "recordManualBatch", null);
__decorate([
    (0, common_1.Get)('sessions/:sessionId/report'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({ summary: 'Get consolidated attendance rate metrics and roster log for a session' }),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "getSessionReport", null);
__decorate([
    (0, common_1.Get)('student/:studentId'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT, client_1.UserRole.PARENT, client_1.UserRole.STUDENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get paginated attendance history for a student' }),
    __param(0, (0, common_1.Param)('studentId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, cursor_pagination_dto_1.CursorPaginationDto, Object, String]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "getStudentHistory", null);
exports.AttendanceController = AttendanceController = __decorate([
    (0, swagger_1.ApiTags)('Attendance & Absence'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('attendance'),
    __metadata("design:paramtypes", [attendance_service_1.AttendanceService])
], AttendanceController);
//# sourceMappingURL=attendance.controller.js.map