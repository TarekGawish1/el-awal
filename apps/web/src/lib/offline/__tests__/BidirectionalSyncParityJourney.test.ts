import { describe, it, expect, vi, beforeEach } from 'vitest';
import { offlineDb } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import { bootstrapManager } from '@/lib/offline/bootstrap-manager';
import { apiClient } from '@/lib/api/client';

describe('Bi-Directional Sync & Storage Wipe Integration Journey', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // 1. Complete local offline wipe before test
    await offlineDb.wipeAllOfflineData();
  });

  it('performs complete local storage wipe, hydrates 40 students / 4 groups baseline, conducts offline mutations, and executes bidirectional reconciliation', async () => {
    // -------------------------------------------------------------
    // STEP 1: Verify Initial Clean Local Storage (0 records)
    // -------------------------------------------------------------
    let students = await offlineDb.getStudentsOffline({
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
    });
    let groups = await offlineDb.getGroupsOffline({
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
    });
    let pendingMutations = await offlineDb.getPendingMutations();

    expect(students.length).toBe(0);
    expect(groups.length).toBe(0);
    expect(pendingMutations.length).toBe(0);

    // -------------------------------------------------------------
    // STEP 2: Baseline Hydration (Bootstrap 40 Students, 4 Groups)
    // -------------------------------------------------------------
    const mockBootstrapGroups = [
      {
        id: 'group-1',
        name: 'مجموعة الصف الأول الثانوي (أ)',
        gradeLevel: 'الصف الأول الثانوي',
        academicYear: '2026-2027',
        academicTerm: 'FIRST_TERM',
        monthlyFee: 250,
        isActive: true,
      },
      {
        id: 'group-2',
        name: 'مجموعة الصف الأول الثانوي (ب)',
        gradeLevel: 'الصف الأول الثانوي',
        academicYear: '2026-2027',
        academicTerm: 'FIRST_TERM',
        monthlyFee: 250,
        isActive: true,
      },
      {
        id: 'group-3',
        name: 'مجموعة الصف الثاني الثانوي (علمي)',
        gradeLevel: 'الصف الثاني الثانوي',
        academicYear: '2026-2027',
        academicTerm: 'FIRST_TERM',
        monthlyFee: 300,
        isActive: true,
      },
      {
        id: 'group-4',
        name: 'مجموعة الصف الثالث الثانوي (العباقرة)',
        gradeLevel: 'الصف الثالث الثانوي',
        academicYear: '2026-2027',
        academicTerm: 'FIRST_TERM',
        monthlyFee: 350,
        isActive: true,
      },
    ];

    const mockBootstrapStudents: any[] = [];
    for (let i = 1; i <= 40; i++) {
      const padded = String(i).padStart(4, '0');
      const groupIdx = Math.floor((i - 1) / 10);
      const assignedGroup = mockBootstrapGroups[groupIdx];
      mockBootstrapStudents.push({
        id: `student-${i}`,
        fullName: `طالب مصري ${i}`,
        phone: `+2010100000${String(i).padStart(2, '0')}`,
        studentCode: `STU-2026-${padded}`,
        qrCodeToken: `QR-STU-2026-${padded}`,
        academicStatus: 'ACTIVE',
        isArchived: false,
        user: { fullName: `طالب مصري ${i}`, isActive: true },
        groupEnrollments: [
          {
            groupId: assignedGroup.id,
            status: 'ACTIVE',
            group: {
              id: assignedGroup.id,
              name: assignedGroup.name,
              academicYear: '2026-2027',
              academicTerm: 'FIRST_TERM',
            },
          },
        ],
      });
    }

    // Hydrate local IndexedDB stores
    await offlineDb.bulkPutGroups(mockBootstrapGroups);
    await offlineDb.bulkPutStudents(mockBootstrapStudents);

    // Verify 1:1 Parity: Exactly 40 Students and 4 Groups
    students = await offlineDb.getStudentsOffline({
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
    });
    groups = await offlineDb.getGroupsOffline({
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
    });

    expect(groups.length).toBe(4);
    expect(students.length).toBe(40);

    // -------------------------------------------------------------
    // STEP 3: Offline Operations (Network Disconnected)
    // -------------------------------------------------------------
    // 3.1 Create 1 new Group offline -> Total groups should become 5
    const offlineGroupId = 'temp-group-5';
    await offlineDb.putGroup({
      id: offlineGroupId,
      name: 'مجموعة التقوية المسائية',
      gradeLevel: 'الصف الأول الثانوي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      monthlyFee: 200,
      isActive: true,
    });
    await offlineDb.enqueueMutation({
      id: 'mut-grp-5',
      domain: 'groups',
      endpoint: '/groups',
      method: 'POST',
      payload: {
        id: offlineGroupId,
        name: 'مجموعة التقوية المسائية',
        gradeLevel: 'الصف الأول الثانوي',
        academicYear: '2026-2027',
        academicTerm: 'FIRST_TERM',
        monthlyFee: 200,
      },
      timestamp: Date.now(),
      retryCount: 0,
      status: 'PENDING',
      optimisticId: offlineGroupId,
    });

    groups = await offlineDb.getGroupsOffline({
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
    });
    expect(groups.length).toBe(5);

    // 3.2 Create 2 new Students assigned to the new group offline -> Total students become 42
    const offlineStudent1Id = 'temp-stu-41';
    const offlineStudent2Id = 'temp-stu-42';

    await offlineDb.putStudent({
      id: offlineStudent1Id,
      fullName: 'أحمد حسام',
      studentCode: 'STU-OFFLINE-0041',
      qrCodeToken: 'QR-OFFLINE-0041',
      academicStatus: 'ACTIVE',
      isArchived: false,
      user: { fullName: 'أحمد حسام', isActive: true },
      groupEnrollments: [
        {
          groupId: offlineGroupId,
          status: 'ACTIVE',
          group: { id: offlineGroupId, name: 'مجموعة التقوية المسائية', academicYear: '2026-2027', academicTerm: 'FIRST_TERM' },
        },
      ],
    });
    await offlineDb.enqueueMutation({
      id: 'mut-stu-41',
      domain: 'students',
      endpoint: '/students',
      method: 'POST',
      payload: {
        id: offlineStudent1Id,
        fullName: 'أحمد حسام',
        groupId: offlineGroupId,
        academicYear: '2026-2027',
        academicTerm: 'FIRST_TERM',
      },
      timestamp: Date.now(),
      retryCount: 0,
      status: 'PENDING',
      optimisticId: offlineStudent1Id,
    });

    await offlineDb.putStudent({
      id: offlineStudent2Id,
      fullName: 'منار السيد',
      studentCode: 'STU-OFFLINE-0042',
      qrCodeToken: 'QR-OFFLINE-0042',
      academicStatus: 'ACTIVE',
      isArchived: false,
      user: { fullName: 'منار السيد', isActive: true },
      groupEnrollments: [
        {
          groupId: offlineGroupId,
          status: 'ACTIVE',
          group: { id: offlineGroupId, name: 'مجموعة التقوية المسائية', academicYear: '2026-2027', academicTerm: 'FIRST_TERM' },
        },
      ],
    });
    await offlineDb.enqueueMutation({
      id: 'mut-stu-42',
      domain: 'students',
      endpoint: '/students',
      method: 'POST',
      payload: {
        id: offlineStudent2Id,
        fullName: 'منار السيد',
        groupId: offlineGroupId,
        academicYear: '2026-2027',
        academicTerm: 'FIRST_TERM',
      },
      timestamp: Date.now(),
      retryCount: 0,
      status: 'PENDING',
      optimisticId: offlineStudent2Id,
    });

    students = await offlineDb.getStudentsOffline({
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
    });
    expect(students.length).toBe(42);

    // 3.3 Scan Attendance for 3 students offline
    for (let i = 1; i <= 3; i++) {
      await offlineDb.enqueueMutation({
        id: `mut-att-${i}`,
        domain: 'attendance',
        endpoint: '/attendance/sessions/session-1/scan-qr',
        method: 'POST',
        payload: {
          sessionId: 'session-1',
          studentId: `student-${i}`,
          qrCodeToken: `QR-STU-2026-000${i}`,
          status: 'PRESENT',
        },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'PENDING',
      });
    }

    // Verify Outbox Summary before reconnection
    const summary = await syncEngine.getPendingOutboxSummary();
    expect(summary.groups.length).toBe(1);
    expect(summary.groups[0].name).toBe('مجموعة التقوية المسائية');
    expect(summary.students.length).toBe(2);
    expect(summary.students[0].fullName).toBe('أحمد حسام');
    expect(summary.students[1].fullName).toBe('منار السيد');
    expect(summary.attendanceCount).toBe(3);
    expect(summary.totalCount).toBe(6);

    // -------------------------------------------------------------
    // STEP 4: Network Reconnection & Upstream Push Reconciliation
    // -------------------------------------------------------------
    // Mock Batch API Response with server IDs and generated codes
    const serverGroupId = 'srv-group-5';
    const serverStudent1Id = 'srv-stu-41';
    const serverStudent2Id = 'srv-stu-42';

    // Execute ID Reconciliation in offlineDb
    await offlineDb.reconcileEntityIds({
      groups: { [offlineGroupId]: serverGroupId },
      students: {
        [offlineStudent1Id]: { id: serverStudent1Id, studentCode: 'STU-2026-0041' },
        [offlineStudent2Id]: { id: serverStudent2Id, studentCode: 'STU-2026-0042' },
      },
    });

    // Clear the flushed outbox items
    for (const m of await offlineDb.getPendingMutations()) {
      await offlineDb.removeMutation(m.id);
    }

    // Verify reconciled students have persistent server IDs and sequential student codes
    students = await offlineDb.getStudentsOffline({
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
    });
    expect(students.find((s) => s.id === serverStudent1Id)?.studentCode).toBe('STU-2026-0041');
    expect(students.find((s) => s.id === serverStudent2Id)?.studentCode).toBe('STU-2026-0042');
    expect(students.length).toBe(42);

    // -------------------------------------------------------------
    // STEP 5: Downstream Pull (Simulate Remote Device adding student 43)
    // -------------------------------------------------------------
    const remoteStudent43 = {
      id: 'srv-stu-43',
      fullName: 'خالد وليد النمر',
      phone: '+201099991111',
      studentCode: 'STU-2026-0043',
      qrCodeToken: 'QR-STU-2026-0043',
      academicStatus: 'ACTIVE',
      isArchived: false,
      user: { fullName: 'خالد وليد النمر', isActive: true },
      groupEnrollments: [
        {
          groupId: 'group-1',
          status: 'ACTIVE',
          group: { id: 'group-1', name: 'مجموعة الصف الأول الثانوي (أ)', academicYear: '2026-2027', academicTerm: 'FIRST_TERM' },
        },
      ],
    };

    // Inject remote student during downstream merge
    await offlineDb.putStudent(remoteStudent43);

    students = await offlineDb.getStudentsOffline({
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
    });
    expect(students.length).toBe(43);
    expect(students.find((s) => s.id === 'srv-stu-43')?.fullName).toBe('خالد وليد النمر');
  });
});
