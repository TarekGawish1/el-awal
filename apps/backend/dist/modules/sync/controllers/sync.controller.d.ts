import { SyncService } from '../services/sync.service';
import { BatchProgressSyncDto } from '../dto/batch-progress-sync.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
export declare class SyncController {
    private readonly syncService;
    constructor(syncService: SyncService);
    syncProgress(dto: BatchProgressSyncDto, user: AuthenticatedUser): Promise<import("../../courses/repositories/course-progress.repository").SyncBatchResult>;
}
