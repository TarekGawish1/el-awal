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
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
let StorageService = StorageService_1 = class StorageService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(StorageService_1.name);
        const accountId = this.configService.get('R2_ACCOUNT_ID', '');
        const accessKeyId = this.configService.get('R2_ACCESS_KEY_ID', '');
        const secretAccessKey = this.configService.get('R2_SECRET_ACCESS_KEY', '');
        this.bucketName = this.configService.get('R2_BUCKET_NAME', 'el-awal-assets');
        this.publicUrlBase = this.configService.get('R2_PUBLIC_URL', 'https://assets.elawal.com');
        this.s3Client = new client_s3_1.S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
    }
    async generatePresignedUploadUrl(key, contentType, expiresInSeconds = 3600) {
        try {
            const command = new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                ContentType: contentType,
            });
            const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, {
                expiresIn: expiresInSeconds,
            });
            return {
                uploadUrl,
                fileKey: key,
                publicUrl: `${this.publicUrlBase}/${key}`,
            };
        }
        catch (error) {
            this.logger.error(`Failed to generate presigned upload URL for key [${key}]:`, error);
            throw error;
        }
    }
    async generatePresignedDownloadUrl(key, expiresInSeconds = 3600) {
        try {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });
            return await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, {
                expiresIn: expiresInSeconds,
            });
        }
        catch (error) {
            this.logger.error(`Failed to generate presigned download URL for key [${key}]:`, error);
            throw error;
        }
    }
    async deleteObject(key) {
        try {
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });
            await this.s3Client.send(command);
            this.logger.log(`Deleted object [${key}] from R2 bucket [${this.bucketName}]`);
        }
        catch (error) {
            this.logger.error(`Failed to delete object [${key}] from R2:`, error);
            throw error;
        }
    }
    getPublicUrl(key) {
        return `${this.publicUrlBase}/${key}`;
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StorageService);
//# sourceMappingURL=storage.service.js.map