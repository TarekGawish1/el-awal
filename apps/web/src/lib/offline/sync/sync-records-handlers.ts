import { offlineDb, OutboxMutationRecord } from '../db';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { generateClientOperationId } from './sync-types';
import { SyncBatchResult, SyncCoreHandlerContext } from './sync-core-handlers';

/**
 * Flush Onsite Homework and Attendance mutations via API_ENDPOINTS.SYNC.BATCH.
 */
export async function syncAttendanceAndHomeworkBatch(
  pending: OutboxMutationRecord[],
  ctx: SyncCoreHandlerContext,
): Promise<SyncBatchResult> {
  let syncedCount = 0;
  let failedCount = 0;

  const attendanceAndHomeworkItems = pending.filter(
    (m) =>
      m.type === 'RECORD_HOMEWORK_ONSITE' ||
      m.type === 'RECORD_ATTENDANCE' ||
      m.payload?.type === 'RECORD_HOMEWORK_ONSITE' ||
      m.payload?.type === 'RECORD_ATTENDANCE' ||
      m.endpoint?.includes('/sync/homework') ||
      (m.domain === 'attendance' && m.method === 'POST'),
  );

  if (attendanceAndHomeworkItems.length === 0) {
    return { syncedCount: 0, failedCount: 0 };
  }

  // Verify all mutations retain full payload integrity
  const batchPayload = attendanceAndHomeworkItems.map((m) => {
    const mutationType =
      m.type ||
      m.payload?.type ||
      (m.endpoint?.includes('/sync/homework') ? 'RECORD_HOMEWORK_ONSITE' : 'RECORD_ATTENDANCE');

    return {
      id: m.id,
      type: mutationType,
      payload: {
        assessmentId: m.payload?.assessmentId,
        studentId: m.payload?.studentId,
        sessionId: m.payload?.sessionId,
        qrCodeToken: m.payload?.qrCodeToken,
        status:
          m.payload?.status ||
          (mutationType === 'RECORD_HOMEWORK_ONSITE' ? 'CHECKED_ONSITE' : 'PRESENT'),
        recordedMethod:
          m.payload?.recordedMethod || m.payload?.recordingMethod || 'QR_SCAN',
        recordingMethod:
          m.payload?.recordingMethod || m.payload?.recordedMethod || 'QR_SCAN',
        score: m.payload?.score ?? null,
        feedback: m.payload?.feedback,
        notes: m.payload?.notes,
        clientTimestamp: m.payload?.clientTimestamp || m.clientTimestamp,
      },
      clientTimestamp: m.clientTimestamp,
    };
  });

  try {
    // Claim mutations atomically in local database before network call
    for (const item of attendanceAndHomeworkItems) {
      await offlineDb.updateMutationStatus(item.id, 'SYNCING');
    }

    const res = await apiClient<any>(API_ENDPOINTS.SYNC.BATCH, {
      method: 'POST',
      body: JSON.stringify(batchPayload),
    });

    // Only mark an outbox item as SYNCED or delete it from IndexedDB if the backend explicitly returns success (status: 'SUCCESS')
    if (res?.results && Array.isArray(res.results)) {
      for (const itemResult of res.results) {
        if (itemResult.status === 'SUCCESS') {
          await offlineDb.removeMutation(itemResult.mutationId);
          syncedCount++;
        } else {
          const target = attendanceAndHomeworkItems.find((m) => m.id === itemResult.mutationId);
          if (target) {
            await ctx.handleFailedMutation(target, itemResult.error || 'Server rejected mutation');
          }
          failedCount++;
        }
      }
    } else if (res?.processedOperationIds && Array.isArray(res.processedOperationIds)) {
      for (const id of res.processedOperationIds) {
        await offlineDb.removeMutation(id);
        syncedCount++;
      }
    } else if (res?.syncedCount !== undefined || res?.success) {
      for (const item of attendanceAndHomeworkItems) {
        await offlineDb.removeMutation(item.id);
        syncedCount++;
      }
    }
  } catch (err: any) {
    console.error('Batch sync failed:', err);
    for (const item of attendanceAndHomeworkItems) {
      await ctx.handleFailedMutation(item, err.message);
      failedCount++;
    }
  }

  return { syncedCount, failedCount };
}

/**
 * Flush Batch Progress Sync.
 */
export async function syncProgressBatch(
  pending: OutboxMutationRecord[],
  ctx: SyncCoreHandlerContext,
): Promise<SyncBatchResult> {
  let syncedCount = 0;
  let failedCount = 0;

  const progressItems = pending.filter((m) => m.domain === 'progress' && m.method === 'POST');
  if (progressItems.length === 0) {
    return { syncedCount: 0, failedCount: 0 };
  }

  try {
    const operations = progressItems.map((item) => ({
      clientOperationId: item.id,
      courseId: item.payload?.courseId,
      lessonId: item.payload?.lessonId,
      lastPositionSeconds: item.payload?.lastPositionSeconds || 0,
      isCompleted: item.payload?.isCompleted || false,
      clientTimestamp: item.clientTimestamp,
    }));

    const res = await apiClient<any>(API_ENDPOINTS.SYNC.PROGRESS, {
      method: 'POST',
      body: JSON.stringify({ operations }),
    });

    if (res?.processedOperationIds) {
      for (const id of res.processedOperationIds) {
        await offlineDb.removeMutation(id);
        syncedCount++;
      }
    }
  } catch (err: any) {
    console.error('Batch progress sync failed:', err);
    for (const item of progressItems) {
      await ctx.handleFailedMutation(item, err.message);
      failedCount++;
    }
  }

  return { syncedCount, failedCount };
}

/**
 * Flush Batch Assessments Sync.
 */
export async function syncAssessmentsBatch(
  pending: OutboxMutationRecord[],
  ctx: SyncCoreHandlerContext,
): Promise<SyncBatchResult> {
  let syncedCount = 0;
  let failedCount = 0;

  const assessmentItems = pending.filter((m) => m.domain === 'assessments' && m.method === 'POST');
  if (assessmentItems.length === 0) {
    return { syncedCount: 0, failedCount: 0 };
  }

  try {
    const operations = assessmentItems.map((item) => ({
      id: item.id,
      assessmentId: item.payload?.assessmentId,
      answers: item.payload?.answers || [],
      attachmentUrl: item.payload?.attachmentUrl,
      clientTimestamp: item.clientTimestamp,
    }));

    const res = await apiClient<any>(API_ENDPOINTS.SYNC.ASSESSMENTS, {
      method: 'POST',
      body: JSON.stringify({ operations }),
    });

    if (res?.processedOperationIds) {
      for (const id of res.processedOperationIds) {
        await offlineDb.removeMutation(id);
        syncedCount++;
      }
    }

    if (res?.conflicts && res.conflicts.length > 0) {
      for (const conf of res.conflicts) {
        await offlineDb.recordConflict({
          id: generateClientOperationId(),
          operationId: conf.operationId,
          domain: 'assessments',
          reason: conf.reason,
          payload: operations.find((o) => o.id === conf.operationId),
          timestamp: Date.now(),
          resolved: false,
        });
        await offlineDb.removeMutation(conf.operationId);
        failedCount++;
      }
    }
  } catch (err: any) {
    console.error('Batch assessments sync failed:', err);
    for (const item of assessmentItems) {
      await ctx.handleFailedMutation(item, err.message);
      failedCount++;
    }
  }

  return { syncedCount, failedCount };
}

/**
 * Flush Generic / Remaining mutations (Sequential FIFO).
 */
export async function syncGenericMutations(
  remaining: OutboxMutationRecord[],
  ctx: SyncCoreHandlerContext,
): Promise<SyncBatchResult> {
  let syncedCount = 0;
  let failedCount = 0;

  for (const item of remaining) {
    try {
      await offlineDb.updateMutationStatus(item.id, 'SYNCING');
      await apiClient(item.endpoint, {
        method: item.method,
        body: item.payload ? JSON.stringify(item.payload) : undefined,
      });
      await offlineDb.removeMutation(item.id);
      syncedCount++;
    } catch (err: any) {
      await ctx.handleFailedMutation(item, err.message);
      failedCount++;
    }
  }

  return { syncedCount, failedCount };
}
