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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssessmentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const assessments_service_1 = require("../services/assessments.service");
const create_assessment_dto_1 = require("../dto/create-assessment.dto");
const submit_assessment_dto_1 = require("../dto/submit-assessment.dto");
const grade_submission_dto_1 = require("../dto/grade-submission.dto");
const assessment_query_dto_1 = require("../dto/assessment-query.dto");
const roles_decorator_1 = require("../../../core/security/decorators/roles.decorator");
const current_user_decorator_1 = require("../../../core/security/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
let AssessmentsController = class AssessmentsController {
    constructor(assessmentsService) {
        this.assessmentsService = assessmentsService;
    }
    async createAssessment(dto, user) {
        const isSecretariat = user.role === client_1.UserRole.SECRETARIAT;
        return this.assessmentsService.createAssessment(user.teacherProfileId || user.id, isSecretariat, dto);
    }
    async getAssessments(query, user) {
        return this.assessmentsService.getAssessments(query, user);
    }
    async getAssessmentById(id, user) {
        return this.assessmentsService.getAssessmentById(id, user);
    }
    async submitAssessment(id, dto, user) {
        return this.assessmentsService.submitAssessment(id, user.studentProfileId || user.id, dto);
    }
    async gradeSubmission(submissionId, dto, user) {
        const isSecretariat = user.role === client_1.UserRole.SECRETARIAT;
        return this.assessmentsService.gradeSubmission(submissionId, user.teacherProfileId || user.id, isSecretariat, dto);
    }
    async getAssessmentSubmissions(id, user) {
        const isSecretariat = user.role === client_1.UserRole.SECRETARIAT;
        return this.assessmentsService.getAssessmentSubmissions(id, user.teacherProfileId || user.id, isSecretariat);
    }
};
exports.AssessmentsController = AssessmentsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({ summary: 'Create assignment or examination with question bank' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Assessment created' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Sum of question points does not match total score' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_assessment_dto_1.CreateAssessmentDto, Object]),
    __metadata("design:returntype", Promise)
], AssessmentsController.prototype, "createAssessment", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT, client_1.UserRole.STUDENT, client_1.UserRole.PARENT),
    (0, swagger_1.ApiOperation)({ summary: 'List assessments with Keyset pagination and course/group filters' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [assessment_query_dto_1.AssessmentQueryDto, Object]),
    __metadata("design:returntype", Promise)
], AssessmentsController.prototype, "getAssessments", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT, client_1.UserRole.STUDENT, client_1.UserRole.PARENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get assessment details and questions (Zero-Leak answer redaction for students)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AssessmentsController.prototype, "getAssessmentById", null);
__decorate([
    (0, common_1.Post)(':id/submit'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)(client_1.UserRole.STUDENT),
    (0, swagger_1.ApiOperation)({ summary: 'Submit student answers for synchronous auto-grading (Single attempt enforced)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Submission auto-graded or staged for manual review' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Assessment already submitted' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, submit_assessment_dto_1.SubmitAssessmentDto, Object]),
    __metadata("design:returntype", Promise)
], AssessmentsController.prototype, "submitAssessment", null);
__decorate([
    (0, common_1.Patch)('submissions/:submissionId/grade'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({ summary: 'Teacher manual grading for essay/subjective questions' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Submission graded and final score recomputed' }),
    __param(0, (0, common_1.Param)('submissionId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, grade_submission_dto_1.GradeSubmissionDto, Object]),
    __metadata("design:returntype", Promise)
], AssessmentsController.prototype, "gradeSubmission", null);
__decorate([
    (0, common_1.Get)(':id/submissions'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({ summary: 'List all student submissions for an assessment' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AssessmentsController.prototype, "getAssessmentSubmissions", null);
exports.AssessmentsController = AssessmentsController = __decorate([
    (0, swagger_1.ApiTags)('Academic Assessments & Auto-Grading'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('assessments'),
    __metadata("design:paramtypes", [assessments_service_1.AssessmentsService])
], AssessmentsController);
//# sourceMappingURL=assessments.controller.js.map