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
exports.GradeSubmissionDto = exports.ManualQuestionGradeDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class ManualQuestionGradeDto {
}
exports.ManualQuestionGradeDto = ManualQuestionGradeDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Target question ID',
        example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ManualQuestionGradeDto.prototype, "questionId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Score awarded to the essay question',
        example: 4.5,
        minimum: 0,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ManualQuestionGradeDto.prototype, "pointsEarned", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Teacher feedback on this specific question',
        example: 'إجابة ممتازة وواضحة، ينقصها فقط الاستشهاد ببيت الشعر.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ManualQuestionGradeDto.prototype, "teacherFeedback", void 0);
class GradeSubmissionDto {
}
exports.GradeSubmissionDto = GradeSubmissionDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Overall teacher feedback note on the submission',
        example: 'مستوى ممتاز، واصل التقدم والمراجعة الدورية.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GradeSubmissionDto.prototype, "feedback", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: [ManualQuestionGradeDto],
        description: 'Array of manual grades for essay/subjective questions',
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ManualQuestionGradeDto),
    __metadata("design:type", Array)
], GradeSubmissionDto.prototype, "manualGrades", void 0);
//# sourceMappingURL=grade-submission.dto.js.map