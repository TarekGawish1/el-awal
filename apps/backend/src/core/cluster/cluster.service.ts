import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

export interface ClusterStatus {
  mode: 'clustered' | 'standalone';
  primaryPid: number;
  currentWorkerId: string;
  currentWorkerPid: number;
  activeWorkersCount: number;
  workers: Array<{ id: string; pid: number }>;
  examModeActive: boolean;
  examModeExpiresAt: string | null;
  timestamp: string;
}

@Injectable()
export class ClusterService implements OnModuleInit {
  private readonly logger = new Logger(ClusterService.name);
  private cachedClusterState: Partial<ClusterStatus> = {
    mode: process.env.WORKER_ID ? 'clustered' : 'standalone',
    activeWorkersCount: 1,
    examModeActive: false,
    examModeExpiresAt: null,
  };

  onModuleInit() {
    const workerId = this.getWorkerId();
    this.logger.log(`⚡ [ClusterService] Worker ${workerId} initialized (PID: ${process.pid})`);

    // Listen to IPC broadcasts from ClusterMaster
    if (typeof process.on === 'function') {
      process.on('message', (msg: any) => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.action === 'CLUSTER_STATE_UPDATE' || msg.action === 'CLUSTER_STATUS_RESPONSE') {
          this.cachedClusterState = {
            ...this.cachedClusterState,
            ...msg.data,
          };
        }
      });
    }
  }

  /**
   * Returns true if this process is Worker 1 (or standalone process).
   * Scheduled crons and unique background tasks MUST only run if isPrimaryWorker() is true.
   */
  isPrimaryWorker(): boolean {
    return !process.env.WORKER_ID || process.env.WORKER_ID === '1';
  }

  /**
   * Returns current worker identifier ('1', '2', or 'standalone').
   */
  getWorkerId(): string {
    return process.env.WORKER_ID || '1';
  }

  /**
   * Returns whether the application is running under cluster mode.
   */
  isClustered(): boolean {
    return Boolean(process.env.WORKER_ID);
  }

  /**
   * Triggers an on-demand scale up to spawn Worker 2 (Exam Mode).
   * @param durationMinutes How many minutes Worker 2 should stay active before auto-shutting down (default 120 min).
   */
  async scaleUp(durationMinutes: number = 120): Promise<{ success: boolean; message: string }> {
    if (!this.isClustered() || typeof process.send !== 'function') {
      return {
        success: false,
        message: 'Application is running in standalone single-process mode (clustering disabled).',
      };
    }

    this.logger.log(`📢 Sending CLUSTER_SCALE_UP signal to Primary process (duration: ${durationMinutes} min)...`);
    process.send({
      action: 'CLUSTER_SCALE_UP',
      durationMinutes,
    });

    this.cachedClusterState.examModeActive = true;
    this.cachedClusterState.examModeExpiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

    return {
      success: true,
      message: `تم تشغيل النسخة الثانية (Worker 2) بنجاح لوضع الامتحانات والذروة لمدة ${durationMinutes} دقيقة.`,
    };
  }

  /**
   * Triggers an on-demand scale down to stop Worker 2 and restore single-instance resource usage.
   */
  async scaleDown(): Promise<{ success: boolean; message: string }> {
    if (!this.isClustered() || typeof process.send !== 'function') {
      return {
        success: false,
        message: 'Application is running in standalone single-process mode (clustering disabled).',
      };
    }

    this.logger.log(`📢 Sending CLUSTER_SCALE_DOWN signal to Primary process...`);
    process.send({
      action: 'CLUSTER_SCALE_DOWN',
    });

    this.cachedClusterState.examModeActive = false;
    this.cachedClusterState.examModeExpiresAt = null;

    return {
      success: true,
      message: 'تم إيقاف النسخة الثانية (Worker 2) بلباقة واسترجاع السيرفر للوضع الاقتصادي.',
    };
  }

  /**
   * Returns current cluster status and memory usage.
   */
  async getStatus(): Promise<ClusterStatus> {
    const memory = process.memoryUsage();
    return {
      mode: this.isClustered() ? 'clustered' : 'standalone',
      primaryPid: this.cachedClusterState.primaryPid || process.pid,
      currentWorkerId: this.getWorkerId(),
      currentWorkerPid: process.pid,
      activeWorkersCount: this.cachedClusterState.activeWorkersCount || 1,
      workers: this.cachedClusterState.workers || [{ id: this.getWorkerId(), pid: process.pid }],
      examModeActive: Boolean(this.cachedClusterState.examModeActive),
      examModeExpiresAt: this.cachedClusterState.examModeExpiresAt || null,
      timestamp: new Date().toISOString(),
    };
  }
}
