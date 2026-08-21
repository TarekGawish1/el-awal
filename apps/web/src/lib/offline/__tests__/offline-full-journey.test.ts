import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  offlineDb,
  getGroupDetailsOffline,
  getStudentDetailsOffline,
  StudentEntity,
  GroupEntity,
  SessionEntity,
} from '../db';
import { syncEngine } from '../sync-engine';
import { generateUUIDv7 } from '../uuid';
import {
  saveOfflineCredentials,
  verifyOfflineLogin,
  pureJsSha256,
} from '@/features/auth/utils/offline-auth';
import * as clientModule from '../../api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { bootstrapManager } from '../bootstrap-manager';

vi.mock('../../api/client', () => ({
  apiClient: vi.fn(),
  API_BASE_URL: 'http://localhost:3000/api/v1',
}));

describe('Comprehensive Offline Full User Journeys & Parity Suite', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Mobile & Web Offline Authentication Journey', () => {
    const teacherSession = {
      accessToken: 'jwt-teacher-token-xyz',
      refreshToken: 'refresh-teacher-token-xyz',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: {
        id: 'user-teacher-uuid',
        fullName: 'الأستاذ أحمد فؤاد',
        email: 'ahmed.fouad@elawal.com',
        phone: '+201099887766',
        role: 'TEACHER' as const,
      },
    };

    it('handles mobile HTTP context where crypto.subtle is undefined using pure JS SHA-256', () => {
      const hash1 = pureJsSha256('salt:MyPassword123:salt');
      expect(hash1).toHaveLength(64);
      expect(typeof hash1).toBe('string');
      // Identical input produces identical deterministic output
      expect(pureJsSha256('salt:MyPassword123:salt')).toBe(hash1);
    });

    it('authenticates user offline using phone format variations entered on mobile keyboards', async () => {
      await saveOfflineCredentials('ahmed.fouad@elawal.com', 'SecurePass2026', teacherSession);

      // User enters Egyptian local phone with spaces: " 01099887766 "
      const loginByLocalPhone = await verifyOfflineLogin({
        identifier: ' 01099887766 ',
        password: 'SecurePass2026',
      });
      expect(loginByLocalPhone.user.fullName).toBe('الأستاذ أحمد فؤاد');

      // User enters international format: "+20 109 988 7766"
      const loginByIntlPhone = await verifyOfflineLogin({
        identifier: '+20 109 988 7766',
        password: 'SecurePass2026',
      });
      expect(loginByIntlPhone.user.id).toBe('user-teacher-uuid');
    });
  });

  describe('2. Universal Offline Entity Creation & Mutation Engine', () => {
    it('generates valid RFC 9562 UUIDv7 strings for client-side offline entities', () => {
      const id1 = generateUUIDv7();
      const id2 = generateUUIDv7();

      expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(id2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(id1).not.toBe(id2);
    });

    it('creates group and student offline with immediate IndexedDB persistence and outbox queuing', async () => {
      const groupId = generateUUIDv7();
      const studentId = generateUUIDv7();

      // 1. Create Academic Group Offline
      const newGroup: GroupEntity = {
        id: groupId,
        name: 'مجموعة النخبة - الصف الثالث الثانوي',
        gradeLevel: 'الصف الثالث الثانوي',
        academicYear: '2026-2027',
        academicTerm: 'FIRST_TERM',
        maxCapacity: 30,
        monthlyFee: 450,
        schedules: [{ dayOfWeek: 1, startTime: '16:00', endTime: '18:00', location: 'القاعة 1' }],
      };
      await offlineDb.bulkPutGroups([newGroup]);
      await syncEngine.enqueue('groups', API_ENDPOINTS.GROUPS.CREATE, 'POST', newGroup, { optimisticId: groupId });

      // 2. Create Student Offline
      const newStudent: StudentEntity = {
        id: studentId,
        fullName: 'عمر خالد محمود',
        phone: '01011223344',
        studentCode: 'STU-990011',
        qrCodeToken: studentId,
        gradeLevel: 'الصف الثالث الثانوي',
        groupId: groupId,
        user: {
          id: studentId,
          fullName: 'عمر خالد محمود',
          phone: '01011223344',
          isActive: true,
        },
      };
      await offlineDb.bulkPutStudents([newStudent]);
      await syncEngine.enqueue('students', API_ENDPOINTS.STUDENTS.CREATE, 'POST', newStudent, { optimisticId: studentId });

      // 3. Verify immediate local reads
      const storedGroup = await offlineDb.getGroupByIdOffline(groupId);
      expect(storedGroup?.name).toBe('مجموعة النخبة - الصف الثالث الثانوي');

      const storedStudent = await offlineDb.getStudentByIdOffline(studentId);
      expect(storedStudent?.fullName).toBe('عمر خالد محمود');

      // 4. Verify outbox queue count
      const pendingCount = await offlineDb.getPendingCount();
      expect(pendingCount).toBeGreaterThanOrEqual(2);
    });

    it('records QR attendance and manual excuse notes offline into outbox', async () => {
      const sessionId = generateUUIDv7();
      const studentId = generateUUIDv7();

      // Create session offline
      await offlineDb.bulkPutSessions([{
        id: sessionId,
        groupId: 'grp-1',
        sessionDate: '2026-08-21',
        topic: 'حصة البلاغة والنحو',
      }]);

      // Scan attendance offline
      const attOpId = await syncEngine.enqueue(
        'attendance',
        API_ENDPOINTS.ATTENDANCE.SCAN_QR(sessionId),
        'POST',
        {
          sessionId,
          qrCodeToken: studentId,
          studentId,
          status: 'PRESENT',
          recordingMethod: 'QR_SCAN',
        },
      );
      expect(attOpId).toBeDefined();

      const pending = await offlineDb.getPendingMutations();
      const foundAtt = pending.find((m) => m.id === attOpId);
      expect(foundAtt?.domain).toBe('attendance');
      expect(foundAtt?.payload.sessionId).toBe(sessionId);
    });
  });

  describe('3. Relational Repository Safety & Getter Parity', () => {
    it('getGroupDetailsOffline returns full joined student roster and safe defaults', async () => {
      const groupId = generateUUIDv7();
      const student1Id = generateUUIDv7();

      await offlineDb.bulkPutGroups([{
        id: groupId,
        name: 'مجموعة المتفوقين',
        gradeLevel: 'الصف الأول الثانوي',
      }]);

      await offlineDb.bulkPutStudents([{
        id: student1Id,
        fullName: 'سارة إبراهيم',
        studentCode: 'STU-100200',
        qrCodeToken: student1Id,
        groupId: groupId,
      }]);

      const details = await getGroupDetailsOffline(groupId);
      expect(details).not.toBeNull();
      expect(details.name).toBe('مجموعة المتفوقين');
      expect(details.schedules).toBeDefined();
      expect(details._count.enrollments).toBe(1);
      expect(details.students).toHaveLength(1);
      expect(details.students[0].fullName).toBe('سارة إبراهيم');
    });

    it('getStudentDetailsOffline returns safe user and empty relation arrays without throwing', async () => {
      const studentId = generateUUIDv7();

      // Store a bare student entity with minimal fields
      await offlineDb.bulkPutStudents([{
        id: studentId,
        fullName: 'كريم سامي',
        studentCode: 'STU-333444',
        qrCodeToken: studentId,
      }]);

      const details = await getStudentDetailsOffline(studentId);
      expect(details).not.toBeNull();
      expect(details.user.fullName).toBe('كريم سامي');
      expect(details.groupEnrollments).toEqual([]);
      expect(details.parentLinks).toEqual([]);
      expect(details.attendanceRecords).toEqual([]);
      expect(details.paymentRecords).toEqual([]);
    });

    it('resolves group and student details cleanly regardless of string or numeric ID parameter types', async () => {
      const strId = '998877';
      await offlineDb.bulkPutGroups([{
        id: strId,
        name: 'مجموعة الأرقام',
        gradeLevel: 'الصف الثاني الثانوي',
      }]);

      const groupFromNum = await offlineDb.getGroupByIdOffline(998877 as any);
      expect(groupFromNum?.name).toBe('مجموعة الأرقام');

      const groupDetails = await getGroupDetailsOffline(998877 as any);
      expect(groupDetails?.name).toBe('مجموعة الأرقام');
    });
  });

  describe('4. Connectivity Restoration & Bi-Directional Synchronization', () => {
    it('flushes queued outbox mutations upstream then triggers downstream bootstrap pull', async () => {
      // Mock successful server sync responses
      vi.mocked(clientModule.apiClient).mockImplementation(async (endpoint: string, options?: any) => {
        if (endpoint.includes('/sync/attendance')) {
          const body = JSON.parse(options?.body || '{}');
          return {
            processedOperationIds: (body.operations || []).map((o: any) => o.id),
            conflicts: [],
          } as any;
        }
        if (endpoint.includes('/sync/payments')) {
          const body = JSON.parse(options?.body || '{}');
          return {
            processedOperationIds: (body.operations || []).map((o: any) => o.id),
            conflicts: [],
          } as any;
        }
        if (endpoint.includes('/sync/bootstrap')) {
          return {
            snapshotVersion: 'v1-2026',
            timestamp: Date.now(),
            isDelta: false,
            data: {
              groups: [{ id: 'server-group-1', name: 'المجموعة المحدثة من السيرفر' }],
              students: [{ id: 'server-student-1', fullName: 'طالب السيرفر الجديد' }],
            },
          } as any;
        }
        return { success: true, id: 'server-reconciled-id' } as any;
      });

      // Clear any previous mutations
      const oldPending = await offlineDb.getPendingMutations();
      for (const m of oldPending) {
        await offlineDb.removeMutation(m.id);
      }

      // Enqueue diverse mutations
      await syncEngine.enqueue('attendance', API_ENDPOINTS.SYNC.ATTENDANCE, 'POST', {
        sessionId: 'sess-1',
        studentId: 'stu-1',
      });
      await syncEngine.enqueue('finance', API_ENDPOINTS.SYNC.PAYMENTS, 'POST', {
        studentId: 'stu-1',
        periodYear: 2026,
        periodMonth: 8,
        amountPaid: 350,
      });

      const initialPending = await offlineDb.getPendingCount();
      expect(initialPending).toBe(2);

      // Flush outbox
      const flushResult = await syncEngine.flushOutbox();
      expect(flushResult.failed).toBe(0);
      expect(flushResult.synced).toBe(2);

      const finalPending = await offlineDb.getPendingCount();
      expect(finalPending).toBe(0);

      // Verify downstream pull populated IndexedDB with remote server updates
      const serverGroup = await offlineDb.getGroupByIdOffline('server-group-1');
      expect(serverGroup?.name).toBe('المجموعة المحدثة من السيرفر');
    });
  });
});
