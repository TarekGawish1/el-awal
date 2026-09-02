import { describe, it, expect, vi, beforeEach } from 'vitest';
import { offlineDb } from '../db';
import { bootstrapManager } from '../bootstrap-manager';
import * as client from '../../api/client';
import { QueryClient } from '@tanstack/react-query';

vi.mock('../../api/client', () => ({
  apiClient: vi.fn(),
  API_BASE_URL: 'http://localhost:3000/api/v1',
}));

describe('Zero Cold-Start Bootstrap & Offline Repository Layer', () => {
  const queryClient = new QueryClient();

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset the cooldown so each test starts fresh
    (bootstrapManager as any).lastBootstrapAt = 0;
  });

  it('downloads tenant snapshot and populates all relational IndexedDB stores', async () => {
    const mockSnapshot = {
      snapshotVersion: 'v1-2026',
      timestamp: Date.now(),
      isDelta: false,
      role: 'TEACHER',
      data: {
        academicPeriod: { activeAcademicYear: '2026-2027', activeAcademicTerm: 'FIRST_TERM' },
        groups: [
          { id: 'group-101', name: 'مجموعة النخبة', gradeLevel: 'الصف الأول الثانوي' },
          { id: 'group-102', name: 'مجموعة التميز', gradeLevel: 'الصف الثاني الثانوي' },
        ],
        students: [
          {
            id: 'stu-101',
            fullName: 'كريم محمود',
            studentCode: 'STU-2026-0101',
            qrCodeToken: 'qr_tok_karim_101',
            gradeLevel: 'الصف الأول الثانوي',
            groupId: 'group-101',
          },
          {
            id: 'stu-102',
            fullName: 'سارة يوسف',
            studentCode: 'STU-2026-0102',
            qrCodeToken: 'qr_tok_sara_102',
            gradeLevel: 'الصف الثاني الثانوي',
            groupId: 'group-102',
          },
        ],
        sessions: [
          { id: 'sess-101', groupId: 'group-101', sessionDate: '2026-08-20T16:00:00Z' },
        ],
        assessments: [
          { id: 'exam-101', title: 'اختبار تجريبي', totalScore: 20, isPublished: true, questions: [] },
        ],
        courses: [
          { id: 'course-101', title: 'كورس الرياضيات', isPublished: true },
        ],
      },
    };

    vi.mocked(client.apiClient).mockResolvedValueOnce(mockSnapshot);

    const result = await bootstrapManager.performBootstrap({
      forceFull: true,
      queryClient,
    });

    console.log(result);
    console.log(bootstrapManager.getLastError());
    expect(result.success).toBe(true);
    expect(result.counts?.students).toBe(2);
    expect(result.counts?.groups).toBe(2);

    // Verify stored in IndexedDB
    const students = await offlineDb.getStudentsOffline();
    expect(students.length).toBeGreaterThanOrEqual(2);
    expect(students.find((s) => s.id === 'stu-101')?.fullName).toBe('كريم محمود');

    const groups = await offlineDb.getGroupsOffline();
    expect(groups.find((g) => g.id === 'group-101')?.name).toBe('مجموعة النخبة');

    // Verify queryClient pre-population
    const cachedStudents: any = queryClient.getQueryData(['students']);
    expect(cachedStudents?.data).toHaveLength(2);
  });

  it('supports offline search across student names, codes, and QR tokens', async () => {
    const results = await offlineDb.getStudentsOffline({ search: 'كريم' });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].fullName).toBe('كريم محمود');

    const qrResult = await offlineDb.findStudentByQrToken('qr_tok_karim_101');
    expect(qrResult).toBeDefined();
    expect(qrResult?.student.fullName).toBe('كريم محمود');
    expect(qrResult?.groupId).toBe('group-101');
  });

  it('retrieves groups and assessments offline', async () => {
    const groups = await offlineDb.getGroupsOffline();
    expect(groups.length).toBeGreaterThanOrEqual(2);

    const group = await offlineDb.getGroupByIdOffline('group-101');
    expect(group?.name).toBe('مجموعة النخبة');

    const assessments = await offlineDb.getAssessmentsOffline();
    expect(assessments.find((a) => a.id === 'exam-101')?.title).toBe('اختبار تجريبي');
  });

  it('delta response uses bulkPut (upsert-only) and does NOT prune existing students', async () => {
    // Seed 3 students as if from a previous full bootstrap
    await offlineDb.bulkPutStudents([
      { id: 'stu-A', fullName: 'علي', studentCode: 'STU-A', qrCodeToken: 'qr-A' },
      { id: 'stu-B', fullName: 'سارة', studentCode: 'STU-B', qrCodeToken: 'qr-B' },
      { id: 'stu-C', fullName: 'محمد', studentCode: 'STU-C', qrCodeToken: 'qr-C' },
    ]);

    // Delta response returns only 1 changed student
    const deltaSnapshot = {
      snapshotVersion: 'v1-2026',
      timestamp: Date.now(),
      isDelta: true,
      role: 'TEACHER',
      data: {
        students: [
          { id: 'stu-A', fullName: 'علي المحدّث', studentCode: 'STU-A', qrCodeToken: 'qr-A' },
        ],
        groups: [],
        sessions: [],
        schedules: [],
        payments: [],
        assessments: [],
        courses: [],
        booklets: [],
        attendance: [],
      },
    };

    vi.mocked(client.apiClient).mockResolvedValueOnce(deltaSnapshot);

    await bootstrapManager.performBootstrap({ forceFull: false, skipCooldown: true, queryClient });

    const studentsAfter = await offlineDb.getStudentsOffline();
    // stu-B and stu-C must still exist (not pruned by delta)
    expect(studentsAfter.find((s) => s.id === 'stu-B')).toBeDefined();
    expect(studentsAfter.find((s) => s.id === 'stu-C')).toBeDefined();
    // stu-A must be updated
    expect(studentsAfter.find((s) => s.id === 'stu-A')?.fullName).toBe('علي المحدّث');
  });

  it('respects the 3-minute cooldown and skips the network call', async () => {
    (bootstrapManager as any).lastBootstrapAt = Date.now();
    vi.mocked(client.apiClient).mockResolvedValueOnce({});

    const result = await bootstrapManager.performBootstrap({ queryClient });

    // Should skip — no network call made
    expect(client.apiClient).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.isDelta).toBe(true);
  });

  it('forceFull bypasses cooldown and always fetches', async () => {
    (bootstrapManager as any).lastBootstrapAt = Date.now();
    const fullSnapshot = {
      snapshotVersion: 'v1-2026',
      timestamp: Date.now(),
      isDelta: false,
      role: 'TEACHER',
      data: { students: [], groups: [], sessions: [], schedules: [], payments: [],
              assessments: [], courses: [], booklets: [], attendance: [] },
    };
    vi.mocked(client.apiClient).mockResolvedValueOnce(fullSnapshot);

    const result = await bootstrapManager.performBootstrap({ forceFull: true, queryClient });

    expect(client.apiClient).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });
});
