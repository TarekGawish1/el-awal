import { ConfigService } from '@nestjs/config';
export interface CreateVideoResult {
    videoId: string;
    directUploadUrl: string;
}
export interface VideoDetailsResult {
    videoId: string;
    title: string;
    duration: number;
    status: number;
    statusText: string;
    encodeProgress: number;
}
export declare class BunnyVideoService {
    private readonly configService;
    private readonly logger;
    private readonly apiKey;
    private readonly libraryId;
    private readonly cdnHostname;
    private readonly tokenSecurityKey;
    constructor(configService: ConfigService);
    createDirectUploadVideo(title: string): Promise<CreateVideoResult>;
    generateSecurePlaybackUrl(videoId: string, expiresInSeconds?: number): string;
    getVideoDetails(videoId: string): Promise<VideoDetailsResult>;
}
