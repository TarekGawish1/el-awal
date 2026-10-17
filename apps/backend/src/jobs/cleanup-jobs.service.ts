import { Injectable, Logger, Optional } from '@nestjs/common';
import { StorageCleanupService } from '../integrations/storage/storage-cleanup.service';

@Injectable()
export class CleanupJobsService {
  private readonly logger = new Logger(CleanupJobsService.name);

  constructor(
    @Optional() private readonly storageCleanup?: StorageCleanupService,
  ) {}

  /**
   * Self-ping the app's health endpoint to prevent Heroku Eco dyno sleep.
   */
  runKeepAlivePing(): void {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || '';
    if (!appUrl) {
      return;
    }

    try {
      const targetUrl = `${appUrl.replace(/\/$/, '')}/api/health`;
      const lib = targetUrl.startsWith('https') ? require('https') : require('http');
      const req = lib.get(targetUrl, (res: any) => {
        this.logger.debug(`[KeepAlive] Ping ${targetUrl} → HTTP ${res.statusCode}`);
        res.resume();
      });
      req.on('error', (err: Error) => {
        this.logger.warn(`[KeepAlive] Ping failed: ${err.message}`);
      });
      req.setTimeout(10_000, () => {
        req.destroy();
        this.logger.warn('[KeepAlive] Ping timed out after 10s');
      });
    } catch (err) {
      this.logger.warn(`[KeepAlive] Unexpected ping error: ${err}`);
    }
  }

  /**
   * Daily Cloudflare R2 orphan storage reconciliation.
   */
  async runStorageOrphanCleanup(): Promise<void> {
    if (!this.storageCleanup) {
      this.logger.warn('StorageCleanupService is not available; skipping orphan cleanup.');
      return;
    }
    this.logger.log('🧹 [StorageCleanup] Running scheduled daily Cloudflare R2 orphan scan...');
    try {
      const report = await this.storageCleanup.scanAndCleanOrphans({
        dryRun: false,
        gracePeriodHours: 24,
      });
      const freedMb = (report.freedSizeBytes / (1024 * 1024)).toFixed(2);
      this.logger.log(
        `🧹 [StorageCleanup] Daily cleanup completed: ${report.deletedCount} orphans purged, ${freedMb} MB freed (total R2 objects: ${report.totalR2Objects}, protected recent: ${report.recentProtectedCount}) in ${report.durationMs}ms`,
      );
    } catch (err: any) {
      this.logger.error(`❌ [StorageCleanup] Daily cleanup failed: ${err.message}`, err.stack);
    }
  }
}
