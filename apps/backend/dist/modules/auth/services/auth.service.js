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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const bcrypt = require("bcrypt");
const prisma_service_1 = require("../../../core/database/prisma.service");
function parseDurationToMs(duration) {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match)
        return 7 * 24 * 60 * 60 * 1000;
    const val = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
        case 's': return val * 1000;
        case 'm': return val * 60 * 1000;
        case 'h': return val * 60 * 60 * 1000;
        case 'd': return val * 24 * 60 * 60 * 1000;
        default: return 7 * 24 * 60 * 60 * 1000;
    }
}
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, jwtService, configService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    hashToken(token) {
        return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    async login(dto) {
        const user = await this.prisma.user.findFirst({
            where: {
                OR: [{ phone: dto.identifier }, { email: dto.identifier }],
                isActive: true,
                deletedAt: null,
            },
            include: {
                teacherProfile: { select: { id: true } },
                studentProfile: { select: { id: true } },
                parentProfile: { select: { id: true } },
                secretariatProfile: { select: { id: true } },
            },
        });
        if (!user) {
            this.logger.warn(`Authentication failed: User [${dto.identifier}] not found or inactive`);
            throw new common_1.UnauthorizedException('Invalid credentials or account is inactive');
        }
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            this.logger.warn(`Authentication failed: Invalid password for user [${dto.identifier}]`);
            throw new common_1.UnauthorizedException('Invalid credentials or account is inactive');
        }
        const accessSecret = this.configService.getOrThrow('JWT_ACCESS_SECRET');
        const refreshSecret = this.configService.getOrThrow('JWT_REFRESH_SECRET');
        const accessExpiry = this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m');
        const refreshExpiry = this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d');
        const accessPayload = {
            sub: user.id,
            email: user.email || undefined,
            phone: user.phone || undefined,
            role: user.role,
            typ: 'access',
        };
        const refreshJti = (0, crypto_1.randomUUID)();
        const refreshPayload = {
            sub: user.id,
            email: user.email || undefined,
            phone: user.phone || undefined,
            role: user.role,
            typ: 'refresh',
            jti: refreshJti,
        };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(accessPayload, {
                secret: accessSecret,
                expiresIn: accessExpiry,
            }),
            this.jwtService.signAsync(refreshPayload, {
                secret: refreshSecret,
                expiresIn: refreshExpiry,
            }),
        ]);
        const refreshExpiryMs = parseDurationToMs(refreshExpiry);
        const expiresAt = new Date(Date.now() + refreshExpiryMs);
        const tokenHash = this.hashToken(refreshToken);
        await this.prisma.refreshTokenSession.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt,
            },
        });
        const userProfile = {
            id: user.id,
            fullName: user.fullName,
            email: user.email || undefined,
            phone: user.phone || undefined,
            role: user.role,
            teacherProfileId: user.teacherProfile?.id,
            studentProfileId: user.studentProfile?.id,
            parentProfileId: user.parentProfile?.id,
            secretariatProfileId: user.secretariatProfile?.id,
        };
        return {
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: Math.floor(parseDurationToMs(accessExpiry) / 1000),
            user: userProfile,
        };
    }
    async refreshToken(dto) {
        const refreshSecret = this.configService.getOrThrow('JWT_REFRESH_SECRET');
        const accessSecret = this.configService.getOrThrow('JWT_ACCESS_SECRET');
        const accessExpiry = this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m');
        const refreshExpiry = this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d');
        let decoded;
        try {
            decoded = await this.jwtService.verifyAsync(dto.refreshToken, {
                secret: refreshSecret,
            });
        }
        catch (error) {
            this.logger.error('Refresh token signature verification failed:', error);
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        if (decoded.typ !== 'refresh') {
            throw new common_1.UnauthorizedException('Invalid token type for refresh endpoint');
        }
        const tokenHash = this.hashToken(dto.refreshToken);
        const existingSession = await this.prisma.refreshTokenSession.findUnique({
            where: { tokenHash },
        });
        if (!existingSession) {
            this.logger.warn(`Refresh session not found for token hash`);
            throw new common_1.UnauthorizedException('Invalid refresh session');
        }
        if (existingSession.revokedAt) {
            this.logger.error(`Suspicious refresh token reuse detected for user ${existingSession.userId}. Revoking all sessions.`);
            await this.prisma.refreshTokenSession.updateMany({
                where: { userId: existingSession.userId, revokedAt: null },
                data: { revokedAt: new Date() },
            });
            throw new common_1.UnauthorizedException('Refresh token was revoked or reused');
        }
        if (existingSession.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Refresh token has expired');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: decoded.sub },
        });
        if (!user || !user.isActive || user.deletedAt) {
            throw new common_1.UnauthorizedException('User account is inactive or no longer exists');
        }
        const accessPayload = {
            sub: user.id,
            email: user.email || undefined,
            phone: user.phone || undefined,
            role: user.role,
            typ: 'access',
        };
        const newRefreshJti = (0, crypto_1.randomUUID)();
        const newRefreshPayload = {
            sub: user.id,
            email: user.email || undefined,
            phone: user.phone || undefined,
            role: user.role,
            typ: 'refresh',
            jti: newRefreshJti,
        };
        const [newAccessToken, newRefreshToken] = await Promise.all([
            this.jwtService.signAsync(accessPayload, {
                secret: accessSecret,
                expiresIn: accessExpiry,
            }),
            this.jwtService.signAsync(newRefreshPayload, {
                secret: refreshSecret,
                expiresIn: refreshExpiry,
            }),
        ]);
        const refreshExpiryMs = parseDurationToMs(refreshExpiry);
        const newExpiresAt = new Date(Date.now() + refreshExpiryMs);
        const newTokenHash = this.hashToken(newRefreshToken);
        const newSession = await this.prisma.refreshTokenSession.create({
            data: {
                userId: user.id,
                tokenHash: newTokenHash,
                expiresAt: newExpiresAt,
            },
        });
        await this.prisma.refreshTokenSession.update({
            where: { id: existingSession.id },
            data: {
                revokedAt: new Date(),
                replacedById: newSession.id,
            },
        });
        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        };
    }
    async logout(dto) {
        const tokenHash = this.hashToken(dto.refreshToken);
        await this.prisma.refreshTokenSession.updateMany({
            where: { tokenHash, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        return { success: true, message: 'Logged out successfully' };
    }
    async revokeAllUserSessions(userId) {
        await this.prisma.refreshTokenSession.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
    async hashPassword(password) {
        const saltRounds = 10;
        return bcrypt.hash(password, saltRounds);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map