import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';
import { AcademicPeriodSwitcher } from '../components/AcademicPeriodSwitcher';
import { useGroups } from '../hooks/useGroups';
import { useStoredAcademicPeriod } from '../hooks/useAcademicPeriod';
import { useAuth } from '@/features/auth';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import toast from 'react-hot-toast';

vi.mock('../hooks/useGroups', () => ({
  useGroups: vi.fn(),
}));

vi.mock('../hooks/useAcademicPeriod', () => ({
  useStoredAcademicPeriod: vi.fn(),
}));

vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/offline/use-online-status', () => ({
  useOnlineStatus: vi.fn(() => true),
}));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

const switchPeriodMock = vi.fn();

function buildHookReturn(overrides: Record<string, unknown> = {}) {
  return {
    selectedYears: ['2026-2027'],
    setSelectedYears: vi.fn(),
    selectedTerms: ['FIRST_TERM'],
    setSelectedTerms: vi.fn(),
    activeYear: '2026-2027',
    activeTerm: 'FIRST_TERM',
    dbPeriod: { activeAcademicYear: '2026-2027', activeAcademicTerm: 'FIRST_TERM' },
    isLoading: false,
    isSyncingWithDb: false,
    switchPeriod: switchPeriodMock,
    isSwitching: false,
    ...overrides,
  };
}

describe('AcademicPeriodSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    switchPeriodMock.mockResolvedValue({
      activeAcademicYear: '2025-2026',
      activeAcademicTerm: 'FIRST_TERM',
    });
    vi.mocked(useGroups).mockReturnValue({ data: [] } as any);
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', role: 'TEACHER' } } as any);
    vi.mocked(useOnlineStatus).mockReturnValue(true);
    vi.mocked(useStoredAcademicPeriod).mockReturnValue(buildHookReturn() as any);
  });

  it('blocks opening the modal and shows the lock toast while offline', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false);

    render(<AcademicPeriodSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: /2026-2027/ }));

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('يتطلب اتصالاً نشطاً بالإنترنت'),
    );
    // Modal must not open
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens a centered responsive modal exposing all year and term options at 375px', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true, configurable: true });
    vi.mocked(useOnlineStatus).mockReturnValue(true);

    render(<AcademicPeriodSwitcher />);
    fireEvent.click(screen.getByRole('button', { name: /2026-2027/ }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Responsive centered-modal classes from the spec
    expect(dialog.className).toContain('max-w-lg');
    expect(dialog.className).toContain('max-h-[90vh]');
    expect(dialog.className).toContain('overflow-y-auto');

    const inDialog = within(dialog);
    // All year chips visible (no truncation/hidden options)
    expect(inDialog.getByText('2026-2027')).toBeInTheDocument();
    expect(inDialog.getByText('2025-2026')).toBeInTheDocument();
    // Both terms visible
    expect(inDialog.getByText('الفصل الأول')).toBeInTheDocument();
    expect(inDialog.getByText('الفصل الثاني')).toBeInTheDocument();
  });

  it('requires the account password before dispatching the switch', async () => {
    vi.mocked(useOnlineStatus).mockReturnValue(true);

    render(<AcademicPeriodSwitcher />);
    // Open (only the trigger button exists while closed)
    fireEvent.click(screen.getByRole('button', { name: /2026-2027/ }));

    const dialog = screen.getByRole('dialog');
    const inDialog = within(dialog);

    // Choose a different year to create a pending change
    fireEvent.click(inDialog.getByRole('button', { name: '2025-2026' }));

    // Confirm intent — this must NOT immediately dispatch the switch
    fireEvent.click(inDialog.getByRole('button', { name: 'تأكيد التغيير' }));

    expect(switchPeriodMock).not.toHaveBeenCalled();

    // Password challenge is now shown
    const passwordInput = screen.getByPlaceholderText('كلمة المرور الخاصة بك');
    expect(passwordInput).toBeInTheDocument();
    expect(screen.getByText('🔐 تأكيد تغيير الفصل الدراسي')).toBeInTheDocument();

    // Enter password + confirm → dispatch with the pending selection + password
    fireEvent.change(passwordInput, { target: { value: 'MyPass123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد وتفعيل' }));

    await waitFor(() => {
      expect(switchPeriodMock).toHaveBeenCalledWith({
        academicYear: '2025-2026',
        academicTerm: 'FIRST_TERM',
        password: 'MyPass123!',
      });
    });
  });
});
