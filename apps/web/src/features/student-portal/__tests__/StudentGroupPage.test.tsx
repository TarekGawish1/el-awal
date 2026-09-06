import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import StudentGroupPage from '@/app/(dashboard)/student/group/page';
import { useStudentGroup, useStudentGroupSessions } from '../hooks/useStudentPortal';

vi.mock('../hooks/useStudentPortal', () => ({
  useStudentGroup: vi.fn(),
  useStudentGroupSessions: vi.fn(),
}));

describe('StudentGroupPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-10T09:00:00.000Z'));
    vi.mocked(useStudentGroup).mockReturnValue({
      data: {
        group: {
          id: 'group-1',
          name: 'مجموعة الصف الأول الثانوي (أ)',
          gradeLevel: 'الصف الأول الثانوي',
          academicYear: '2026-2027',
          academicTerm: 'FIRST_TERM',
          monthlyFee: 500,
          schedules: [{ id: 'schedule-1', dayOfWeek: 1, startTime: '10:00', endTime: '12:00', location: 'القاعة الرئيسية' }],
        },
        teacher: { id: 'teacher-1', fullName: 'أ. أحمد غريب' },
        subscription: { year: 2026, month: 8, amountExpected: 500, amountPaid: 500, paymentStatus: 'PAID', isPaid: true },
      },
      isLoading: false,
      isError: false,
    } as any);
    vi.mocked(useStudentGroupSessions).mockReturnValue({
      data: [{
        id: 'session-1',
        groupId: 'group-1',
        sessionDate: '2026-08-10T00:00:00.000Z',
        startTime: '10:00',
        endTime: '12:00',
        topic: 'الحصة 4: شرح قوانين نيوتن والجاذبية',
        isCancelled: false,
        location: 'القاعة الرئيسية',
        attendance: { status: 'PRESENT', recordingMethod: 'QR_SCAN', recordedAt: '2026-08-10T08:05:00.000Z' },
        assessment: null,
        educationalContents: [{ id: 'content-1', title: 'ملخص قوانين نيوتن', contentType: 'SUMMARY', fileUrl: '/uploads/summary.pdf', fileKey: 'summary.pdf', downloadUrl: '/uploads/summary.pdf', createdAt: '2026-08-10T12:00:00.000Z' }],
      }],
      isLoading: false,
      isError: false,
    } as any);
  });

  afterEach(() => vi.useRealTimers());

  it('opens session details with attendance and attachments', () => {
    render(<StudentGroupPage />);

    fireEvent.click(screen.getByRole('button', { name: /تفاصيل الحصة 4/ }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByText('حاضر').length).toBeGreaterThan(0);
    expect(screen.getByText(/تم تسجيل الحضور عبر مسح رمز الـ QR/)).toBeInTheDocument();
    expect(screen.getByText('ملخص قوانين نيوتن')).toBeInTheDocument();
  });
});
