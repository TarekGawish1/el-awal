import { ContentService, CreateContentDto } from '../services/content.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
export declare class ContentController {
    private readonly contentService;
    constructor(contentService: ContentService);
    getUploadUrl(fileName: string, mimeType: string): Promise<import("../../../integrations/storage/storage.service").PresignedUploadResult>;
    createContent(dto: Omit<CreateContentDto, 'teacherId'>, user: AuthenticatedUser): Promise<{
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
}
