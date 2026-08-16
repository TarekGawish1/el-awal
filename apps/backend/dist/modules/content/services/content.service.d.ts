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
        teacherId: string;
        title: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        lessonId: string | null;
        groupId: string | null;
        contentType: import(".prisma/client").$Enums.ContentType;
        fileKey: string;
        fileUrl: string;
        fileSize: bigint | null;
        mimeType: string | null;
    }>;
    listTeacherContent(teacherId: string, groupId?: string, lessonId?: string, contentType?: ContentType): Promise<{
        fileSize: number;
        _count: {
            progresses: number;
        };
        lesson: {
            id: string;
            title: string;
        };
        group: {
            id: string;
            name: string;
        };
        id: string;
        teacherId: string;
        title: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        lessonId: string | null;
        groupId: string | null;
        contentType: import(".prisma/client").$Enums.ContentType;
        fileKey: string;
        fileUrl: string;
        mimeType: string | null;
    }[]>;
}
