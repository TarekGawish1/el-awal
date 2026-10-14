import cluster, { Worker } from 'node:cluster';
import { Logger } from '@nestjs/common';

const logger = new Logger('ClusterMaster');

interface WorkerMetrics {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  updatedAt: number;
}

interface ClusterState {
  workers: Map<string, Worker>;
  workerMetrics: Map<string, WorkerMetrics>;
  examModeActive: boolean;
  examModeTimer: NodeJS.Timeout | null;
  examModeExpiresAt: string | null;
}

const state: ClusterState = {
  workers: new Map(),
  workerMetrics: new Map(),
  examModeActive: false,
  examModeTimer: null,
  examModeExpiresAt: null,
};

/**
 * Starts the Primary Cluster Manager process.
 * Manages Worker 1 (Always-On primary worker) and Worker 2 (On-Demand Exam/Peak worker).
 */
export function startClusterMaster(): void {
  const primaryPid = process.pid;
  const initialWorkerCount = process.env.WEB_CONCURRENCY === '2' ? 2 : 1;

  logger.log(`🚀 [ClusterMaster] Primary process initialized (PID: ${primaryPid})`);
  logger.log(`⚙️  [ClusterMaster] Initial worker formation: ${initialWorkerCount} worker(s)`);

  // 1. Spawn Worker 1 (Permanent Primary Worker)
  spawnWorker('1');

  // 2. If configured for permanent dual-worker mode, spawn Worker 2 immediately
  if (initialWorkerCount >= 2) {
    state.examModeActive = true;
    spawnWorker('2');
  }

  // 3. Handle cluster worker exits and auto-healing
  cluster.on('exit', (worker, code, signal) => {
    let exitedWorkerId: string | null = null;
    for (const [id, w] of state.workers.entries()) {
      if (w.id === worker.id) {
        exitedWorkerId = id;
        state.workers.delete(id);
        state.workerMetrics.delete(id);
        break;
      }
    }

    const reason = signal || `exit code ${code}`;
    logger.warn(
      `⚠️  [ClusterMaster] Worker ${exitedWorkerId || 'unknown'} (PID: ${worker.process.pid}) died (${reason})`,
    );

    // Auto-heal Worker 1 immediately
    if (exitedWorkerId === '1') {
      logger.log(`🔄 [ClusterMaster] Restarting permanent Worker 1...`);
      spawnWorker('1');
    } else if (exitedWorkerId === '2' && state.examModeActive) {
      // If Worker 2 died unexpectedly while Exam Mode was active, revive it
      logger.log(`🔄 [ClusterMaster] Reviving Exam Worker 2 because Exam Mode is still active...`);
      spawnWorker('2');
    }
  });

  // 4. Periodic cluster state sync (every 5 seconds)
  setInterval(() => {
    broadcastClusterState();
  }, 5000);

  // 4. Graceful primary shutdown
  const handleShutdown = (signal: string) => {
    logger.log(`🛑 [ClusterMaster] Received ${signal}. Shutting down all workers gracefully...`);
    if (state.examModeTimer) {
      clearTimeout(state.examModeTimer);
    }
    for (const [id, worker] of state.workers.entries()) {
      logger.log(`Disconnecting Worker ${id} (PID: ${worker.process.pid})...`);
      worker.disconnect();
    }
    setTimeout(() => {
      process.exit(0);
    }, 5000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

/**
 * Spawns a specific worker ('1' or '2') and wires IPC communication.
 */
function spawnWorker(workerId: '1' | '2'): Worker {
  const existing = state.workers.get(workerId);
  if (existing && !existing.isDead() && existing.isConnected()) {
    logger.log(`ℹ️  [ClusterMaster] Worker ${workerId} is already active (PID: ${existing.process.pid})`);
    return existing;
  }

  logger.log(`⚡ [ClusterMaster] Spawning Worker ${workerId}...`);

  const worker = cluster.fork({
    WORKER_ID: workerId,
  });

  state.workers.set(workerId, worker);

  worker.on('online', () => {
    logger.log(`✅ [ClusterMaster] Worker ${workerId} is ONLINE (PID: ${worker.process.pid})`);
    broadcastClusterState();
  });

  worker.on('message', (msg: any) => {
    handleWorkerMessage(workerId, msg);
  });

  return worker;
}

/**
 * Handles incoming IPC control messages from worker instances.
 */
function handleWorkerMessage(senderWorkerId: string, msg: any): void {
  if (!msg || typeof msg !== 'object') return;

  switch (msg.action) {
    case 'CLUSTER_SCALE_UP': {
      const durationMinutes = Number(msg.durationMinutes) || 120;
      const reason = msg.reason || 'MANUAL';
      logger.log(
        `📈 [ClusterMaster] Scale-Up request received from Worker ${senderWorkerId} (Reason: ${reason}). Target duration: ${durationMinutes} minutes.`,
      );

      state.examModeActive = true;
      state.examModeExpiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

      if (state.examModeTimer) {
        clearTimeout(state.examModeTimer);
      }

      state.examModeTimer = setTimeout(() => {
        logger.log(`⏰ [ClusterMaster] Scale-Up duration expired (${durationMinutes} min, Reason: ${reason}). Scaling down Worker 2...`);
        scaleDownWorker2();
      }, durationMinutes * 60 * 1000);

      spawnWorker('2');
      broadcastClusterState();
      break;
    }

    case 'CLUSTER_SCALE_DOWN': {
      logger.log(`📉 [ClusterMaster] Scale-Down request received from Worker ${senderWorkerId}`);
      scaleDownWorker2();
      break;
    }

    case 'CLUSTER_STATUS_REQUEST': {
      const targetWorker = state.workers.get(senderWorkerId);
      if (targetWorker) {
        targetWorker.send({
          action: 'CLUSTER_STATUS_RESPONSE',
          requestId: msg.requestId,
          data: getClusterStateSummary(),
        });
      }
      break;
    }

    default:
      break;
  }
}

/**
 * Gracefully shuts down Worker 2 and reverts to economic single-worker mode.
 */
function scaleDownWorker2(): void {
  state.examModeActive = false;
  state.examModeExpiresAt = null;
  if (state.examModeTimer) {
    clearTimeout(state.examModeTimer);
    state.examModeTimer = null;
  }

  const worker2 = state.workers.get('2');
  if (!worker2) {
    logger.log(`ℹ️  [ClusterMaster] Worker 2 is not currently active.`);
    broadcastClusterState();
    return;
  }

  logger.log(`🛑 [ClusterMaster] Disconnecting Worker 2 (PID: ${worker2.process.pid})...`);
  state.workers.delete('2');
  worker2.disconnect();

  const forceKillTimeout = setTimeout(() => {
    if (!worker2.isDead()) {
      logger.warn(`⚠️  [ClusterMaster] Force-killing Worker 2 after disconnect timeout`);
      worker2.kill('SIGKILL');
    }
  }, 4000);

  worker2.on('exit', () => {
    clearTimeout(forceKillTimeout);
    logger.log(`✅ [ClusterMaster] Worker 2 has stopped. RAM restored to single-worker mode.`);
    broadcastClusterState();
  });
}

/**
 * Broadcasts updated cluster state to all active workers.
 */
function broadcastClusterState(): void {
  const summary = getClusterStateSummary();
  for (const worker of state.workers.values()) {
    if (worker.isConnected()) {
      worker.send({
        action: 'CLUSTER_STATE_UPDATE',
        data: summary,
      });
    }
  }
}

/**
 * Returns current summary of the cluster.
 */
function getClusterStateSummary() {
  const workerList: Array<{ id: string; pid: number }> = [];
  for (const [id, w] of state.workers.entries()) {
    if (w.process?.pid) {
      workerList.push({ id, pid: w.process.pid });
    }
  }

  return {
    mode: 'clustered',
    primaryPid: process.pid,
    activeWorkersCount: workerList.length,
    workers: workerList,
    examModeActive: state.examModeActive,
    examModeExpiresAt: state.examModeExpiresAt,
    timestamp: new Date().toISOString(),
  };
}
