import { PrismaService } from '../../../core/database/prisma.service';
import { StorageService } from '../../../integrations/storage/storage.service';
import { ContentType } from '@prisma/client';
export interface CreateContentDto {
    title: string;
    description?: string;
    contentType: ContentType;
    fileKey: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
    groupId?: string;
    lessonId?: string;
    teacherId: string;
}
export declare class ContentService {
    private readonly prisma;
    private readonly storageService;
    constructor(prisma: PrismaService, storageService: StorageService);
    createContent(dto: CreateContentDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        teacherId: string;
        groupId: string | null;
        fileKey: string;
        title: string;
        lessonId: string | null;
        contentType: import(".prisma/client").$Enums.ContentType;
        fileUrl: string;
        fileSize: bigint | null;
        mimeType: string | null;
    }>;
    getPresignedUpload(fileName: string, mimeType: string): Promise<import("../../../integrations/storage/storage.service").PresignedUploadResult>;
}
