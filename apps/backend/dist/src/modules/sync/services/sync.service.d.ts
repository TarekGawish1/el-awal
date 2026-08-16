import { CoursesService } from '../../courses/services/courses.service';
import { BatchProgressSyncDto } from '../dto/batch-progress-sync.dto';
export declare class SyncService {
    private readonly coursesService;
    private readonly logger;
    constructor(coursesService: CoursesService);
    processBatchProgress(studentId: string, dto: BatchProgressSyncDto): Promise<import("../../courses/repositories/course-progress.repository").SyncBatchResult>;
}
