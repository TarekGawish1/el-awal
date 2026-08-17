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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthTokensResponseDto = exports.AuthUserDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class AuthUserDto {
}
exports.AuthUserDto = AuthUserDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' }),
    __metadata("design:type", String)
], AuthUserDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'أحمد محمود' }),
    __metadata("design:type", String)
], AuthUserDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'teacher@elawal.com' }),
    __metadata("design:type", String)
], AuthUserDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+201012345678' }),
    __metadata("design:type", String)
], AuthUserDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.UserRole, example: client_1.UserRole.TEACHER }),
    __metadata("design:type", String)
], AuthUserDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' }),
    __metadata("design:type", String)
], AuthUserDto.prototype, "teacherProfileId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e' }),
    __metadata("design:type", String)
], AuthUserDto.prototype, "studentProfileId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f' }),
    __metadata("design:type", String)
], AuthUserDto.prototype, "parentProfileId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a' }),
    __metadata("design:type", String)
], AuthUserDto.prototype, "secretariatProfileId", void 0);
class AuthTokensResponseDto {
}
exports.AuthTokensResponseDto = AuthTokensResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Short-lived JWT Access Token' }),
    __metadata("design:type", String)
], AuthTokensResponseDto.prototype, "accessToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Long-lived JWT Refresh Token' }),
    __metadata("design:type", String)
], AuthTokensResponseDto.prototype, "refreshToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Bearer' }),
    __metadata("design:type", String)
], AuthTokensResponseDto.prototype, "tokenType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Access token expiration in seconds', example: 900 }),
    __metadata("design:type", Number)
], AuthTokensResponseDto.prototype, "expiresIn", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: AuthUserDto }),
    __metadata("design:type", AuthUserDto)
], AuthTokensResponseDto.prototype, "user", void 0);
//# sourceMappingURL=auth-response.dto.js.map