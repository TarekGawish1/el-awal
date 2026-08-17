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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const content_service_1 = require("../services/content.service");
const presigned_upload_dto_1 = require("../dto/presigned-upload.dto");
const create_content_dto_1 = require("../dto/create-content.dto");
const roles_decorator_1 = require("../../../core/security/decorators/roles.decorator");
const current_user_decorator_1 = require("../../../core/security/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
let ContentController = class ContentController {
    constructor(contentService) {
        this.contentService = contentService;
    }
    async getUploadUrl(dto) {
        return this.contentService.generatePresignedUpload(dto);
    }
    async createContent(dto, user) {
        return this.contentService.createContent(user.teacherProfileId || user.id, dto);
    }
    async listContent(user, groupId, lessonId, contentType) {
        return this.contentService.listTeacherContent(user.teacherProfileId || user.id, groupId, lessonId, contentType);
    }
};
exports.ContentController = ContentController;
__decorate([
    (0, common_1.Post)('presigned-upload-url'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({ summary: 'Generate presigned Cloudflare R2 direct upload URL' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Presigned upload URL generated' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [presigned_upload_dto_1.PresignedUploadDto]),
    __metadata("design:returntype", Promise)
], ContentController.prototype, "getUploadUrl", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({ summary: 'Register educational content metadata attached to group or lesson' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Educational content record created' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_content_dto_1.CreateContentDto, Object]),
    __metadata("design:returntype", Promise)
], ContentController.prototype, "createContent", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.TEACHER, client_1.UserRole.SECRETARIAT),
    (0, swagger_1.ApiOperation)({ summary: 'List uploaded educational materials for the authenticated instructor' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('groupId')),
    __param(2, (0, common_1.Query)('lessonId')),
    __param(3, (0, common_1.Query)('contentType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, typeof (_a = typeof client_1.ContentType !== "undefined" && client_1.ContentType) === "function" ? _a : Object]),
    __metadata("design:returntype", Promise)
], ContentController.prototype, "listContent", null);
exports.ContentController = ContentController = __decorate([
    (0, swagger_1.ApiTags)('Educational Content Library'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('content'),
    __metadata("design:paramtypes", [content_service_1.ContentService])
], ContentController);
//# sourceMappingURL=content.controller.js.map