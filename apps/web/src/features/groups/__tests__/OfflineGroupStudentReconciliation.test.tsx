import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { useGroups, useCreateGroup } from '../hooks/useGroups';
import { useStudents, useCreateStudent } from '@/features/students/hooks/use-students';
import { offlineDb } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: vi.fn(),
  API_BASE_URL: 'http://localhost:3000/api/v1',
}));

describe('Offline Groups & Students Filter Parity & Strict Two-Phase Reconciliation', () => {
  let queryClient: QueryClient;
  let originalNavigatorOnLine: boolean;

  beforeEach(async () => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    syncEngine.setQueryClient(queryClient);

    // Clear stores
    const pending = await offlineDb.getPendingMutations();
    for (const p of pending) {
      await offlineDb.removeMutation(p.id);
    }
    const conflicts = await offlineDb.getConflicts();
    for (const c of conflicts) {
      await offlineDb.resolveConflict(c.id);
    }

    // Set offline
    originalNavigatorOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });

    // Seed 15 groups: 11 active for 2026-2027 FIRST_TERM, 4 from other years/archived
    const testGroups: any[] = [];
    for (let i = 1; i <= 11; i++) {
      testGroups.push({
        id: `grp-active-${i}`,
        name: `مجموعة نشطة ${i}`,
        gradeLevel: 'الصف الأول الثانوي',
        academicYear: '2026-2027',
        academicTerm: 'FIRST_TERM',
        status: 'ACTIVE',
        isActive: true,
        monthlyFee: 350,
      });
    }

    // 2 groups from previous academic year
    testGroups.push({
      id: 'grp-old-1',
      name: 'مجموعة قديمة 2025',
      gradeLevel: 'الصف الأول الثانوي',
      academicYear: '2025-2026',
      academicTerm: 'FIRST_TERM',
      status: 'ACTIVE',
      isActive: true,
      monthlyFee: 300,
    });
    testGroups.push({
      id: 'grp-old-2',
      name: 'مجموعة ترم ثان قديم',
      gradeLevel: 'الصف الأول الثانوي',
      academicYear: '2025-2026',
      academicTerm: 'SECOND_TERM',
      status: 'ACTIVE',
      isActive: true,
      monthlyFee: 300,
    });

    // 2 archived/inactive groups
    testGroups.push({
      id: 'grp-archived-1',
      name: 'مجموعة مؤرشفة',
      gradeLevel: 'الصف الأول الثانوي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      status: 'ARCHIVED',
      isArchived: true,
    });
    testGroups.push({
      id: 'grp-inactive-2',
      name: 'مجموعة غير مفعلة',
      gradeLevel: 'الصف الأول الثانوي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      status: 'ACTIVE',
      isActive: false,
    });

    await offlineDb.bulkPutGroups(testGroups);

    // Seed 50 students: 47 active in active groups, 3 archived/inactive
    const testStudents: any[] = [];
    for (let i = 1; i <= 47; i++) {
      const assignedGrpId = `grp-active-${((i - 1) % 11) + 1}`;
      testStudents.push({
        id: `stu-act-${i}`,
        fullName: `طالب نشط ${i}`,
        studentCode: `STU-2026-${String(1000 + i).padStart(5, '0')}`,
        qrCodeToken: `qr-stu-${i}`,
        gradeLevel: 'الصف الأول الثانوي',
        academicStatus: 'ACTIVE',
        groupId: assignedGrpId,
        user: { fullName: `طالب نشط ${i}`, isActive: true },
        updatedAt: Date.now(),
      });
    }

    testStudents.push({
      id: 'stu-archived-1',
      fullName: 'طالب مؤرشف',
      gradeLevel: 'الصف الأول الثانوي',
      academicStatus: 'ACTIVE',
      isArchived: true,
      user: { fullName: 'طالب مؤرشف', isActive: false },
    });
    testStudents.push({
      id: 'stu-inactive-2',
      fullName: 'طالب معطل',
      gradeLevel: 'الصف الأول الثانوي',
      academicStatus: 'ACTIVE',
      user: { fullName: 'طالب معطل', isActive: false },
    });
    testStudents.push({
      id: 'stu-dropped-3',
      fullName: 'طالب منسحب',
      gradeLevel: 'الصف الأول الثانوي',
      academicStatus: 'DROPPED_OUT',
      user: { fullName: 'طالب منسحب', isActive: true },
    });

    await offlineDb.bulkPutStudents(testStudents);
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: originalNavigatorOnLine,
      configurable: true,
    });
  });

  it('filters offline groups by active academic period returning exactly 11 groups', async () => {
    const groups = await offlineDb.getGroupsOffline({
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
    });

    expect(groups).toHaveLength(11);
    const ids = groups.map((g) => g.id);
    expect(ids).not.toContain('grp-old-1');
    expect(ids).not.toContain('grp-old-2');
    expect(ids).not.toContain('grp-archived-1');
    expect(ids).not.toContain('grp-inactive-2');
  });

  it('filters offline students by active academic period returning exactly 47 students', async () => {
    const students = await offlineDb.getStudentsOffline({
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
    });

    expect(students).toHaveLength(47);
  });

  it('creates group and student offline, increments counts immediately, and reconciles IDs via unified batch upon reconnection', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    // 1. Create a new group offline
    const { result: createGroupResult } = renderHook(() => useCreateGroup(), { wrapper });
    let createdGroup: any;
    await act(async () => {
      createdGroup = await createGroupResult.current.mutateAsync({
        name: 'مجموعة المتميزين أوفلاين',
        gradeLevel: 'الصف الأول الثانوي',
        academicYear: '2026-2027',
        academicTerm: 'FIRST_TERM',
        monthlyFee: 400,
        maxCapacity: 30,
      });
    });

    expect(createdGroup).toBeDefined();
    expect(createdGroup.isOfflineCreated).toBe(true);

    // Verify group count increased offline from 11 to 12
    const currentGroups = await offlineDb.getGroupsOffline({
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
    });
    expect(currentGroups).toHaveLength(12);

    // 2. Create a new student offline linked to the new group
    const { result: createStudentResult } = renderHook(() => useCreateStudent(), { wrapper });
    let createdStudent: any;
    await act(async () => {
      createdStudent = await createStudentResult.current.mutateAsync({
        fullName: 'طالب جديد أوفلاين',
        phone: '01099887766',
        gradeLevel: 'الصف الأول الثانوي',
        academicStage: 'المرحلة الثانوية',
        groupId: createdGroup.id,
      });
    });

    expect(createdStudent).toBeDefined();
    expect(createdStudent.isOfflineCreated).toBe(true);

    // Verify student count increased offline from 47 to 48
    const currentStudents = await offlineDb.getStudentsOffline({
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
    });
    expect(currentStudents).toHaveLength(48);

    // Verify outbox has 2 pending creations
    const pending = await offlineDb.getPendingMutations();
    expect(pending.length).toBeGreaterThanOrEqual(2);

    // 3. Reconnect Network & Flush Outbox via Strict Two-Phase Unified Batch
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
    });

    const serverGroupId = 'grp-server-authoritative-99';
    const serverStudentId = 'stu-server-authoritative-99';
    const serverStudentCode = 'STU-2026-00048';

    // Mock unified batch response
    vi.mocked(apiClient).mockImplementation(async (endpoint: string) => {
      if (endpoint === '/sync/batch') {
        return {
          success: true,
          idMappings: {
            groups: { [createdGroup.id]: serverGroupId },
            students: {
              [createdStudent.id]: {
                id: serverStudentId,
                studentCode: serverStudentCode,
                qrCodeToken: 'qr-token-confirmed-99',
              },
            },
          },
        };
      }
      return { success: true };
    });

    // Run outbox flush
    const syncResult = await syncEngine.flushOutbox();
    expect(syncResult.synced).toBeGreaterThanOrEqual(2);

    // Verify local IndexedDB was updated with authoritative server IDs and code
    const reconciledGroup = await offlineDb.getGroupByIdOffline(serverGroupId);
    expect(reconciledGroup).toBeDefined();
    expect(reconciledGroup?.name).toBe('مجموعة المتميزين أوفلاين');

    const reconciledStudent = await offlineDb.getStudentByIdOffline(serverStudentId);
    expect(reconciledStudent).toBeDefined();
    expect(reconciledStudent?.studentCode).toBe(serverStudentCode);

    // Verify temporary IDs were pruned
    expect(await offlineDb.getGroupByIdOffline(createdGroup.id)).toBeNull();
    expect(await offlineDb.getStudentByIdOffline(createdStudent.id)).toBeNull();

    // Verify outbox is cleared
    const pendingAfter = await offlineDb.getPendingMutations();
    expect(pendingAfter).toHaveLength(0);
  });
});
