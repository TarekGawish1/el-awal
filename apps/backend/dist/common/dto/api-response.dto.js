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
exports.ApiErrorDto = exports.ApiResponseDto = exports.PaginationMetaDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class PaginationMetaDto {
}
exports.PaginationMetaDto = PaginationMetaDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Cursor to fetch the next page' }),
    __metadata("design:type", String)
], PaginationMetaDto.prototype, "nextCursor", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Cursor to fetch the previous page' }),
    __metadata("design:type", String)
], PaginationMetaDto.prototype, "prevCursor", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether additional pages exist' }),
    __metadata("design:type", Boolean)
], PaginationMetaDto.prototype, "hasMore", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Requested limit per page' }),
    __metadata("design:type", Number)
], PaginationMetaDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Total record count if calculated' }),
    __metadata("design:type", Number)
], PaginationMetaDto.prototype, "total", void 0);
class ApiResponseDto {
}
exports.ApiResponseDto = ApiResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Operation success indicator', default: true }),
    __metadata("design:type", Boolean)
], ApiResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Payload data' }),
    __metadata("design:type", Object)
], ApiResponseDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Pagination or auxiliary metadata', type: PaginationMetaDto }),
    __metadata("design:type", PaginationMetaDto)
], ApiResponseDto.prototype, "meta", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ISO8601 response generation timestamp' }),
    __metadata("design:type", String)
], ApiResponseDto.prototype, "timestamp", void 0);
class ApiErrorDto {
}
exports.ApiErrorDto = ApiErrorDto;
__decorate([
    (0, swagger_1.ApiProperty)({ default: false }),
    __metadata("design:type", Boolean)
], ApiErrorDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ApiErrorDto.prototype, "statusCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ApiErrorDto.prototype, "error", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ApiErrorDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Object)
], ApiErrorDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ApiErrorDto.prototype, "timestamp", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ApiErrorDto.prototype, "path", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], ApiErrorDto.prototype, "correlationId", void 0);
//# sourceMappingURL=api-response.dto.js.map