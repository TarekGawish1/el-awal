export declare const ALLOWED_MIME_TYPES: readonly ["application/pdf", "image/jpeg", "image/png", "image/webp", "audio/mpeg", "audio/mp3", "audio/wav", "video/mp4", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"];
export declare class PresignedUploadDto {
    fileName: string;
    contentType: string;
    fileSizeBytes?: number;
    folder?: string;
}
