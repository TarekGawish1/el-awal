import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TeacherAttendancePage from '@/app/(dashboard)/teacher/attendance/page';
import * as useGroupsModule from '@/features/groups/hooks/useGroups';
import * as useAttendanceModule from '@/features/attendance/hooks/use-attendance';

// Mock components
vi.mock('@/features/attendance/components/QrScanner', () => ({
  QrScanner: () => <div data-testid="qr-scanner">QR Scanner Mock</div>
}));
vi.mock('@/features/attendance/components/ManualAttendanceRoster', () => ({
  ManualAttendanceRoster: () => <div data-testid="manual-roster">Manual Roster Mock</div>
}));
vi.mock('@/features/attendance/components/AttendanceReportCard', () => ({
  AttendanceReportCard: ({ metrics }: any) => (
    <div data-testid="report-card">
      Report: {metrics.totalEnrolled} enrolled
    </div>
  )
}));

describe('TeacherAttendancePage', () => {
  const mockGroups = [
    { id: 'group-1', name: 'Group 1', gradeLevel: 'Grade 10' }
  ];

  const mockSessions = [
    { id: 'session-1', topic: 'Math Intro', sessionDate: '2026-08-17', _count: { attendanceRecords: 5 } }
  ];

  const mockReport = {
    sessionId: 'session-1',
    metrics: { totalEnrolled: 20, presentCount: 5, absentCount: 0, excusedCount: 0, attendanceRatePercentage: 25 },
    records: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    vi.spyOn(useGroupsModule, 'useGroups').mockReturnValue({
      data: mockGroups,
      isLoading: false,
      isError: false,
    } as any);

    vi.spyOn(useAttendanceModule, 'useGroupSessions').mockReturnValue({
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

  describe('Group Selection', () => {
    it('shows loading state for groups', () => {
      vi.spyOn(useGroupsModule, 'useGroups').mockReturnValue({ isLoading: true } as any);
      render(<TeacherAttendancePage />);
      expect(screen.getByText('Select Group')).toBeInTheDocument();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('renders empty state when no groups exist', () => {
      vi.spyOn(useGroupsModule, 'useGroups').mockReturnValue({ data: [] } as any);
      render(<TeacherAttendancePage />);
      expect(screen.getByText('You have no active groups.')).toBeInTheDocument();
    });

    it('renders error state for groups', () => {
      vi.spyOn(useGroupsModule, 'useGroups').mockReturnValue({ isError: true } as any);
      render(<TeacherAttendancePage />);
      expect(screen.getByText('Failed to load groups. Please try again.')).toBeInTheDocument();
    });

    it('renders group selector', () => {
      render(<TeacherAttendancePage />);
      const select = screen.getAllByRole('combobox')[0];
      expect(select).toBeInTheDocument();
      expect(screen.getByText('Group 1 (Grade 10)')).toBeInTheDocument();
    });
  });

  describe('Session Selection', () => {
    it('shows prompt to select group first', () => {
      render(<TeacherAttendancePage />);
      expect(screen.getByText('Please select a group first.')).toBeInTheDocument();
    });

    it('loads sessions when group is selected and uses correct groupId', async () => {
      const useGroupSessionsSpy = vi.spyOn(useAttendanceModule, 'useGroupSessions');
      render(<TeacherAttendancePage />);
      
      const groupSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(groupSelect, { target: { value: 'group-1' } });
      
      expect(useGroupSessionsSpy).toHaveBeenCalledWith('group-1');
      
      await waitFor(() => {
        expect(screen.getByText(/Math Intro/)).toBeInTheDocument();
      });
    });

    it('shows empty sessions state', async () => {
      vi.spyOn(useAttendanceModule, 'useGroupSessions').mockReturnValue({ data: [] } as any);
      render(<TeacherAttendancePage />);
      
      const groupSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(groupSelect, { target: { value: 'group-1' } });
      
      await waitFor(() => {
        expect(screen.getByText('No physical sessions generated for this group.')).toBeInTheDocument();
      });
    });
  });

  describe('Report rendering', () => {
    it('shows report and QR scanner when session is selected', async () => {
      const useSessionReportSpy = vi.spyOn(useAttendanceModule, 'useSessionReport');
      render(<TeacherAttendancePage />);
      
      const groupSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(groupSelect, { target: { value: 'group-1' } });
      
      const sessionSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(sessionSelect, { target: { value: 'session-1' } });
      
      expect(useSessionReportSpy).toHaveBeenCalledWith('session-1');
      
      await waitFor(() => {
        expect(screen.getByTestId('report-card')).toBeInTheDocument();
        expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
      });
    });

    it('switches to manual attendance roster', async () => {
      render(<TeacherAttendancePage />);
      
      const groupSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(groupSelect, { target: { value: 'group-1' } });
      
      const sessionSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(sessionSelect, { target: { value: 'session-1' } });
      
      const manualBtn = screen.getByText('Manual Entry');
      fireEvent.click(manualBtn);
      
      await waitFor(() => {
        expect(screen.getByTestId('manual-roster')).toBeInTheDocument();
        expect(screen.queryByTestId('qr-scanner')).not.toBeInTheDocument();
      });
    });
  });
});
