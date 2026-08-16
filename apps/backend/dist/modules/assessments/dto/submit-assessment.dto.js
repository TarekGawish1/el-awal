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
exports.SubmitAssessmentDto = exports.StudentAnswerItemDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class StudentAnswerItemDto {
}
exports.StudentAnswerItemDto = StudentAnswerItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Target question UUID',
        example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], StudentAnswerItemDto.prototype, "questionId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Student supplied answer choice or essay text',
        example: 'خبر كان منصوب',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], StudentAnswerItemDto.prototype, "answerGiven", void 0);
class SubmitAssessmentDto {
}
exports.SubmitAssessmentDto = SubmitAssessmentDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        type: [StudentAnswerItemDto],
        description: 'Array of student question answers',
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => StudentAnswerItemDto),
    __metadata("design:type", Array)
], SubmitAssessmentDto.prototype, "answers", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Optional student attachment URL (e.g. uploaded handwritten essay scan)',
        example: 'https://cdn.elawal.com/uploads/assignments/essay-scan.pdf',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitAssessmentDto.prototype, "attachmentUrl", void 0);
//# sourceMappingURL=submit-assessment.dto.js.map