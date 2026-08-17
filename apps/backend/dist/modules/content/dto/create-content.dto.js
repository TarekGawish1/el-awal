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
exports.CreateContentDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class CreateContentDto {
}
exports.CreateContentDto = CreateContentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ملخص النحو - الوحدة الأولى', minLength: 3 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Title is required' }),
    (0, class_validator_1.MinLength)(3),
    __metadata("design:type", String)
], CreateContentDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'ملف PDF يحتوي على ملخص شامل لدروس همزة القطع والوصل والمشتقات' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateContentDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.ContentType, example: client_1.ContentType.SUMMARY }),
    (0, class_validator_1.IsEnum)(client_1.ContentType),
    __metadata("design:type", typeof (_a = typeof client_1.ContentType !== "undefined" && client_1.ContentType) === "function" ? _a : Object)
], CreateContentDto.prototype, "contentType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Cloudflare R2 object key', example: 'uploads/courses/1723820000-summary.pdf' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'File key is required' }),
    __metadata("design:type", String)
], CreateContentDto.prototype, "fileKey", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Public or presigned URL for file', example: 'https://cdn.elawal.com/uploads/courses/1723820000-summary.pdf' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'File URL is required' }),
    __metadata("design:type", String)
], CreateContentDto.prototype, "fileUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'File size in bytes', example: 5242880 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateContentDto.prototype, "fileSize", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'MIME type', example: 'application/pdf' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateContentDto.prototype, "mimeType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Academic physical group ID to attach asset to' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateContentDto.prototype, "groupId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Course lesson ID to attach asset to' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateContentDto.prototype, "lessonId", void 0);
//# sourceMappingURL=create-content.dto.js.map