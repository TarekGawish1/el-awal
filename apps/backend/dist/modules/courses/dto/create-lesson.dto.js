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
exports.CreateLessonDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateLessonDto {
}
exports.CreateLessonDto = CreateLessonDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Lesson title',
        example: 'الدرس الأول: همزة القطع وألف الوصل',
        minLength: 3,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Lesson title is required' }),
    (0, class_validator_1.MinLength)(3, { message: 'Lesson title must be at least 3 characters' }),
    __metadata("design:type", String)
], CreateLessonDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Lesson description or learning objectives',
        example: 'التعرف على مواضع همزة القطع وألف الوصل في الأسماء والأفعال والحروف.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLessonDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Lesson sequence index within the module',
        example: 1,
        minimum: 1,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateLessonDto.prototype, "orderIndex", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Type of curriculum item',
        enum: ['VIDEO', 'DOCUMENT', 'QUIZ'],
        example: 'VIDEO',
        default: 'VIDEO',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['VIDEO', 'DOCUMENT', 'QUIZ']),
    __metadata("design:type", String)
], CreateLessonDto.prototype, "lessonType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Bunny Stream Video GUID for video streaming',
        example: '9f8a7b6c-5d4e-3f2a-1b0c-9e8d7c6b5a4f',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLessonDto.prototype, "bunnyVideoId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Cloudflare R2 storage key or download link for PDF/documents',
        example: 'courses/arabic/summaries/lesson-01.pdf',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLessonDto.prototype, "contentUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Estimated video duration in seconds',
        example: 1800,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateLessonDto.prototype, "videoDurationSeconds", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Whether non-enrolled students can access this lesson as a free preview sample',
        example: false,
        default: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateLessonDto.prototype, "isFreePreview", void 0);
//# sourceMappingURL=create-lesson.dto.js.map