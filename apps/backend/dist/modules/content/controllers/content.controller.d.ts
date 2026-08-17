import { ContentService } from '../services/content.service';
import { PresignedUploadDto } from '../dto/presigned-upload.dto';
import { CreateContentDto } from '../dto/create-content.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { ContentType } from '@prisma/client';
export declare class ContentController {
    private readonly contentService;
    constructor(contentService: ContentService);
    getUploadUrl(dto: PresignedUploadDto): Promise<{
        uploadUrl: string;
        fileKey: string;
        publicUrl: string;
        expiresInSeconds: number;
    }>;
    createContent(dto: CreateContentDto, user: AuthenticatedUser): Promise<{
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
    listContent(user: AuthenticatedUser, groupId?: string, lessonId?: string, contentType?: ContentType): Promise<{
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
