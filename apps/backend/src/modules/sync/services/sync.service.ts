import { Injectable, Logger } from '@nestjs/common';
import { CoursesService } from '../../courses/services/courses.service';
import { BatchProgressSyncDto } from '../dto/batch-progress-sync.dto';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private readonly coursesService: CoursesService) {}

  /**
   * Orchestrates offline batch intake and delegates progress application to CoursesService.
   */
  async processBatchProgress(studentId: string, dto: BatchProgressSyncDto) {
    this.logger.log(`Processing offline sync batch with ${dto.operations.length} operations for student [${studentId}]`);
    return this.coursesService.applyMonotonicProgressBatch(studentId, dto.operations);
  }
}
