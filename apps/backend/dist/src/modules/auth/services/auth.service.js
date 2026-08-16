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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcrypt");
const prisma_service_1 = require("../../../core/database/prisma.service");
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, jwtService, configService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
        this.logger = new common_1.Logger(AuthService_1.name);
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
        const payload = {
            sub: user.id,
            email: user.email || undefined,
            phone: user.phone || undefined,
            role: user.role,
        };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m'),
            }),
            this.jwtService.signAsync(payload, {
                expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
            }),
        ]);
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
            expiresIn: 900,
            user: userProfile,
        };
    }
    async refreshToken(dto) {
        try {
            const decoded = await this.jwtService.verifyAsync(dto.refreshToken, {
                secret: this.configService.get('JWT_SECRET', 'super-secret-jwt-key-change-in-production-env'),
            });
            const user = await this.prisma.user.findUnique({
                where: { id: decoded.sub },
            });
            if (!user || !user.isActive || user.deletedAt) {
                throw new common_1.UnauthorizedException('User account is inactive or no longer exists');
            }
            const payload = {
                sub: user.id,
                email: user.email || undefined,
                phone: user.phone || undefined,
                role: user.role,
            };
            const [newAccessToken, newRefreshToken] = await Promise.all([
                this.jwtService.signAsync(payload, {
                    expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m'),
                }),
                this.jwtService.signAsync(payload, {
                    expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
                }),
            ]);
            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            };
        }
        catch (error) {
            this.logger.error('Refresh token verification failed:', error);
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
    }
    async hashPassword(password) {
        const saltRounds = 10;
        return bcrypt.hash(password, saltRounds);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, typeof (_a = typeof jwt_1.JwtService !== "undefined" && jwt_1.JwtService) === "function" ? _a : Object, config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map