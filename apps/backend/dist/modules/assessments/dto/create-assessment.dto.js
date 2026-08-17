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
exports.CreateAssessmentDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const create_question_dto_1 = require("./create-question.dto");
class CreateAssessmentDto {
}
exports.CreateAssessmentDto = CreateAssessmentDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Assessment title',
        example: 'اختبار النحو والبلاغة الشامل - الوحدة الأولى',
        minLength: 3,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Title is required' }),
    (0, class_validator_1.MinLength)(3),
    __metadata("design:type", String)
], CreateAssessmentDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Assessment description and student guidelines',
        example: 'اختبار شامل مدته 45 دقيقة يحتوي على أسئلة اختيار من متعدد وسؤال مقالي.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssessmentDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.AssessmentType,
        example: client_1.AssessmentType.EXAM,
    }),
    (0, class_validator_1.IsEnum)(client_1.AssessmentType),
    __metadata("design:type", typeof (_a = typeof client_1.AssessmentType !== "undefined" && client_1.AssessmentType) === "function" ? _a : Object)
], CreateAssessmentDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total exam maximum score',
        example: 20.0,
        minimum: 1.0,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1.0),
    __metadata("design:type", Number)
], CreateAssessmentDto.prototype, "totalScore", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Minimum passing score threshold',
        example: 10.0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateAssessmentDto.prototype, "passingScore", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Test duration limit in minutes',
        example: 45,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateAssessmentDto.prototype, "durationMinutes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Submission cut-off date and time (ISO format)',
        example: '2026-09-30T23:59:59.000Z',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateAssessmentDto.prototype, "dueDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Target physical classroom group ID',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateAssessmentDto.prototype, "groupId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Target online course ID',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateAssessmentDto.prototype, "courseId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Target lesson ID',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateAssessmentDto.prototype, "lessonId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Whether the assessment is active and visible to students',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateAssessmentDto.prototype, "isPublished", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: [create_question_dto_1.CreateQuestionDto],
        description: 'Array of assessment questions',
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => create_question_dto_1.CreateQuestionDto),
    __metadata("design:type", Array)
], CreateAssessmentDto.prototype, "questions", void 0);
//# sourceMappingURL=create-assessment.dto.js.map