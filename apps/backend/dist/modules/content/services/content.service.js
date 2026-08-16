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
exports.ContentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../core/database/prisma.service");
const storage_service_1 = require("../../../integrations/storage/storage.service");
let ContentService = class ContentService {
    constructor(prisma, storageService) {
        this.prisma = prisma;
        this.storageService = storageService;
    }
    async createContent(dto) {
        return this.prisma.educationalContent.create({
            data: {
                title: dto.title,
                description: dto.description,
                contentType: dto.contentType,
                fileKey: dto.fileKey,
                fileUrl: dto.fileUrl,
                fileSize: dto.fileSize ? BigInt(dto.fileSize) : null,
                mimeType: dto.mimeType,
                groupId: dto.groupId,
                lessonId: dto.lessonId,
                teacherId: dto.teacherId,
            },
        });
    }
    async getPresignedUpload(fileName, mimeType) {
        const key = `uploads/${Date.now()}-${fileName}`;
        return this.storageService.generatePresignedUploadUrl(key, mimeType);
    }
};
exports.ContentService = ContentService;
exports.ContentService = ContentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        storage_service_1.StorageService])
], ContentService);
//# sourceMappingURL=content.service.js.map