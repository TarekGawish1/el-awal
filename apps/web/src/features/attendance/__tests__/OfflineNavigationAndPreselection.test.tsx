import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GroupDetails } from '@/features/groups/components/GroupDetails';
import StudentDetailPage from '@/app/(dashboard)/teacher/students/[id]/page';
import TeacherAttendancePage from '@/app/(dashboard)/teacher/attendance/page';
import { offlineDb } from '@/lib/offline/db';

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: vi.fn() }),
  useParams: () => ({ id: 'student-offline-999' }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/teacher/attendance',
}));

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

vi.mock('@/features/students/components/StudentQrBadge', () => ({
  StudentQrBadge: ({ studentId }: any) => <div data-testid="qr-badge">QR Badge: {studentId}</div>,
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

describe('Offline Navigation & Pre-Selection Resilience', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();

    // Set offline mode
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });

    // Seed offline database
    await offlineDb.bulkPutGroups([
      {
        id: 'group-offline-123',
        name: 'مجموعة الفيزياء للثانوية',
        gradeLevel: 'الصف الثالث الثانوي',
        academicYear: '2026-2027',
        academicTerm: 'FIRST_TERM',
        status: 'ACTIVE',
        schedules: [{ dayOfWeek: 2, startTime: '16:00', endTime: '18:00', location: 'سنتر الأوائل' }],
        _count: { enrollments: 12, schedules: 1 },
      },
    ]);

    await offlineDb.bulkPutStudents([
      {
        id: 'student-offline-999',
        fullName: 'عمر خالد أحمد',
        studentCode: 'STU-999',
        qrCodeToken: 'STU-999-TOKEN',
        gradeLevel: 'الصف الثالث الثانوي',
        groupId: 'group-offline-123',
        phone: '01012345678',
        emergencyPhone: '01087654321',
        academicStatus: 'ACTIVE',
        user: {
          id: 'u-999',
          fullName: 'عمر خالد أحمد',
          phone: '01012345678',
          isActive: true,
        },
      },
    ]);

    await offlineDb.bulkPutSessions([
      {
        id: 'session-target-777',
        groupId: 'group-offline-123',
        topic: 'مراجعة الميكانيكا',
        sessionDate: new Date().toISOString(),
        startTime: '16:00',
        endTime: '18:00',
      },
    ]);
  });

  it('renders group detail subpage from IndexedDB offline without redirecting to /', async () => {
    renderWithQuery(<GroupDetails id="group-offline-123" />);

    await waitFor(() => {
      expect(screen.getByText('مجموعة الفيزياء للثانوية')).toBeInTheDocument();
    });

    expect(screen.getByText('الصف الثالث الثانوي')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders student detail subpage from IndexedDB offline without redirecting to /', async () => {
    renderWithQuery(<StudentDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('عمر خالد أحمد')).toBeInTheDocument();
    });

    expect(screen.getByText('STU-999')).toBeInTheDocument();
    expect(screen.getByTestId('qr-badge')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('pre-selects sessionId directly on Attendance page when opened offline with searchParams', async () => {
    mockSearchParams = new URLSearchParams('sessionId=session-target-777');

    renderWithQuery(<TeacherAttendancePage />);

    await waitFor(() => {
      expect(screen.getByText('حصة محددة من جدول الحصص')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('report-card')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('auto-selects today group session when opened with groupId param offline', async () => {
    mockSearchParams = new URLSearchParams('groupId=group-offline-123');

    renderWithQuery(<TeacherAttendancePage />);

    await waitFor(() => {
      expect(screen.getByTestId('report-card')).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
