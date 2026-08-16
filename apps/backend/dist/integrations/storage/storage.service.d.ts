import { ConfigService } from '@nestjs/config';
export interface PresignedUploadResult {
    uploadUrl: string;
    fileKey: string;
    publicUrl?: string;
}
export declare class StorageService {
    private readonly configService;
    private readonly logger;
    private readonly s3Client;
    private readonly bucketName;
    private readonly publicUrlBase;
    constructor(configService: ConfigService);
    generatePresignedUploadUrl(key: string, contentType: string, expiresInSeconds?: number): Promise<PresignedUploadResult>;
    generatePresignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
    deleteObject(key: string): Promise<void>;
    getPublicUrl(key: string): string;
}
