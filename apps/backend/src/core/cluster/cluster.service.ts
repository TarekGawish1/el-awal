import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

export interface ClusterStatus {
  mode: 'clustered' | 'standalone';
  primaryPid: number;
  currentWorkerId: string;
  currentWorkerPid: number;
  activeWorkersCount: number;
  workers: Array<{ id: string; pid: number }>;
  examModeActive: boolean;
  examModeExpiresAt: string | null;
  currentRps: number;
  memoryUsage?: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
  };
  clusterMemory?: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
  };
  autoScaler: {
    enabled: boolean;
    surgeThresholdRps: number;
    surgeTriggered: boolean;
  };
  timestamp: string;
}

@Injectable()
export class ClusterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClusterService.name);
  private cachedClusterState: Partial<ClusterStatus> = {
    mode: process.env.WORKER_ID ? 'clustered' : 'standalone',
    activeWorkersCount: 1,
    examModeActive: false,
    examModeExpiresAt: null,
  };

  private currentSecondRequests = 0;
  private recentRpsHistory: number[] = [];
  private currentRps = 0;
  private surgeTriggered = false;
  private lowTrafficSecondsCount = 0;
  private autoScaleCooldownUntil = 0;
  private tickerInterval: NodeJS.Timeout | null = null;

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

    // Start 1-second rolling ticker for RPS monitoring and traffic surge auto-scaling
    this.tickerInterval = setInterval(() => this.tickRps(), 1000);
  }

  onModuleDestroy() {
    if (this.tickerInterval) {
      clearInterval(this.tickerInterval);
      this.tickerInterval = null;
    }
  }

  /**
   * Records an incoming HTTP request for live RPS calculation.
   * Called by Fastify onRequest hook.
   */
  recordRequest(): void {
    this.currentSecondRequests++;
  }

  /**
   * Returns current rolling average Requests Per Second.
   */
  getCurrentRps(): number {
    return this.currentRps;
  }

  /**
   * Evaluates rolling RPS every second and triggers dynamic scale-up/scale-down.
   */
  private tickRps(): void {
    const rpsThisSecond = this.currentSecondRequests;
    this.currentSecondRequests = 0;

    this.recentRpsHistory.push(rpsThisSecond);
    if (this.recentRpsHistory.length > 5) {
      this.recentRpsHistory.shift();
    }

    const sum = this.recentRpsHistory.reduce((acc, val) => acc + val, 0);
    this.currentRps = Math.round(sum / this.recentRpsHistory.length);

    // Send heartbeat with worker's current memory to Master
    if (this.isClustered() && typeof process.send === 'function') {
      const mem = process.memoryUsage();
      process.send({
        action: 'WORKER_HEARTBEAT',
        memory: {
          rss: mem.rss,
          heapUsed: mem.heapUsed,
          heapTotal: mem.heapTotal,
        },
      });
    }

    // Only Primary Worker 1 manages auto-scaling decisions to avoid IPC race conditions
    if (!this.isPrimaryWorker() || !this.isClustered()) {
      return;
    }

    const activeWorkers = this.cachedClusterState.activeWorkersCount || 1;
    const SURGE_THRESHOLD_RPS = 25; // Auto-scale threshold: 25 requests/sec

    // 1. Auto-scale UP if traffic surges and Worker 2 is not yet running
    if (this.currentRps >= SURGE_THRESHOLD_RPS && activeWorkers < 2) {
      const now = Date.now();
      if (now > this.autoScaleCooldownUntil) {
        this.logger.log(
          `🚀 [AutoScaler] Traffic surge detected (${this.currentRps} req/s >= ${SURGE_THRESHOLD_RPS}). Auto-spawning Worker 2 for 30 minutes...`,
        );
        this.surgeTriggered = true;
        this.lowTrafficSecondsCount = 0;
        this.autoScaleCooldownUntil = now + 60_000; // 1 min cooldown before next check
        this.scaleUp(30, 'TRAFFIC_SURGE').catch((err) =>
          this.logger.error(`Failed to auto-scale on traffic surge: ${err.message}`),
        );
      }
    }

    // 2. Auto-scale DOWN if traffic has normalized (< 5 req/s for 3 minutes)
    // Only applies if Worker 2 was triggered by a traffic surge, NOT during a scheduled exam or manual override.
    if (this.surgeTriggered && activeWorkers > 1 && !this.cachedClusterState.examModeActive) {
      if (this.currentRps < 5) {
        this.lowTrafficSecondsCount++;
        if (this.lowTrafficSecondsCount >= 180) {
          this.logger.log(
            `📉 [AutoScaler] Traffic normalized (< 5 req/s for 3 min). Auto-scaling down Worker 2 to conserve RAM...`,
          );
          this.surgeTriggered = false;
          this.lowTrafficSecondsCount = 0;
          this.scaleDown().catch((err) =>
            this.logger.error(`Failed to auto-scale down: ${err.message}`),
          );
        }
      } else {
        this.lowTrafficSecondsCount = 0;
      }
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
   * Triggers an on-demand scale up to spawn Worker 2 (Exam Mode or Traffic Surge).
   * @param durationMinutes How many minutes Worker 2 should stay active before auto-shutting down (default 120 min).
   * @param reason The trigger reason ('MANUAL', 'SCHEDULED_EXAM', or 'TRAFFIC_SURGE').
   */
  async scaleUp(
    durationMinutes: number = 120,
    reason: string = 'MANUAL',
  ): Promise<{ success: boolean; message: string }> {
    if (!this.isClustered() || typeof process.send !== 'function') {
      return {
        success: false,
        message: 'خاصية تسريع المنصة تعمل تلقائياً على الخادم السحابي الرئيسي.',
      };
    }

    this.logger.log(`📢 Sending CLUSTER_SCALE_UP signal to Primary process (${reason}, duration: ${durationMinutes} min)...`);
    process.send({
      action: 'CLUSTER_SCALE_UP',
      durationMinutes,
      reason,
    });

    const isExamOrManual = reason !== 'TRAFFIC_SURGE';
    if (isExamOrManual) {
      this.cachedClusterState.examModeActive = true;
      this.cachedClusterState.examModeExpiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
    }

    return {
      success: true,
      message: `تم تفعيل أقصى طاقة وسرعة للمنصة بنجاح لمدة ${durationMinutes} دقيقة.`,
    };
  }

  /**
   * Triggers an on-demand scale down to stop Worker 2 and restore single-instance resource usage.
   */
  async scaleDown(): Promise<{ success: boolean; message: string }> {
    if (!this.isClustered() || typeof process.send !== 'function') {
      return {
        success: false,
        message: 'خاصية تسريع المنصة تعمل تلقائياً على الخادم السحابي الرئيسي.',
      };
    }

    this.logger.log(`📢 Sending CLUSTER_SCALE_DOWN signal to Primary process...`);
    process.send({
      action: 'CLUSTER_SCALE_DOWN',
    });

    this.cachedClusterState.examModeActive = false;
    this.cachedClusterState.examModeExpiresAt = null;
    this.surgeTriggered = false;
    this.lowTrafficSecondsCount = 0;

    return {
      success: true,
      message: 'تمت العودة للوضع القياسي الطبيعي للمنصة بنجاح.',
    };
  }

  /**
   * Returns current cluster status, live RPS, and memory usage.
   */
  async getStatus(): Promise<ClusterStatus> {
    const memory = (this.cachedClusterState as any).clusterMemory || {
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      totalRamMb: 1024,
      safetyMarginPercent: Math.max(
        0,
        100 - Math.min(Math.round((process.memoryUsage().rss / 1024 / 1024 / 1024) * 100), 100),
      ),
    };

    return {
      mode: this.isClustered() ? 'clustered' : 'standalone',
      primaryPid: this.cachedClusterState.primaryPid || process.pid,
      currentWorkerId: this.getWorkerId(),
      currentWorkerPid: process.pid,
      activeWorkersCount: this.cachedClusterState.activeWorkersCount || 1,
      workers: this.cachedClusterState.workers || [{ id: this.getWorkerId(), pid: process.pid }],
      examModeActive: Boolean(this.cachedClusterState.examModeActive),
      examModeExpiresAt: this.cachedClusterState.examModeExpiresAt || null,
      currentRps: this.getCurrentRps(),
      memoryUsage: memory,
      autoScaler: {
        enabled: true,
        surgeThresholdRps: 25,
        surgeTriggered: this.surgeTriggered,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
