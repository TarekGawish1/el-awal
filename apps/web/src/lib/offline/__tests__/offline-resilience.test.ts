import { describe, it, expect, vi, beforeEach } from 'vitest';
import { offlineDb } from '../db';
import { bootstrapManager } from '../bootstrap-manager';
import { syncEngine } from '../sync-engine';
import * as client from '../../api/client';
import { QueryClient } from '@tanstack/react-query';
import { API_ENDPOINTS } from '../../api/endpoints';

vi.mock('../../api/client', () => ({
  apiClient: vi.fn(),
  API_BASE_URL: 'http://localhost:3000/api/v1',
}));

describe('Offline Platform Resilience & Outbox Topological Engine', () => {
  const queryClient = new QueryClient();

  beforeEach(async () => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('1. Resilient Client Bootstrap Ingestion', () => {
    it('handles nested envelope structure { success: true, data: { groups: [], ... } } and empty collections without throwing', async () => {
      const nestedEnvelope = {
        success: true,
        data: {
          snapshotVersion: 'v1-2026',
          timestamp: Date.now(),
          isDelta: false,
          role: 'TEACHER',
          data: {
            academicPeriod: {
              academicYear: '2026-2027',
              academicTerm: 'FIRST_TERM',
            },
            groups: [],
            students: [],
            sessions: [],
            schedules: [],
            payments: [],
            assessments: [],
            courses: [],
          },
        },
      };

      vi.mocked(client.apiClient).mockResolvedValueOnce(nestedEnvelope);

      const events: any[] = [];
      const unsub = bootstrapManager.subscribe((e) => events.push(e));

      const result = await bootstrapManager.performBootstrap({
        forceFull: true,
        queryClient,
      });

      unsub();

      expect(result.success).toBe(true);
      expect(result.counts?.groups).toBe(0);
      expect(result.counts?.students).toBe(0);

      // Verify progress steps
      const percentages = events.map((e) => e.percentage);
      expect(percentages).toContain(0);
      expect(percentages).toContain(25);
      expect(percentages).toContain(50);
      expect(percentages).toContain(75);
      expect(percentages).toContain(100);
    });

    it('catches network errors gracefully and notifies error listener without crashing', async () => {
      vi.mocked(client.apiClient).mockRejectedValueOnce(new Error('Network offline or DNS failure'));

      const events: any[] = [];
      const unsub = bootstrapManager.subscribe((e) => events.push(e));

      const result = await bootstrapManager.performBootstrap({
        forceFull: true,
        queryClient,
      });

      unsub();

      expect(result.success).toBe(false);
      expect(bootstrapManager.getLastError()).toContain('Network offline');
      expect(events.some((e) => e.type === 'ERROR')).toBe(true);
    });
  });

  describe('2. Offline Operations & Topological Outbox Flush Sequence', () => {
    it('enforces sequential flushing: Groups -> Students -> Enrollments -> Attendance -> Payments -> Assessments', async () => {
      // 1. Enqueue group creation
      const groupId = 'group-offline-uuid7';
      await syncEngine.enqueue(
        'groups',
        API_ENDPOINTS.GROUPS.CREATE,
        'POST',
        { id: groupId, name: 'مجموعة النجوم', gradeLevel: 'الصف الأول' },
        { optimisticId: groupId },
      );

      // 2. Enqueue student creation
      const studentId = 'stu-offline-uuid7';
      await syncEngine.enqueue(
        'students',
        API_ENDPOINTS.STUDENTS.CREATE,
        'POST',
        { id: studentId, fullName: 'أحمد محمود', phone: '01099887766' },
        { optimisticId: studentId },
      );

      // 3. Enqueue group enrollment (must come after student & group)
      await syncEngine.enqueue(
        'groups',
        API_ENDPOINTS.GROUPS.ENROLL(groupId),
        'POST',
        { studentId },
      );

      // 4. Enqueue attendance
      await syncEngine.enqueue(
        'attendance',
        API_ENDPOINTS.ATTENDANCE.SCAN_QR('sess-1'),
        'POST',
        { sessionId: 'sess-1', studentId, status: 'PRESENT' },
      );

      // 5. Enqueue payment
      await syncEngine.enqueue(
        'finance',
        API_ENDPOINTS.SUBSCRIPTIONS.RECORD_PAYMENT,
        'POST',
        { studentId, groupId, periodYear: 2026, periodMonth: 9, amountPaid: 350 },
      );

      const pendingCountBefore = await offlineDb.getPendingCount();
      expect(pendingCountBefore).toBe(5);

      const callOrder: string[] = [];

      vi.mocked(client.apiClient).mockImplementation(async (endpoint: string, opts?: any) => {
        callOrder.push(endpoint);
        if (endpoint === API_ENDPOINTS.SYNC.ATTENDANCE || endpoint === API_ENDPOINTS.SYNC.PAYMENTS) {
          const body = opts?.body ? JSON.parse(opts.body) : {};
          const processedOperationIds = (body.operations || []).map((o: any) => o.id);
          return { processedOperationIds, conflicts: [] };
        }
        return { id: 'mock-id', success: true };
      });

      const flushResult = await syncEngine.flushOutbox();

      expect(flushResult.synced).toBeGreaterThan(0);

      // Verify sequence ordering
      const groupCreateIdx = callOrder.findIndex((url) => url === API_ENDPOINTS.GROUPS.CREATE);
      const studentCreateIdx = callOrder.findIndex((url) => url === API_ENDPOINTS.STUDENTS.CREATE);
      const enrollIdx = callOrder.findIndex((url) => url.includes('/groups/') && url.endsWith('/students'));
      const attBatchIdx = callOrder.findIndex((url) => url === API_ENDPOINTS.SYNC.ATTENDANCE);
      const payBatchIdx = callOrder.findIndex((url) => url === API_ENDPOINTS.SYNC.PAYMENTS);

      expect(groupCreateIdx).toBeGreaterThanOrEqual(0);
      expect(studentCreateIdx).toBeGreaterThan(groupCreateIdx);
      expect(enrollIdx).toBeGreaterThan(studentCreateIdx);
      expect(attBatchIdx).toBeGreaterThan(enrollIdx);
      expect(payBatchIdx).toBeGreaterThan(attBatchIdx);

      const pendingCountAfter = await offlineDb.getPendingCount();
      expect(pendingCountAfter).toBe(0);
    });
  });
});
