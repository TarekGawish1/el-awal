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
        teacherId: string;
        groupId: string | null;
        lessonId: string | null;
        title: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        contentType: import(".prisma/client").$Enums.ContentType;
        fileKey: string;
        fileUrl: string;
        fileSize: bigint | null;
        mimeType: string | null;
    }>;
    listContent(user: AuthenticatedUser, groupId?: string, lessonId?: string, contentType?: ContentType): Promise<{
        fileSize: number;
        group: {
            id: string;
            name: string;
        };
        lesson: {
            id: string;
            title: string;
        };
        _count: {
            progresses: number;
        };
        id: string;
        teacherId: string;
        groupId: string | null;
        lessonId: string | null;
        title: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        contentType: import(".prisma/client").$Enums.ContentType;
        fileKey: string;
        fileUrl: string;
        mimeType: string | null;
    }[]>;
}
