import { offlineDb, OutboxMutationRecord } from '../db';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { generateClientOperationId } from './sync-types';

export interface SyncCoreHandlerContext {
  handleFailedMutation: (mutation: OutboxMutationRecord, errorMessage: string) => Promise<void>;
}

export interface SyncBatchResult {
  syncedCount: number;
  failedCount: number;
}

/**
 * Flush Group and Student creations using the unified batch endpoint,
 * falling back to individual calls if the batch fails or is rejected.
 */
export async function syncGroupsAndStudentsBatch(
  pending: OutboxMutationRecord[],
  ctx: SyncCoreHandlerContext,
): Promise<SyncBatchResult> {
  let syncedCount = 0;
  let failedCount = 0;

  const groupCreations = pending.filter(
    (m) => m.domain === 'groups' && m.method === 'POST' && m.endpoint === API_ENDPOINTS.GROUPS.CREATE,
  );
  const studentCreations = pending.filter(
    (m) => m.domain === 'students' && m.method === 'POST' && m.endpoint === API_ENDPOINTS.STUDENTS.CREATE,
  );

  if (groupCreations.length === 0 && studentCreations.length === 0) {
    return { syncedCount: 0, failedCount: 0 };
  }

  const batchDto = {
    groups: groupCreations.map((g) => ({
      clientTempId: g.optimisticId || g.id,
      name: g.payload?.name,
      gradeLevel: g.payload?.gradeLevel,
      academicYear: g.payload?.academicYear || '2026-2027',
      academicTerm: g.payload?.academicTerm || 'FIRST_TERM',
      maxCapacity: g.payload?.maxCapacity,
      monthlyFee: g.payload?.monthlyFee,
      description: g.payload?.description,
      schedules: g.payload?.schedules,
    })),
    students: studentCreations.map((s) => ({
      clientTempId: s.optimisticId || s.id,
      name: s.payload?.fullName || s.payload?.name,
      fullName: s.payload?.fullName || s.payload?.name,
      phone: s.payload?.phone,
      email: s.payload?.email,
      password: s.payload?.password,
      gradeLevel: s.payload?.gradeLevel,
      academicStage: s.payload?.academicStage,
      academicYear: s.payload?.academicYear || '2026-2027',
      academicTerm: s.payload?.academicTerm || 'FIRST_TERM',
      parentName: s.payload?.parentName,
      parentPhone: s.payload?.parentPhone,
      parentRelationship: s.payload?.parentRelationship,
      groupId: s.payload?.groupId || s.payload?.initialGroupId,
      initialGroupId: s.payload?.groupId || s.payload?.initialGroupId,
    })),
  };

  try {
    const res = await apiClient<any>(API_ENDPOINTS.SYNC.BATCH, {
      method: 'POST',
      body: JSON.stringify(batchDto),
    });

    if (res?.idMappings) {
      await offlineDb.reconcileEntityIds(res.idMappings);
    }

    for (const item of groupCreations) {
      await offlineDb.removeMutation(item.id);
      syncedCount++;
    }
    for (const item of studentCreations) {
      await offlineDb.removeMutation(item.id);
      syncedCount++;
    }
  } catch (_batchErr: any) {
    // Fallback to individual items if batch rejected or failed
    for (const item of groupCreations) {
      try {
        await offlineDb.updateMutationStatus(item.id, 'SYNCING');
        const res = await apiClient<any>(item.endpoint, {
          method: item.method,
          body: item.payload ? JSON.stringify(item.payload) : undefined,
        });
        if (res?.id && item.optimisticId && res.id !== item.optimisticId) {
          const localGroup = await offlineDb.getGroupByIdOffline(item.optimisticId);
          if (localGroup) {
            await offlineDb.removeGroup(item.optimisticId);
            await offlineDb.bulkPutGroups([{ ...localGroup, id: res.id }]);
          }
        }
        await offlineDb.removeMutation(item.id);
        syncedCount++;
      } catch (err: any) {
        await ctx.handleFailedMutation(item, err.message);
        failedCount++;
      }
    }

    for (const item of studentCreations) {
      try {
        await offlineDb.updateMutationStatus(item.id, 'SYNCING');
        const res = await apiClient<any>(item.endpoint, {
          method: item.method,
          body: item.payload ? JSON.stringify(item.payload) : undefined,
        });
        if (res?.id && item.optimisticId && res.id !== item.optimisticId) {
          const localStudent = await offlineDb.getStudentByIdOffline(item.optimisticId);
          if (localStudent) {
            await offlineDb.removeStudent(item.optimisticId);
            await offlineDb.bulkPutStudents([{ ...localStudent, id: res.id }]);
          }
        }
        await offlineDb.removeMutation(item.id);
        syncedCount++;
      } catch (err: any) {
        await ctx.handleFailedMutation(item, err.message);
        failedCount++;
      }
    }
  }

  return { syncedCount, failedCount };
}

/**
 * Flush Group Enrollments (after groups and students already exist).
 */
export async function syncGroupEnrollments(
  pending: OutboxMutationRecord[],
  ctx: SyncCoreHandlerContext,
): Promise<SyncBatchResult> {
  let syncedCount = 0;
  let failedCount = 0;

  const groupEnrollments = pending.filter(
    (m) => m.domain === 'groups' && m.method === 'POST' && m.endpoint !== API_ENDPOINTS.GROUPS.CREATE,
  );

  for (const item of groupEnrollments) {
    try {
      await offlineDb.updateMutationStatus(item.id, 'SYNCING');
      await apiClient<any>(item.endpoint, {
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

/**
 * Flush Batch Payments (both payment creations and DELETE_PAYMENT reversals).
 */
export async function syncPaymentsBatch(
  pending: OutboxMutationRecord[],
  ctx: SyncCoreHandlerContext,
): Promise<SyncBatchResult> {
  let syncedCount = 0;
  let failedCount = 0;

  const paymentItems = pending.filter((m) => m.domain === 'finance');
  if (paymentItems.length === 0) {
    return { syncedCount: 0, failedCount: 0 };
  }

  try {
    const operations = paymentItems.map((item) => {
      if (item.payload?.type === 'DELETE_PAYMENT') {
        return {
          id: item.id,
          type: 'DELETE_PAYMENT' as const,
          paymentId: item.payload.paymentId,
          clientTimestamp: item.clientTimestamp,
        };
      }
      return {
        id: item.id,
        studentId: item.payload.studentId,
        groupId: item.payload.groupId,
        paymentType: item.payload.paymentType || (item.payload.bookletId ? 'BOOKLET' : 'TUITION'),
        bookletId: item.payload.bookletId,
        periodYear: item.payload.periodYear,
        periodMonth: item.payload.periodMonth,
        amountPaid: item.payload.amountPaid,
        amountExpected: item.payload.amountExpected,
        paymentMethod: item.payload.paymentMethod || 'CASH',
        receiptNumber: item.payload.receiptNumber,
        notes: item.payload.notes,
        clientTimestamp: item.clientTimestamp,
        collectedAt: item.payload.collectedAt,
      };
    });

    // Claim mutations atomically in local database before network call
    for (const item of paymentItems) {
      await offlineDb.updateMutationStatus(item.id, 'SYNCING');
    }

    const res = await apiClient<any>(API_ENDPOINTS.SYNC.PAYMENTS, {
      method: 'POST',
      body: JSON.stringify({ operations }),
    });

    if (res?.idMappings) {
      await offlineDb.reconcileEntityIds({ payments: res.idMappings });
    }

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
          domain: 'finance',
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
    console.error('Batch payments sync failed:', err);
    for (const item of paymentItems) {
      await ctx.handleFailedMutation(item, err.message);
      failedCount++;
    }
  }

  return { syncedCount, failedCount };
}
