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
exports.CreateQuestionDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class CreateQuestionDto {
}
exports.CreateQuestionDto = CreateQuestionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Question number/sequence in the assessment',
        example: 1,
        minimum: 1,
    }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateQuestionDto.prototype, "questionNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Question prompt text',
        example: 'ما هو إعراب كلمة "طالباً" في جملة: "كان محمدٌ طالباً مجتهداً"؟',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Question text is required' }),
    __metadata("design:type", String)
], CreateQuestionDto.prototype, "questionText", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.QuestionType,
        example: client_1.QuestionType.MULTIPLE_CHOICE,
    }),
    (0, class_validator_1.IsEnum)(client_1.QuestionType),
    __metadata("design:type", typeof (_a = typeof client_1.QuestionType !== "undefined" && client_1.QuestionType) === "function" ? _a : Object)
], CreateQuestionDto.prototype, "questionType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Options array for multiple choice questions',
        example: ['اسم كان مرفوع', 'خبر كان منصوب', 'نعت مجرور', 'مفعول به'],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreateQuestionDto.prototype, "optionsData", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Correct answer string used for automated grading',
        example: 'خبر كان منصوب',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Correct answer is required' }),
    __metadata("design:type", String)
], CreateQuestionDto.prototype, "correctAnswer", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Explanation shown during post-submission review',
        example: 'كان فعل ماض ناقص ناسخ يرفع المبتدأ وينصب الخبر، فطالباً خبر كان منصوب وعلامة نصبه الفتحة.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateQuestionDto.prototype, "explanation", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Point value allocated to this question',
        example: 2.0,
        minimum: 0.5,
        default: 1.0,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.1),
    __metadata("design:type", Number)
], CreateQuestionDto.prototype, "points", void 0);
//# sourceMappingURL=create-question.dto.js.map