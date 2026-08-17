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
exports.BatchProgressSyncDto = exports.SyncOperationItemDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class SyncOperationItemDto {
}
exports.SyncOperationItemDto = SyncOperationItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Client-generated UUIDv4 for idempotency deduplication' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SyncOperationItemDto.prototype, "clientOperationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Course ID' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SyncOperationItemDto.prototype, "courseId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Lesson ID' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SyncOperationItemDto.prototype, "lessonId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Last playback position in seconds', minimum: 0, maximum: 86400 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(86400),
    __metadata("design:type", Number)
], SyncOperationItemDto.prototype, "positionSeconds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether lesson has reached completed milestone' }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SyncOperationItemDto.prototype, "isCompleted", void 0);
class BatchProgressSyncDto {
}
exports.BatchProgressSyncDto = BatchProgressSyncDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [SyncOperationItemDto], description: 'Array of staged offline progress operations (Max 50)' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ArrayMaxSize)(50),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SyncOperationItemDto),
    __metadata("design:type", Array)
], BatchProgressSyncDto.prototype, "operations", void 0);
//# sourceMappingURL=batch-progress-sync.dto.js.map