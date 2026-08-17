import { PrismaService } from '../../../core/database/prisma.service';
import { StorageService } from '../../../integrations/storage/storage.service';
import { PresignedUploadDto } from '../dto/presigned-upload.dto';
import { CreateContentDto } from '../dto/create-content.dto';
import { ContentType } from '@prisma/client';
export declare class ContentService {
    private readonly prisma;
    private readonly storageService;
    private readonly logger;
    constructor(prisma: PrismaService, storageService: StorageService);
    generatePresignedUpload(dto: PresignedUploadDto): Promise<{
        uploadUrl: string;
        fileKey: string;
        publicUrl: string;
        expiresInSeconds: number;
    }>;
    createContent(teacherId: string, dto: CreateContentDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fileKey: string;
        title: string;
        description: string | null;
        groupId: string | null;
        teacherId: string;
        lessonId: string | null;
        contentType: import(".prisma/client").$Enums.ContentType;
        fileUrl: string;
        fileSize: bigint | null;
        mimeType: string | null;
    }>;
    listTeacherContent(teacherId: string, groupId?: string, lessonId?: string, contentType?: ContentType): Promise<{
        fileSize: number;
        _count: {
            progresses: number;
        };
        group: {
            id: string;
            name: string;
        };
        lesson: {
            id: string;
            title: string;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fileKey: string;
        title: string;
        description: string | null;
        groupId: string | null;
        teacherId: string;
        lessonId: string | null;
        contentType: import(".prisma/client").$Enums.ContentType;
        fileUrl: string;
        mimeType: string | null;
    }[]>;
}
