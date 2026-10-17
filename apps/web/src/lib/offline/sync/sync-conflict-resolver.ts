import { offlineDb, OutboxMutationRecord } from '../db';
import { API_ENDPOINTS } from '../../api/endpoints';
import { refreshAccessToken } from '../../api/client';
import { getStoredAccessToken } from '@/features/auth/utils/auth-tokens';
import { bootstrapManager } from '../bootstrap-manager';
import { generateClientOperationId, SyncEngineEventType } from './sync-types';

export interface ConflictResolverContext {
  queryClient: any;
  notify: (type: SyncEngineEventType, data?: any) => void;
  triggerSync: () => void;
  enqueue: (
    domain: OutboxMutationRecord['domain'],
    endpoint: string,
    method: OutboxMutationRecord['method'],
    payload: any,
  ) => Promise<string>;
  setSyncConfirmationRequired: (required: boolean) => void;
}

export class SyncConflictResolver {
  constructor(private ctx: ConflictResolverContext) {}

  public isAuthError(errorMessage: string): boolean {
    return (
      errorMessage?.includes('401') ||
      errorMessage?.includes('Authentication required') ||
      errorMessage?.includes('Unauthorized') ||
      errorMessage?.includes('انتهت صلاحية') ||
      errorMessage?.includes('Authentication')
    );
  }

  public isAuthConflictReason(reason: string): boolean {
    return (
      reason?.includes('Authentication required') ||
      reason?.includes('Unauthorized') ||
      reason?.includes('401') ||
      reason?.includes('انتهت صلاحية')
    );
  }

  public async handleFailedMutation(mutation: OutboxMutationRecord, errorMessage: string): Promise<void> {
    if (this.isAuthError(errorMessage)) {
      await offlineDb.updateMutationStatus(mutation.id, 'PENDING');
      return;
    }

    const isValidationError =
      errorMessage?.includes('already registered') ||
      errorMessage?.includes('Collision') ||
      errorMessage?.includes('400') ||
      errorMessage?.includes('404') ||
      errorMessage?.includes('409') ||
      errorMessage?.includes('422') ||
      errorMessage?.includes('تكرار') ||
      errorMessage?.includes('مسجل مسبقاً') ||
      errorMessage?.includes('INVALID_QR_CODE') ||
      errorMessage?.includes('SESSION_NOT_FOUND') ||
      errorMessage?.includes('STUDENT_NOT_ENROLLED') ||
      errorMessage?.includes('STUDENT_INACTIVE_OR_NOT_FOUND') ||
      errorMessage?.includes('NOT_FOUND') ||
      errorMessage?.includes('Cannot record attendance for non-enrolled') ||
      errorMessage?.includes('non-enrolled') ||
      errorMessage?.includes('not found') ||
      errorMessage?.includes('Not Found') ||
      errorMessage?.includes('Missing required parameters');

    if (isValidationError || mutation.retryCount >= 5) {
      await offlineDb.recordConflict({
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : generateClientOperationId(),
        operationId: mutation.id,
        domain: mutation.domain,
        reason: `تعذر إتمام العملية على الخادم: ${errorMessage}`,
        payload: mutation.payload,
        timestamp: Date.now(),
        resolved: false,
      });

      if (mutation.domain === 'students' && mutation.method === 'POST') {
        const studentId = mutation.optimisticId || mutation.payload?.id;
        if (studentId) {
          await offlineDb.removeStudent(studentId);
          if (this.ctx.queryClient) {
            this.ctx.queryClient.setQueriesData({ queryKey: ['students'] }, (old: any) => {
              if (!old) return old;
              if (Array.isArray(old)) return old.filter((s: any) => s.id !== studentId);
              if (old.data && Array.isArray(old.data)) {
                return {
                  ...old,
                  data: old.data.filter((s: any) => s.id !== studentId),
                  meta: { ...old.meta, total: Math.max(0, (old.meta?.total || 1) - 1) },
                };
              }
              return old;
            });
          }
        }
      }

      await offlineDb.removeMutation(mutation.id);
    } else {
      await offlineDb.updateMutationStatus(mutation.id, 'FAILED', errorMessage);
      if (mutation.retryCount >= 3) {
        const existingConflicts = await offlineDb.getUnresolvedConflicts();
        if (!existingConflicts.some((c) => c.operationId === mutation.id)) {
          await offlineDb.recordConflict({
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : generateClientOperationId(),
            operationId: mutation.id,
            domain: mutation.domain,
            reason: `تأخر مزامنة العملية بسبب مشاكل في الاتصال أو الخادم: ${errorMessage}`,
            payload: mutation.payload,
            timestamp: Date.now(),
            resolved: false,
          });
        }
      }
    }
  }

  public async retryConflicts(conflictIds?: string[]): Promise<number> {
    const fresh = await refreshAccessToken();
    if (!fresh && !getStoredAccessToken()) {
      throw new Error('يرجى تسجيل الدخول أولاً قبل إعادة المحاولة');
    }

    const allConflicts = await offlineDb.getConflicts();
    const targets = conflictIds ? allConflicts.filter((c) => conflictIds.includes(c.id)) : allConflicts;

    if (targets.length === 0) return 0;

    const domainEndpointMap: Partial<
      Record<OutboxMutationRecord['domain'], { endpoint: string; method: OutboxMutationRecord['method'] }>
    > = {
      attendance: { endpoint: API_ENDPOINTS.SYNC.ATTENDANCE, method: 'POST' },
      finance: { endpoint: API_ENDPOINTS.SYNC.PAYMENTS, method: 'POST' },
      students: { endpoint: API_ENDPOINTS.STUDENTS.CREATE, method: 'POST' },
      groups: { endpoint: API_ENDPOINTS.GROUPS.CREATE, method: 'POST' },
      assessments: { endpoint: API_ENDPOINTS.SYNC.ASSESSMENTS, method: 'POST' },
    };

    let count = 0;
    for (const conflict of targets) {
      let endpoint = domainEndpointMap[conflict.domain as OutboxMutationRecord['domain']]?.endpoint;
      const method = domainEndpointMap[conflict.domain as OutboxMutationRecord['domain']]?.method || 'POST';

      if (
        conflict.domain === 'attendance' &&
        (conflict.payload?.assessmentId ||
          conflict.payload?.type === 'RECORD_HOMEWORK_ONSITE' ||
          conflict.payload?.feedback !== undefined ||
          conflict.payload?.score !== undefined)
      ) {
        endpoint = API_ENDPOINTS.SYNC.HOMEWORK;
      }

      if (!endpoint || !conflict.payload) continue;

      await this.ctx.enqueue(
        conflict.domain as OutboxMutationRecord['domain'],
        endpoint,
        method,
        conflict.payload,
      );
      await offlineDb.resolveConflict(conflict.id, 'إعادة المحاولة التلقائية');
      count++;
    }

    if (count > 0) {
      this.ctx.triggerSync();
    }

    return count;
  }

  public async resetFailedMutations(): Promise<number> {
    const { useAuthStore } = await import('@/features/auth/store/auth.store');
    const currentUserId = useAuthStore.getState().user?.id;
    if (!currentUserId) return 0;

    const all = await offlineDb.getPendingMutations(currentUserId);
    const failed = all.filter((m) => m.status === 'FAILED');
    for (const m of failed) {
      await offlineDb.resetMutationForRetry(m.id);
    }
    return failed.length;
  }

  public async undoMutation(mutationId: string): Promise<void> {
    const { useAuthStore } = await import('@/features/auth/store/auth.store');
    const currentUserId = useAuthStore.getState().user?.id;
    if (!currentUserId) return;

    const pending = await offlineDb.getPendingMutations(currentUserId);
    const mutation = pending.find((m) => m.id === mutationId);
    if (!mutation) return;

    const payload = mutation.payload || {};

    try {
      if (mutation.domain === 'finance') {
        if (payload.type === 'DELETE_PAYMENT') {
          const snapshot = payload.previousPaymentSnapshot;
          if (snapshot) {
            await offlineDb.putPayment(snapshot);
            if (snapshot.studentId) {
              await offlineDb.markStudentPaidOffline(snapshot.studentId, snapshot);
            }
            if (snapshot.paymentType === 'BOOKLET' && snapshot.bookletId) {
              const booklet = await offlineDb.getBookletByIdOffline(snapshot.bookletId);
              if (booklet) {
                await offlineDb.putBooklet({
                  ...booklet,
                  stockCount:
                    booklet.stockCount !== null && booklet.stockCount !== undefined
                      ? Math.max(0, booklet.stockCount - 1)
                      : booklet.stockCount,
                  salesCount: (booklet.salesCount || 0) + 1,
                  totalRevenue: (booklet.totalRevenue || 0) + Number(snapshot.amountPaid || 0),
                });
              }
            }
          }
        } else {
          const paymentId = mutation.optimisticId || payload.id;
          if (paymentId) {
            await offlineDb.deletePaymentLocally(paymentId);
          }
        }
      } else if (mutation.domain === 'attendance') {
        if (payload.sessionId && payload.studentId) {
          await offlineDb.revertAttendanceRecordOffline(payload.sessionId, payload.studentId);
        }
      } else if (mutation.domain === 'students' && mutation.method === 'POST') {
        const studentId = mutation.optimisticId || payload.id;
        if (studentId) {
          await offlineDb.removeStudent(studentId);
        }
      } else if (mutation.domain === 'groups' && mutation.method === 'POST') {
        const groupId = mutation.optimisticId || payload.id;
        if (groupId) {
          await offlineDb.removeGroup(groupId);
        }
      } else if (mutation.domain === 'groups' && ['PATCH', 'PUT'].includes(mutation.method)) {
        const previousGroup = mutation.rollbackData as any;
        if (previousGroup?.id) {
          await offlineDb.bulkPutGroups([previousGroup]);
          const roster = await offlineDb.getRoster(previousGroup.id);
          if (roster) {
            await offlineDb.cacheRoster({
              ...roster,
              groupName: previousGroup.name || roster.groupName,
              gradeLevel: previousGroup.gradeLevel || roster.gradeLevel,
              monthlyFee: previousGroup.monthlyFee ?? roster.monthlyFee,
              sessions: previousGroup.schedules ?? roster.sessions,
              updatedAt: Date.now(),
            });
          }
        }
      } else if (mutation.domain === 'students' && ['PATCH', 'PUT'].includes(mutation.method)) {
        const previousStudent = mutation.rollbackData as any;
        if (previousStudent?.id) {
          await offlineDb.bulkPutStudents([previousStudent]);
        }
      }
    } finally {
      await offlineDb.removeMutation(mutationId);
      if (this.ctx.queryClient) {
        this.ctx.queryClient.invalidateQueries({ queryKey: ['finance'] });
        this.ctx.queryClient.invalidateQueries({ queryKey: ['payments'] });
        this.ctx.queryClient.invalidateQueries({ queryKey: ['booklets'] });
        this.ctx.queryClient.invalidateQueries({ queryKey: ['students'] });
        this.ctx.queryClient.invalidateQueries({ queryKey: ['group-defaulters'] });
      }
      this.ctx.notify('MUTATION_UNDONE', mutation);
    }
  }

  public async discardAllLocalChanges(): Promise<{ discardedCount: number }> {
    const { useAuthStore } = await import('@/features/auth/store/auth.store');
    const currentUserId = useAuthStore.getState().user?.id;
    if (!currentUserId) return { discardedCount: 0 };

    const pending = await offlineDb.getPendingMutations(currentUserId);
    for (const m of pending) {
      await this.undoMutation(m.id);
      await offlineDb.removeMutation(m.id);
    }

    this.ctx.setSyncConfirmationRequired(false);

    try {
      await bootstrapManager.performBootstrap({ forceFull: true, queryClient: this.ctx.queryClient });
    } catch (e) {
      console.warn('Failed to rehydrate after discarding local changes:', e);
    }

    if (this.ctx.queryClient) {
      this.ctx.queryClient.invalidateQueries();
    }

    this.ctx.notify('SYNC_SUCCESS', { syncedCount: 0, failedCount: 0, discarded: pending.length });
    return { discardedCount: pending.length };
  }
}
