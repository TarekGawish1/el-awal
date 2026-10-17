import { offlineDb } from '../db';
import { API_ENDPOINTS } from '../../api/endpoints';
import { apiClient } from '../../api/client';
import {
  IncomingDiffSummary,
  OutboxSummary,
  OutgoingStudentSummary,
  OutgoingGroupSummary,
  PendingActivityItem,
} from './sync-types';

export class SyncActivitySummarizer {
  /**
   * Fetches remote delta diff summary from GET /api/v1/sync/diff
   */
  public async getSyncDiff(since?: number, fallbackLastSynced?: number | null): Promise<IncomingDiffSummary> {
    const lastBootstrapTime = await offlineDb.getMetadata<number>('lastBootstrapTimestamp');
    const lastSyncedTime = await offlineDb.getMetadata<number>('lastSyncedTimestamp');
    const timestamp = since || fallbackLastSynced || lastSyncedTime || lastBootstrapTime;

    if (!timestamp) {
      return {
        groups: { count: 0, items: [] },
        students: { count: 0, items: [] },
        attendance: { count: 0, items: [] },
        payments: { count: 0, items: [] },
        serverTime: new Date().toISOString(),
      };
    }

    const isoDate = new Date(timestamp).toISOString();
    try {
      const res = await apiClient<IncomingDiffSummary>(
        `${API_ENDPOINTS.SYNC.DIFF}?since=${encodeURIComponent(isoDate)}`,
      );
      return res || {
        groups: { count: 0, items: [] },
        students: { count: 0, items: [] },
        attendance: { count: 0, items: [] },
        payments: { count: 0, items: [] },
        serverTime: new Date().toISOString(),
      };
    } catch {
      return {
        groups: { count: 0, items: [] },
        students: { count: 0, items: [] },
        attendance: { count: 0, items: [] },
        payments: { count: 0, items: [] },
        serverTime: new Date().toISOString(),
      };
    }
  }

  /**
   * Summarizes all local pending outbox mutations categorized into students, groups, attendance, and payments.
   */
  public async getPendingOutboxSummary(): Promise<OutboxSummary> {
    const pending = await offlineDb.getPendingMutations();
    const allGroups = await offlineDb.getGroupsOffline();
    const groupMap = new Map(allGroups.map((g: any) => [g.id, g.name]));

    const students: OutgoingStudentSummary[] = [];
    const groups: OutgoingGroupSummary[] = [];
    let attendanceCount = 0;
    let paymentsCount = 0;

    for (const m of pending) {
      if (m.domain === 'students' && m.method === 'POST') {
        const payload = m.payload || {};
        const assignedGroupId = payload.groupId || payload.initialGroupId;
        students.push({
          id: m.optimisticId || m.id,
          fullName: payload.fullName || payload.name || 'طالب جديد',
          phone: payload.phone || payload.emergencyPhone || '',
          gradeLevel: payload.gradeLevel || '',
          groupName: assignedGroupId ? groupMap.get(assignedGroupId) || 'مجموعة محددة' : 'بدون مجموعة',
        });
      } else if (m.domain === 'groups' && m.method === 'POST') {
        const payload = m.payload || {};
        groups.push({
          id: m.optimisticId || m.id,
          name: payload.name || 'مجموعة جديدة',
          gradeLevel: payload.gradeLevel || '',
          monthlyFee: payload.monthlyFee || 0,
        });
      } else if (m.domain === 'attendance') {
        attendanceCount++;
      } else if (m.domain === 'finance') {
        paymentsCount++;
      }
    }

    return {
      students,
      groups,
      attendanceCount,
      paymentsCount,
      totalCount: pending.length,
    };
  }

  /**
   * Builds a rich, human-readable list of every pending local mutation for display
   * in <OfflineActivityDrawer /> and <SyncConfirmationModal />, resolving related
   * student/group/booklet names from local IndexedDB caches.
   */
  public async getDetailedPendingActivity(): Promise<PendingActivityItem[]> {
    const { useAuthStore } = await import('@/features/auth/store/auth.store');
    const currentUserId = useAuthStore.getState().user?.id;
    if (!currentUserId) return [];

    const pending = await offlineDb.getPendingMutations(currentUserId);
    const items: PendingActivityItem[] = [];

    for (const m of pending) {
      const payload = m.payload || {};

      if (m.domain === 'finance' && payload.type === 'DELETE_PAYMENT') {
        const snapshot = payload.previousPaymentSnapshot || {};
        const student = snapshot.studentId ? await offlineDb.getStudentByIdOffline(snapshot.studentId) : null;
        const targetName = student?.fullName || student?.user?.fullName || 'سجل مالي';
        items.push({
          id: m.id,
          domain: m.domain,
          kind: 'DELETED_RECORD',
          title: `حذف دفعة: ${targetName}`,
          subtitle: snapshot.bookletId ? 'مذكرة دراسية' : 'اشتراك شهري',
          amount: snapshot.amountPaid,
          timestamp: m.clientTimestamp,
          raw: m,
        });
        continue;
      }

      if (m.domain === 'finance') {
        const isBooklet = payload.paymentType === 'BOOKLET' || Boolean(payload.bookletId);
        const student = payload.studentId ? await offlineDb.getStudentByIdOffline(payload.studentId) : null;
        const studentName = student?.fullName || student?.user?.fullName || 'طالب';

        if (isBooklet) {
          const booklet = payload.bookletId ? await offlineDb.getBookletByIdOffline(payload.bookletId) : null;
          const resolvedAmount =
            payload.amountPaid !== undefined && Number(payload.amountPaid) > 0
              ? Number(payload.amountPaid)
              : payload.amount !== undefined && Number(payload.amount) > 0
              ? Number(payload.amount)
              : booklet && Number(booklet.price) > 0
              ? Number(booklet.price)
              : 50;

          items.push({
            id: m.id,
            domain: m.domain,
            kind: 'BOOKLET_PAYMENT',
            title: `${studentName} • ${booklet?.title || 'مذكرة'}`,
            subtitle: `${resolvedAmount} ج.م`,
            amount: resolvedAmount,
            timestamp: m.clientTimestamp,
            raw: m,
          });
        } else {
          const group = payload.groupId ? await offlineDb.getGroupByIdOffline(payload.groupId) : null;
          const groupFee = Number(group?.monthlyFee ?? (group as any)?.fee ?? (group as any)?.price ?? 0);
          const resolvedAmount =
            payload.amountPaid !== undefined && Number(payload.amountPaid) > 0
              ? Number(payload.amountPaid)
              : payload.amount !== undefined && Number(payload.amount) > 0
              ? Number(payload.amount)
              : groupFee > 0
              ? groupFee
              : 350;

          items.push({
            id: m.id,
            domain: m.domain,
            kind: 'TUITION_PAYMENT',
            title: `${studentName} • ${group?.name || 'المجموعة'}`,
            subtitle: `${payload.periodMonth ?? ''}/${payload.periodYear ?? ''} — ${resolvedAmount} ج.م`,
            amount: resolvedAmount,
            timestamp: m.clientTimestamp,
            raw: m,
          });
        }
        continue;
      }

      if ((m.domain === 'groups' || m.domain === 'students') && ['PATCH', 'PUT'].includes(m.method)) {
        const entityId = payload.id || m.endpoint.split('/').pop() || '';
        const isGroupUpdate = m.domain === 'groups';
        const name = isGroupUpdate
          ? (await offlineDb.getGroupByIdOffline(entityId))?.name || payload.name || 'مجموعة دراسية'
          : (await offlineDb.getStudentByIdOffline(entityId))?.fullName ||
            (await offlineDb.getStudentByIdOffline(entityId))?.user?.fullName ||
            payload.fullName ||
            'طالب';
        const changedFields = Object.keys(payload).filter((key) => key !== 'id').join('، ');
        items.push({
          id: m.id,
          domain: m.domain,
          kind: 'ENTITY_UPDATE',
          title: `تعديل ${isGroupUpdate ? 'مجموعة' : 'طالب'}: ${name}`,
          subtitle: changedFields || 'تحديث البيانات',
          timestamp: m.clientTimestamp,
          raw: m,
        });
        continue;
      }

      if (m.domain === 'attendance') {
        const student = payload.studentId ? await offlineDb.getStudentByIdOffline(payload.studentId) : null;
        const studentName = student?.fullName || student?.user?.fullName || 'طالب';
        const allSessions = await offlineDb.getSessionsOffline();
        const session = allSessions.find((s: any) => String(s.id) === String(payload.sessionId));
        const group = session?.groupId ? await offlineDb.getGroupByIdOffline(session.groupId) : null;
        items.push({
          id: m.id,
          domain: m.domain,
          kind: 'ATTENDANCE_SCAN',
          title: `${studentName} • ${group?.name || session?.group?.name || 'الجلسة الدراسية'}`,
          subtitle: payload.status || 'PRESENT',
          timestamp: m.clientTimestamp,
          raw: m,
        });
        continue;
      }

      items.push({
        id: m.id,
        domain: m.domain,
        kind: 'OTHER',
        title: payload.fullName || payload.name || m.endpoint,
        subtitle: m.method,
        timestamp: m.clientTimestamp,
        raw: m,
      });
    }

    return items.sort((a, b) => a.timestamp - b.timestamp);
  }
}
