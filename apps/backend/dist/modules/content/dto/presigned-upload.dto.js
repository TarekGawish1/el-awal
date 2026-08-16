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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresignedUploadDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class PresignedUploadDto {
}
exports.PresignedUploadDto = PresignedUploadDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Original file name including extension',
        example: 'arabic-grammar-summary.pdf',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'File name is required' }),
    __metadata("design:type", String)
], PresignedUploadDto.prototype, "fileName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'MIME type of the upload file',
        example: 'application/pdf',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Content type is required' }),
    __metadata("design:type", String)
], PresignedUploadDto.prototype, "contentType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'File size in bytes (max 100MB)',
        example: 10485760,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], PresignedUploadDto.prototype, "fileSizeBytes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Target storage directory partition',
        enum: ['courses', 'assignments', 'summaries', 'avatars'],
        example: 'courses',
        default: 'courses',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['courses', 'assignments', 'summaries', 'avatars']),
    __metadata("design:type", String)
], PresignedUploadDto.prototype, "folder", void 0);
//# sourceMappingURL=presigned-upload.dto.js.map