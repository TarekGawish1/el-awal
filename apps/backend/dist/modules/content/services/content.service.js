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
var ContentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../../../core/database/prisma.service");
const storage_service_1 = require("../../../integrations/storage/storage.service");
let ContentService = ContentService_1 = class ContentService {
    constructor(prisma, storageService) {
        this.prisma = prisma;
        this.storageService = storageService;
        this.logger = new common_1.Logger(ContentService_1.name);
    }
    async generatePresignedUpload(dto) {
        const folder = dto.folder || 'courses';
        const sanitizedFileName = dto.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileKey = `uploads/${folder}/${Date.now()}-${(0, crypto_1.randomUUID)().slice(0, 8)}-${sanitizedFileName}`;
        const presigned = await this.storageService.generatePresignedUploadUrl(fileKey, dto.contentType, 900);
        return {
            uploadUrl: presigned.uploadUrl,
            fileKey: presigned.fileKey,
            publicUrl: presigned.publicUrl,
            expiresInSeconds: 900,
        };
    }
    async createContent(teacherId, dto) {
        if (dto.groupId) {
            const group = await this.prisma.academicGroup.findUnique({ where: { id: dto.groupId } });
            if (!group) {
                throw new common_1.NotFoundException(`Academic group [${dto.groupId}] not found`);
            }
            if (group.teacherId !== teacherId) {
                throw new common_1.ForbiddenException('You do not own this academic group');
            }
        }
        if (dto.lessonId) {
            const lesson = await this.prisma.courseLesson.findUnique({
                where: { id: dto.lessonId },
                include: { module: { include: { course: true } } },
            });
            if (!lesson) {
                throw new common_1.NotFoundException(`Course lesson [${dto.lessonId}] not found`);
            }
            if (lesson.module.course.teacherId !== teacherId) {
                throw new common_1.ForbiddenException('You do not own the course containing this lesson');
            }
        }
        return this.prisma.educationalContent.create({
            data: {
                title: dto.title,
                description: dto.description,
                contentType: dto.contentType,
                fileKey: dto.fileKey,
                fileUrl: dto.fileUrl,
                fileSize: dto.fileSize ? BigInt(dto.fileSize) : null,
                mimeType: dto.mimeType,
                teacherId,
                groupId: dto.groupId,
                lessonId: dto.lessonId,
            },
        });
    }
    async listTeacherContent(teacherId, groupId, lessonId, contentType) {
        const contents = await this.prisma.educationalContent.findMany({
            where: {
                teacherId,
                ...(groupId ? { groupId } : {}),
                ...(lessonId ? { lessonId } : {}),
                ...(contentType ? { contentType } : {}),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                group: { select: { id: true, name: true } },
                lesson: { select: { id: true, title: true } },
                _count: { select: { progresses: true } },
            },
        });
        return contents.map((c) => ({
            ...c,
            fileSize: c.fileSize ? Number(c.fileSize) : null,
        }));
    }
};
exports.ContentService = ContentService;
exports.ContentService = ContentService = ContentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        storage_service_1.StorageService])
], ContentService);
//# sourceMappingURL=content.service.js.map