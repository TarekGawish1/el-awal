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
export declare class CourseProgressRepository {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    upsertRealtimeProgress(studentId: string, lessonId: string, courseId: string, positionSeconds: number, isCompleted?: boolean): Promise<CourseProgress>;
    syncProgressItem(studentId: string, item: SyncProgressItemDto): Promise<CourseProgress>;
    syncBatch(studentId: string, items: SyncProgressItemDto[]): Promise<SyncBatchResult>;
    calculateCourseProgressPercentage(studentId: string, courseId: string): Promise<number>;
}
