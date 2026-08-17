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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchAttendanceDto = exports.AttendanceItemDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class AttendanceItemDto {
}
exports.AttendanceItemDto = AttendanceItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Student ID (UUID)', example: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AttendanceItemDto.prototype, "studentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.AttendanceStatus, example: client_1.AttendanceStatus.PRESENT }),
    (0, class_validator_1.IsEnum)(client_1.AttendanceStatus),
    __metadata("design:type", typeof (_a = typeof client_1.AttendanceStatus !== "undefined" && client_1.AttendanceStatus) === "function" ? _a : Object)
], AttendanceItemDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Optional attendance note or excuse reason', example: 'حاضر في الموعد' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AttendanceItemDto.prototype, "notes", void 0);
class BatchAttendanceDto {
}
exports.BatchAttendanceDto = BatchAttendanceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [AttendanceItemDto], description: 'List of student attendance status records' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => AttendanceItemDto),
    __metadata("design:type", Array)
], BatchAttendanceDto.prototype, "records", void 0);
//# sourceMappingURL=batch-attendance.dto.js.map