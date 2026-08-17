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
exports.StudentQueryDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const cursor_pagination_dto_1 = require("../../../common/dto/cursor-pagination.dto");
class StudentQueryDto extends cursor_pagination_dto_1.CursorPaginationDto {
}
exports.StudentQueryDto = StudentQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Text search matching student name, phone or code' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StudentQueryDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by grade level', example: 'الصف الثالث الثانوي' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StudentQueryDto.prototype, "gradeLevel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by academic stage', example: 'المرحلة الثانوية' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StudentQueryDto.prototype, "academicStage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by enrolled physical group ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], StudentQueryDto.prototype, "groupId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.StudentAcademicStatus, description: 'Filter by academic status' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.StudentAcademicStatus),
    __metadata("design:type", typeof (_a = typeof client_1.StudentAcademicStatus !== "undefined" && client_1.StudentAcademicStatus) === "function" ? _a : Object)
], StudentQueryDto.prototype, "academicStatus", void 0);
//# sourceMappingURL=student-query.dto.js.map