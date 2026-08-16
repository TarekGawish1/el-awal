import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../core/database/prisma.service';
import { CourseProgress } from '@prisma/client';

export interface SyncProgressItemDto {
  clientOperationId: string;
  lessonId: string;
  courseId: string;
  positionSeconds: number;
  isCompleted: boolean;
}

export interface SyncBatchResult {
  syncedCount: number;
  processedOperationIds: string[];
  courseId: string;
  overallCourseCompletionPercentage: number;
}

@Injectable()
export class CourseProgressRepository {
  private readonly logger = new Logger(CourseProgressRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Real-time monotonic progress update for video heartbeat streaming.
   */
  async upsertRealtimeProgress(
    studentId: string,
    lessonId: string,
    courseId: string,
    positionSeconds: number,
    isCompleted: boolean = false,
  ): Promise<CourseProgress> {
    return this.syncProgressItem(studentId, {
      clientOperationId: randomUUID(),
      lessonId,
      courseId,
      positionSeconds,
      isCompleted,
    });
  }

  /**
   * Monotonically merges a single lesson progress record from an offline outbox queue.
   */
  async syncProgressItem(
    studentId: string,
    item: SyncProgressItemDto,
  ): Promise<CourseProgress> {
    const rows = await this.prisma.$queryRaw<CourseProgress[]>`
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

  /**
   * Processes a batch of offline outbox progress operations in an atomic database transaction.
   */
  async syncBatch(
    studentId: string,
    items: SyncProgressItemDto[],
  ): Promise<SyncBatchResult> {
    if (!items || items.length === 0) {
      return {
        syncedCount: 0,
        processedOperationIds: [],
        courseId: '',
        overallCourseCompletionPercentage: 0,
      };
    }

    const courseId = items[0].courseId;
    const processedIds: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.$queryRaw`
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

  /**
   * Fast calculation of student's overall course progress percentage.
   */
  async calculateCourseProgressPercentage(
    studentId: string,
    courseId: string,
  ): Promise<number> {
    const stats = await this.prisma.$queryRaw<{ total_lessons: bigint; completed_lessons: bigint }[]>`
      SELECT 
        COUNT(cl.id) AS total_lessons,
        COUNT(cp.id) FILTER (WHERE cp.is_completed = true) AS completed_lessons
      FROM "course_lessons" cl
      JOIN "course_modules" cm ON cm.id = cl.module_id
      LEFT JOIN "course_progress" cp ON cp.lesson_id = cl.id AND cp.student_id = ${studentId}::uuid
      WHERE cm.course_id = ${courseId}::uuid;
    `;

    if (!stats || stats.length === 0) return 0;

    const total = Number(stats[0].total_lessons);
    const completed = Number(stats[0].completed_lessons);

    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  }
}
