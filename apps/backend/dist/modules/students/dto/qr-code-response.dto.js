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
exports.StudentQrCodeResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class StudentQrCodeResponseDto {
}
exports.StudentQrCodeResponseDto = StudentQrCodeResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e' }),
    __metadata("design:type", String)
], StudentQrCodeResponseDto.prototype, "studentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'STU-2026-0001' }),
    __metadata("design:type", String)
], StudentQrCodeResponseDto.prototype, "studentCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'محمود أحمد علي' }),
    __metadata("design:type", String)
], StudentQrCodeResponseDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'الصف الثالث الثانوي' }),
    __metadata("design:type", String)
], StudentQrCodeResponseDto.prototype, "gradeLevel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Cryptographic high-entropy opaque token for roll-call badge',
        example: 'qr_tok_9f8a7b6c5d4e3f2a1b0c9e8d7c6b5a4f',
    }),
    __metadata("design:type", String)
], StudentQrCodeResponseDto.prototype, "qrCodeToken", void 0);
//# sourceMappingURL=qr-code-response.dto.js.map