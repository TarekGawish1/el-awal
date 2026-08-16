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
var CourseProgressRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseProgressRepository = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../../../core/database/prisma.service");
let CourseProgressRepository = CourseProgressRepository_1 = class CourseProgressRepository {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(CourseProgressRepository_1.name);
    }
    async upsertRealtimeProgress(studentId, lessonId, courseId, positionSeconds, isCompleted = false) {
        return this.syncProgressItem(studentId, {
            clientOperationId: (0, crypto_1.randomUUID)(),
            lessonId,
            courseId,
            positionSeconds,
            isCompleted,
        });
    }
    async syncProgressItem(studentId, item) {
        const rows = await this.prisma.$queryRaw `
      INSERT INTO "course_progress" (
        "id",
        "lesson_id",
        "student_id",
        "course_id",
        "last_position_seconds",
        "is_completed",
        "first_accessed_at",
        "completed_at",
        "last_synced_at",
        "client_operation_id"
      ) VALUES (
        gen_random_uuid(),
        ${item.lessonId}::uuid,
        ${studentId}::uuid,
        ${item.courseId}::uuid,
        ${item.positionSeconds}::integer,
        ${item.isCompleted}::boolean,
        CURRENT_TIMESTAMP,
        CASE WHEN ${item.isCompleted} = true THEN CURRENT_TIMESTAMP ELSE NULL END,
        CURRENT_TIMESTAMP,
        ${item.clientOperationId}::uuid
      )
      ON CONFLICT ("lesson_id", "student_id") DO UPDATE SET
        "last_position_seconds" = GREATEST("course_progress"."last_position_seconds", EXCLUDED."last_position_seconds"),
        "is_completed" = ("course_progress"."is_completed" OR EXCLUDED."is_completed"),
        "completed_at" = CASE 
          WHEN "course_progress"."completed_at" IS NOT NULL THEN "course_progress"."completed_at"
          WHEN EXCLUDED."is_completed" = true THEN CURRENT_TIMESTAMP
          ELSE NULL 
        END,
        "last_synced_at" = CURRENT_TIMESTAMP,
        "client_operation_id" = EXCLUDED."client_operation_id"
      RETURNING *;
    `;
        return rows[0];
    }
    async syncBatch(studentId, items) {
        if (!items || items.length === 0) {
            return {
                syncedCount: 0,
                processedOperationIds: [],
                courseId: '',
                overallCourseCompletionPercentage: 0,
            };
        }
        const courseId = items[0].courseId;
        const processedIds = [];
        await this.prisma.$transaction(async (tx) => {
            for (const item of items) {
                await tx.$queryRaw `
          INSERT INTO "course_progress" (
            "id",
            "lesson_id",
            "student_id",
            "course_id",
            "last_position_seconds",
            "is_completed",
            "first_accessed_at",
            "completed_at",
            "last_synced_at",
            "client_operation_id"
          ) VALUES (
            gen_random_uuid(),
            ${item.lessonId}::uuid,
            ${studentId}::uuid,
            ${item.courseId}::uuid,
            ${item.positionSeconds}::integer,
            ${item.isCompleted}::boolean,
            CURRENT_TIMESTAMP,
            CASE WHEN ${item.isCompleted} = true THEN CURRENT_TIMESTAMP ELSE NULL END,
            CURRENT_TIMESTAMP,
            ${item.clientOperationId}::uuid
          )
          ON CONFLICT ("lesson_id", "student_id") DO UPDATE SET
            "last_position_seconds" = GREATEST("course_progress"."last_position_seconds", EXCLUDED."last_position_seconds"),
            "is_completed" = ("course_progress"."is_completed" OR EXCLUDED."is_completed"),
            "completed_at" = CASE 
              WHEN "course_progress"."completed_at" IS NOT NULL THEN "course_progress"."completed_at"
              WHEN EXCLUDED."is_completed" = true THEN CURRENT_TIMESTAMP
              ELSE NULL 
            END,
            "last_synced_at" = CURRENT_TIMESTAMP,
            "client_operation_id" = EXCLUDED."client_operation_id";
        `;
                processedIds.push(item.clientOperationId);
            }
        });
        const progressStats = await this.calculateCourseProgressPercentage(studentId, courseId);
        return {
            syncedCount: processedIds.length,
            processedOperationIds: processedIds,
            courseId,
            overallCourseCompletionPercentage: progressStats,
        };
    }
    async calculateCourseProgressPercentage(studentId, courseId) {
        const stats = await this.prisma.$queryRaw `
      SELECT 
        COUNT(cl.id) AS total_lessons,
        COUNT(cp.id) FILTER (WHERE cp.is_completed = true) AS completed_lessons
      FROM "course_lessons" cl
      JOIN "course_modules" cm ON cm.id = cl.module_id
      LEFT JOIN "course_progress" cp ON cp.lesson_id = cl.id AND cp.student_id = ${studentId}::uuid
      WHERE cm.course_id = ${courseId}::uuid;
    `;
        if (!stats || stats.length === 0)
            return 0;
        const total = Number(stats[0].total_lessons);
        const completed = Number(stats[0].completed_lessons);
        if (total === 0)
            return 0;
        return Math.round((completed / total) * 100);
    }
};
exports.CourseProgressRepository = CourseProgressRepository;
exports.CourseProgressRepository = CourseProgressRepository = CourseProgressRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CourseProgressRepository);
//# sourceMappingURL=course-progress.repository.js.map