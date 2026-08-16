export declare class SyncOperationItemDto {
    clientOperationId: string;
    courseId: string;
    lessonId: string;
    positionSeconds: number;
    isCompleted: boolean;
}
export declare class BatchProgressSyncDto {
    operations: SyncOperationItemDto[];
}
