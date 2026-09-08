import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ManualAttendanceRoster } from '../components/ManualAttendanceRoster';
import { offlineDb } from '@/lib/offline/db';

const mockMutate = vi.fn();

vi.mock('../hooks/use-attendance', () => ({
  useManualAttendance: () => ({
    mutate: mockMutate,
    isPending: false,
    error: null,
    isSuccess: false,
  }),
}));

vi.mock('@/lib/offline/db', () => ({
  offlineDb: {
    deleteHomeworkForSessionStudent: vi.fn().mockResolvedValue(undefined),
  },
}));

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('ManualAttendanceRoster - Unchecking and Homework Removal', () => {
  const sessionId = 'session-123';
  const mockRecords = [
    {
      id: 'rec-1',
      studentId: 'student-1',
      studentCode: 'STU001',
      fullName: 'أحمد محمود',
      status: 'PRESENT' as const,
      recordingMethod: 'MANUAL' as const,
      recordedAt: new Date().toISOString(),
      recordedBy: 'teacher-1',
    },
    {
      id: 'rec-2',
      studentId: 'student-2',
      studentCode: 'STU002',
      fullName: 'علي حسن',
      status: 'ABSENT' as const,
      recordingMethod: 'MANUAL' as const,
      recordedAt: new Date().toISOString(),
      recordedBy: 'teacher-1',
    },
    {
      id: 'rec-3',
      studentId: 'student-3',
      studentCode: 'STU003',
      fullName: 'سارة يوسف',
      status: 'EXCUSED' as const,
      recordingMethod: 'MANUAL' as const,
      recordedAt: new Date().toISOString(),
      recordedBy: 'teacher-1',
      notes: 'إذن سفر',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders students with their initial attendance statuses active', () => {
    renderWithQuery(<ManualAttendanceRoster sessionId={sessionId} records={mockRecords} />);

    expect(screen.getAllByText('أحمد محمود')[0]).toBeInTheDocument();
    expect(screen.getAllByText('علي حسن')[0]).toBeInTheDocument();
    expect(screen.getAllByText('سارة يوسف')[0]).toBeInTheDocument();

    // Student 1 has PRESENT active
    const presentButtons = screen.getAllByRole('button', { name: /^حاضر/ });
    expect(presentButtons[0]).toHaveClass('bg-emerald-100');

    // Student 2 has ABSENT active
    const absentButtons = screen.getAllByRole('button', { name: /^غائب/ });
    expect(absentButtons[1]).toHaveClass('bg-rose-100');

    // Student 3 has EXCUSED active
    const excusedButtons = screen.getAllByRole('button', { name: /^بعذر/ });
    expect(excusedButtons[2]).toHaveClass('bg-amber-100');
  });

  it('allows unchecking "حاضر" by clicking it again, deletes homework, and enables Save button', async () => {
    renderWithQuery(<ManualAttendanceRoster sessionId={sessionId} records={mockRecords} />);

    const presentButton = screen.getAllByRole('button', { name: /^حاضر/ })[0];
    expect(presentButton).toHaveClass('bg-emerald-100');

    // Click "حاضر" again to uncheck it
    fireEvent.click(presentButton);

    // Button should now be unchecked (bg-slate-100)
    expect(presentButton).toHaveClass('bg-slate-100');
    expect(presentButton).not.toHaveClass('bg-emerald-100');

    // Homework deletion should be called immediately for student-1
    expect(offlineDb.deleteHomeworkForSessionStudent).toHaveBeenCalledWith(sessionId, 'student-1');

    // Save button should now be enabled
    const saveButton = screen.getByRole('button', { name: /حفظ التعديلات/i });
    expect(saveButton).not.toBeDisabled();

    // Click Save and verify payload has student-1 in removedStudentIds
    fireEvent.click(saveButton);

    expect(mockMutate).toHaveBeenCalledWith(
      {
        sessionId,
        payload: expect.objectContaining({
          removedStudentIds: ['student-1'],
        }),
      },
      expect.any(Object),
    );
  });

  it('allows unchecking "غائب" by clicking it again', async () => {
    renderWithQuery(<ManualAttendanceRoster sessionId={sessionId} records={mockRecords} />);

    const absentButton = screen.getAllByRole('button', { name: /^غائب/ })[1];
    expect(absentButton).toHaveClass('bg-rose-100');

    // Click "غائب" again to uncheck it
    fireEvent.click(absentButton);

    // Button should now be unchecked
    expect(absentButton).toHaveClass('bg-slate-100');
    expect(absentButton).not.toHaveClass('bg-rose-100');
  });

  it('allows unchecking "بعذر" by clicking it again', async () => {
    renderWithQuery(<ManualAttendanceRoster sessionId={sessionId} records={mockRecords} />);

    const excusedButton = screen.getAllByRole('button', { name: /^بعذر/ })[2];
    expect(excusedButton).toHaveClass('bg-amber-100');

    // Click "بعذر" again to uncheck it
    fireEvent.click(excusedButton);

    // Button should now be unchecked
    expect(excusedButton).toHaveClass('bg-slate-100');
    expect(excusedButton).not.toHaveClass('bg-amber-100');
  });

  it('deletes homework when changing status to "ABSENT"', async () => {
    renderWithQuery(<ManualAttendanceRoster sessionId={sessionId} records={mockRecords} />);

    // Student 1 is currently PRESENT; change to ABSENT
    const absentButton = screen.getAllByRole('button', { name: /^غائب/ })[0];
    fireEvent.click(absentButton);

    expect(absentButton).toHaveClass('bg-rose-100');
    expect(offlineDb.deleteHomeworkForSessionStudent).toHaveBeenCalledWith(sessionId, 'student-1');
  });
});
