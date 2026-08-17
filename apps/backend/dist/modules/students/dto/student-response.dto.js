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
exports.StudentProfileResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class StudentProfileResponseDto {
}
exports.StudentProfileResponseDto = StudentProfileResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e' }),
    __metadata("design:type", String)
], StudentProfileResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' }),
    __metadata("design:type", String)
], StudentProfileResponseDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'محمود أحمد علي' }),
    __metadata("design:type", String)
], StudentProfileResponseDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+201012345678' }),
    __metadata("design:type", String)
], StudentProfileResponseDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'mahmoud@student.elawal.com' }),
    __metadata("design:type", String)
], StudentProfileResponseDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'STU-2026-0001' }),
    __metadata("design:type", String)
], StudentProfileResponseDto.prototype, "studentCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'الصف الثالث الثانوي' }),
    __metadata("design:type", String)
], StudentProfileResponseDto.prototype, "gradeLevel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'المرحلة الثانوية' }),
    __metadata("design:type", String)
], StudentProfileResponseDto.prototype, "academicStage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.StudentAcademicStatus, example: client_1.StudentAcademicStatus.ACTIVE }),
    __metadata("design:type", typeof (_a = typeof client_1.StudentAcademicStatus !== "undefined" && client_1.StudentAcademicStatus) === "function" ? _a : Object)
], StudentProfileResponseDto.prototype, "academicStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2008-05-15' }),
    __metadata("design:type", Date)
], StudentProfileResponseDto.prototype, "dateOfBirth", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+201198765432' }),
    __metadata("design:type", String)
], StudentProfileResponseDto.prototype, "emergencyPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-08-16T12:00:00.000Z' }),
    __metadata("design:type", Date)
], StudentProfileResponseDto.prototype, "createdAt", void 0);
//# sourceMappingURL=student-response.dto.js.map