import { ContentType } from '@prisma/client';
export declare class CreateContentDto {
    title: string;
    description?: string;
    contentType: ContentType;
    fileKey: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
    groupId?: string;
    lessonId?: string;
}
