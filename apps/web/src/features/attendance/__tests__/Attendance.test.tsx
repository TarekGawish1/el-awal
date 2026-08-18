import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TeacherAttendancePage from '@/app/(dashboard)/teacher/attendance/page';
import * as useGroupsModule from '@/features/groups/hooks/useGroups';
import * as useAttendanceModule from '@/features/attendance/hooks/use-attendance';

// Mock child components
vi.mock('@/features/attendance/components/QrScanner', () => ({
  QrScanner: () => <div data-testid="qr-scanner">QR Scanner Mock</div>,
}));

vi.mock('@/features/attendance/components/ManualAttendanceRoster', () => ({
  ManualAttendanceRoster: () => <div data-testid="manual-roster">Manual Roster Mock</div>,
}));

vi.mock('@/features/attendance/components/AttendanceReportCard', () => ({
  AttendanceReportCard: ({ metrics }: any) => (
    <div data-testid="report-card">Report: {metrics?.totalEnrolled} enrolled</div>
  ),
}));

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ activeAcademicYear: '2025-2026', activeAcademicTerm: 'FIRST_TERM' }),
    put: vi.fn().mockResolvedValue({ activeAcademicYear: '2025-2026', activeAcademicTerm: 'FIRST_TERM' }),
  },
}));

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('TeacherAttendancePage', () => {
  const mockGroups = [
    {
      id: 'group-1',
      name: 'مجموعة النجوم',
      gradeLevel: 'الصف الأول الثانوي',
      academicYear: '2025-2026',
      academicTerm: 'FIRST_TERM',
      schedules: [{ dayOfWeek: 0, startTime: '15:00', location: 'سنتر الأوائل' }],
    },
  ];

  const mockSessions = [
    {
      id: 'session-1',
      groupId: 'group-1',
      topic: 'حصة الرياضيات',
      sessionDate: '2026-08-18',
      startTime: '15:00',
      group: mockGroups[0],
      _count: { attendanceRecords: 5 },
    },
  ];

  const mockReport = {
    sessionId: 'session-1',
    metrics: { totalEnrolled: 20, presentCount: 5, absentCount: 0, excusedCount: 0, attendanceRatePercentage: 25 },
    records: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(useGroupsModule, 'useGroups').mockReturnValue({
      data: mockGroups,
      isLoading: false,
      isError: false,
    } as any);

    vi.spyOn(useAttendanceModule, 'useTodaySessions').mockReturnValue({
      data: mockSessions,
      isLoading: false,
      isError: false,
    } as any);

    vi.spyOn(useAttendanceModule, 'useSessionReport').mockReturnValue({
      data: mockReport,
      isLoading: false,
      isError: false,
    } as any);
  });

  it('renders header, academic period badges, and filter toolbar', () => {
    renderWithQuery(<TeacherAttendancePage />);

    expect(screen.getByText('رصد الحضور والغياب')).toBeInTheDocument();
    expect(screen.getAllByText(/2025-2026/).length).toBeGreaterThan(0);
    expect(screen.getByText(/الفصل الدراسي الأول/)).toBeInTheDocument();
  });

  it('displays session and switches between QR scanner and manual entry tabs', async () => {
    renderWithQuery(<TeacherAttendancePage />);

    // Select session first
    const sessionSelect = screen.getByRole('combobox');
    fireEvent.change(sessionSelect, { target: { value: 'session-1' } });

    // Default QR tab should be open
    expect(screen.getByRole('button', { name: /مسح QR/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /رصد يدوي/i })).toBeInTheDocument();

    // Switch to manual entry tab
    fireEvent.click(screen.getByRole('button', { name: /رصد يدوي/i }));
    expect(screen.getByTestId('manual-roster')).toBeInTheDocument();
  });
});
