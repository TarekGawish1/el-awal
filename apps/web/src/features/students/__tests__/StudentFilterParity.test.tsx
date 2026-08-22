import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { useStudents } from '../hooks/use-students';
import { offlineDb } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';

describe('Student Offline Filter Parity & Sync Conflict Surfacing', () => {
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

    // Seed test groups
    await offlineDb.bulkPutGroups([
      {
        id: 'grp-phys-2026',
        name: 'مجموعة الفيزياء 2026',
        gradeLevel: 'الصف الأول الثانوي',
        academicYear: '2026-2027',
        academicTerm: 'FIRST_TERM',
      },
      {
        id: 'grp-chem-2025',
        name: 'مجموعة الكيمياء 2025',
        gradeLevel: 'الصف الأول الثانوي',
        academicYear: '2025-2026',
        academicTerm: 'FIRST_TERM',
      },
    ]);

    // Seed 50 students:
    // 47 Active students in grp-phys-2026
    // 2 Soft-deleted/archived students
    // 1 Dropped out student
    const testStudents: any[] = [];
    for (let i = 1; i <= 47; i++) {
      testStudents.push({
        id: `stu-${i}`,
        fullName: `طالب نشط ${i}`,
        studentCode: `STU-${1000 + i}`,
        qrCodeToken: `qr-stu-${i}`,
        gradeLevel: 'الصف الأول الثانوي',
        academicStatus: 'ACTIVE',
        groupId: 'grp-phys-2026',
        user: { fullName: `طالب نشط ${i}`, isActive: true },
        updatedAt: Date.now(),
      });
    }

    // Archived student 48
    testStudents.push({
      id: 'stu-48',
      fullName: 'طالب مؤرشف 48',
      studentCode: 'STU-1048',
      qrCodeToken: 'qr-stu-48',
      gradeLevel: 'الصف الأول الثانوي',
      academicStatus: 'ACTIVE',
      isArchived: true,
      groupId: 'grp-phys-2026',
      user: { fullName: 'طالب مؤرشف 48', isActive: false },
      updatedAt: Date.now(),
    });

    // Inactive user student 49
    testStudents.push({
      id: 'stu-49',
      fullName: 'طالب معطل 49',
      studentCode: 'STU-1049',
      qrCodeToken: 'qr-stu-49',
      gradeLevel: 'الصف الأول الثانوي',
      academicStatus: 'ACTIVE',
      groupId: 'grp-phys-2026',
      user: { fullName: 'طالب معطل 49', isActive: false },
      updatedAt: Date.now(),
    });

    // Dropped out student 50
    testStudents.push({
      id: 'stu-50',
      fullName: 'طالب منسحب 50',
      studentCode: 'STU-1050',
      qrCodeToken: 'qr-stu-50',
      gradeLevel: 'الصف الأول الثانوي',
      academicStatus: 'DROPPED_OUT',
      groupId: 'grp-phys-2026',
      user: { fullName: 'طالب منسحب 50', isActive: true },
      updatedAt: Date.now(),
    });

    await offlineDb.bulkPutStudents(testStudents);
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: originalNavigatorOnLine,
      configurable: true,
    });
  });

  it('filters out archived, inactive, and dropped out students in offline repository yielding exact count of 47', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useStudents({ groupId: 'grp-phys-2026' }), { wrapper });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.data?.data).toBeDefined();
    // Exactly 47 active students should be returned, excluding the 3 inactive/archived/dropped out students
    expect(result.current.data?.data).toHaveLength(47);
    expect(result.current.data?.meta.total).toBe(47);

    // Verify none of the archived/inactive students appear
    const ids = result.current.data?.data.map((s) => s.id);
    expect(ids).not.toContain('stu-48');
    expect(ids).not.toContain('stu-49');
    expect(ids).not.toContain('stu-50');
  });

  it('records a sync conflict when an offline student creation is rejected due to duplicate validation errors', async () => {
    // Enqueue a student creation mutation
    const mutationId = 'mut-stu-dup-phone';
    await syncEngine.enqueue(
      'students',
      '/api/v1/students',
      'POST',
      {
        fullName: 'طالب مكرر الهاتف',
        phone: '01012345678',
        gradeLevel: 'الصف الأول الثانوي',
      },
    );

    const pending = await offlineDb.getPendingMutations();
    const studentMut = pending.find((m) => m.domain === 'students');
    expect(studentMut).toBeDefined();

    // Simulate sync execution failure with 409 duplicate phone error
    // @ts-ignore
    await syncEngine['handleFailedMutation'](
      studentMut!,
      'Phone number [01012345678] is already registered (409 Conflict)',
    );

    // Verify mutation removed from outbox to prevent infinite loop
    const pendingAfter = await offlineDb.getPendingMutations();
    expect(pendingAfter.find((m) => m.id === studentMut!.id)).toBeUndefined();

    // Verify conflict logged in sync_conflicts
    const conflicts = await offlineDb.getConflicts();
    const studentConflict = conflicts.find((c) => c.domain === 'students');
    expect(studentConflict).toBeDefined();
    expect(studentConflict?.reason).toContain('تعذر إتمام العملية على الخادم');
    expect(studentConflict?.reason).toContain('already registered');
  });
});
