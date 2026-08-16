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
        groupId: string | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        teacherId: string;
        title: string;
        lessonId: string | null;
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
        _count: {
            progresses: number;
        };
        lesson: {
            id: string;
            title: string;
        };
        id: string;
        groupId: string | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        teacherId: string;
        title: string;
        lessonId: string | null;
        contentType: import(".prisma/client").$Enums.ContentType;
        fileKey: string;
        fileUrl: string;
        mimeType: string | null;
    }[]>;
}
