import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { offlineDb } from '@/lib/offline/db';

describe('Onsite Homework Delivery Tracking & Automated Offline Attendance Roll-Call', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Clear mutations outbox
    const pending = await offlineDb.getPendingMutations();
    for (const p of pending) {
      await offlineDb.removeMutation(p.id);
    }

    // Seed mock session report
    await offlineDb.cacheSessionReport('session-test-101', {
      sessionId: 'session-test-101',
      sessionDate: '2026-08-26T10:00:00Z',
      topic: 'الفيزياء الحديثة - الحصة الأولى',
      groupId: 'group-phys-101',
      groupName: 'مجموعة النخبة 1',
      metrics: {
        totalEnrolled: 2,
        presentCount: 0,
        absentCount: 2,
        excusedCount: 0,
        attendanceRatePercentage: 0,
      },
      records: [
        {
          id: 'rec-1',
          studentId: 'student-uuid-1',
          studentCode: 'STU-1001',
          fullName: 'زياد طارق',
          status: 'ABSENT',
          recordingMethod: null,
          recordedAt: null,
          notes: null,
        },
        {
          id: 'rec-2',
          studentId: 'student-uuid-2',
          studentCode: 'STU-1002',
          fullName: 'مريم أحمد',
          status: null,
          recordingMethod: null,
          recordedAt: null,
          notes: null,
        },
      ],
    });
  });

  it('records onsite homework delivery and automatically rolls call as PRESENT in local IndexedDB', async () => {
    // 1. Record homework onsite via offlineDb
    const result = await offlineDb.recordHomeworkOnsiteOffline({
      assessmentId: 'assessment-hw-1',
      studentId: 'student-uuid-1',
      sessionId: 'session-test-101',
      status: 'CHECKED_ONSITE',
      recordedMethod: 'QR_SCAN',
      score: 10,
      feedback: 'مكتمل وممتاز',
      studentName: 'زياد طارق',
      studentCode: 'STU-1001',
    });

    // 2. Verify homework record
    expect(result.homeworkRecord).toBeDefined();
    expect(result.homeworkRecord.status).toBe('CHECKED_ONSITE');
    expect(result.homeworkRecord.studentId).toBe('student-uuid-1');
    expect(result.homeworkRecord.assessmentId).toBe('assessment-hw-1');
    expect(result.homeworkRecord.score).toBe(10);

    // 3. Verify attendance record automated roll-call
    expect(result.attendanceRecord).toBeDefined();
    expect(result.attendanceRecord.status).toBe('PRESENT');

    // 4. Verify homework is saved in homework_records store
    const hwRecords = await offlineDb.getHomeworkRecordsForSession('session-test-101');
    expect(hwRecords.length).toBeGreaterThanOrEqual(1);
    const targetHw = hwRecords.find((h) => h.studentId === 'student-uuid-1');
    expect(targetHw).toBeDefined();
    expect(targetHw?.status).toBe('CHECKED_ONSITE');

    // 5. Verify session report attendance was upgraded to PRESENT
    const updatedReport = await offlineDb.getSessionReport('session-test-101');
    const targetAtt = updatedReport.records.find((r: any) => r.studentId === 'student-uuid-1');
    expect(targetAtt?.status).toBe('PRESENT');
    expect(updatedReport.metrics.presentCount).toBe(1);

    // 6. Verify outbox contains both mutations (RECORD_HOMEWORK_ONSITE and RECORD_ATTENDANCE)
    const outbox = await offlineDb.getPendingMutations();
    const hwMutation = outbox.find(
      (m: any) =>
        m.payload?.assessmentId === 'assessment-hw-1' ||
        m.type === 'RECORD_HOMEWORK_ONSITE' ||
        m.endpoint?.includes('/sync/homework'),
    );
    expect(hwMutation).toBeDefined();
    expect(hwMutation?.payload.status).toBe('CHECKED_ONSITE');

    const attMutation = outbox.find(
      (m: any) =>
        (m.payload?.studentId === 'student-uuid-1' && m.payload?.status === 'PRESENT') ||
        m.type === 'RECORD_ATTENDANCE' ||
        m.endpoint?.includes('scan-qr'),
    );
    expect(attMutation).toBeDefined();
  });

  it('supports direct store proxies: homework_records, sessions_attendance, and outbox_mutations', async () => {
    // 1. Direct homework_records store proxy put and get
    await offlineDb.homework_records.put({
      id: 'hw-manual-proxy-1',
      assessmentId: 'assessment-hw-2',
      studentId: 'student-uuid-2',
      sessionId: 'session-test-101',
      status: 'CHECKED_ONSITE',
      score: 9.5,
      clientTimestamp: Date.now(),
    });

    const hwFetched = await offlineDb.homework_records.get('hw-manual-proxy-1');
    expect(hwFetched).toBeDefined();
    expect(hwFetched?.score).toBe(9.5);
    expect(hwFetched?.status).toBe('CHECKED_ONSITE');

    // 2. Direct sessions_attendance store proxy put and get
    await offlineDb.sessions_attendance.put({
      sessionId: 'session-test-101',
      studentId: 'student-uuid-2',
      status: 'PRESENT',
      recordingMethod: 'MANUAL',
      studentName: 'مريم أحمد',
      studentCode: 'STU-1002',
    });

    const attFetched = await offlineDb.sessions_attendance.get(['session-test-101', 'student-uuid-2']);
    expect(attFetched).toBeDefined();
    expect(attFetched?.status).toBe('PRESENT');

    // 3. Direct outbox_mutations store proxy add and getAll
    const mutationId = await offlineDb.outbox_mutations.add({
      type: 'RECORD_HOMEWORK_ONSITE',
      payload: {
        assessmentId: 'assessment-hw-2',
        studentId: 'student-uuid-2',
        sessionId: 'session-test-101',
        status: 'CHECKED_ONSITE',
      },
    });

    expect(mutationId).toBeDefined();
    const allMutations = await offlineDb.outbox_mutations.getAll();
    expect(allMutations.some((m) => m.id === mutationId)).toBe(true);
  });
});
