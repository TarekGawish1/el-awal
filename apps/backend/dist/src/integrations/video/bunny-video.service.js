"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BunnyVideoService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BunnyVideoService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
let BunnyVideoService = BunnyVideoService_1 = class BunnyVideoService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(BunnyVideoService_1.name);
        this.apiKey = this.configService.get('BUNNY_API_KEY', '');
        this.libraryId = this.configService.get('BUNNY_LIBRARY_ID', '');
        this.cdnHostname = this.configService.get('BUNNY_CDN_HOSTNAME', 'video.elawal.com');
        this.tokenSecurityKey = this.configService.get('BUNNY_TOKEN_SECURITY_KEY', '');
    }
    async createDirectUploadVideo(title) {
        try {
            const response = await fetch(`https://video.bunnycdn.com/library/${this.libraryId}/videos`, {
                method: 'POST',
                headers: {
                    AccessKey: this.apiKey,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ title }),
            });
            if (!response.ok) {
                throw new Error(`Bunny API responded with status ${response.status}: ${await response.text()}`);
            }
            const data = (await response.json());
            const videoId = data.guid;
            const directUploadUrl = `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoId}`;
            return {
                videoId,
                directUploadUrl,
            };
        }
        catch (error) {
            this.logger.error(`Failed to create Bunny Stream video [${title}]:`, error);
            throw error;
        }
    }
    generateSecurePlaybackUrl(videoId, expiresInSeconds = 7200) {
        const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
        const rawSignature = `${this.tokenSecurityKey}${videoId}${expires}`;
        const token = (0, crypto_1.createHash)('sha256').update(rawSignature).digest('hex');
        return `https://${this.cdnHostname}/${videoId}/playlist.m3u8?token=${token}&expires=${expires}`;
    }
    async getVideoDetails(videoId) {
        try {
            const response = await fetch(`https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoId}`, {
                method: 'GET',
                headers: {
                    AccessKey: this.apiKey,
                    Accept: 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`Bunny API responded with status ${response.status}: ${await response.text()}`);
            }
            const data = (await response.json());
            const statusMap = {
                0: 'CREATED',
                1: 'UPLOADED',
                2: 'PROCESSING',
                3: 'TRANSCODING',
                4: 'FINISHED',
                5: 'ERROR',
            };
            return {
                videoId: data.guid,
                title: data.title,
                duration: data.length || 0,
                status: data.status,
                statusText: statusMap[data.status] || 'UNKNOWN',
                encodeProgress: data.encodeProgress || 0,
            };
        }
        catch (error) {
            this.logger.error(`Failed to get Bunny Stream video details for [${videoId}]:`, error);
            throw error;
        }
    }
};
exports.BunnyVideoService = BunnyVideoService;
exports.BunnyVideoService = BunnyVideoService = BunnyVideoService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], BunnyVideoService);
//# sourceMappingURL=bunny-video.service.js.map