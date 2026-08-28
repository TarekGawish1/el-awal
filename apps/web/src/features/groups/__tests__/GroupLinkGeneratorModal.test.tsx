import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GroupLinkGeneratorModal } from '../components/GroupLinkGeneratorModal';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/features/auth/store/auth.store', () => ({
  useAuthStore: (selector: (state: any) => any) =>
    selector({ user: { id: 'u1', fullName: 'الأستاذ أحمد', role: 'TEACHER' } }),
}));

const mutateMock = vi.fn();
const resetMock = vi.fn();
let mockLinkData: any = null;

vi.mock('../hooks/useGroups', () => ({
  useGroups: vi.fn(() => ({
    data: [
      {
        id: 'group-1',
        name: 'مجموعة الثانوية أ',
        gradeLevel: 'الصف الثالث الثانوي',
        _count: { enrollments: 10, schedules: 2 },
      },
      {
        id: 'group-2',
        name: 'مجموعة الثانوية ب',
        gradeLevel: 'الصف الثالث الثانوي',
        _count: { enrollments: 5, schedules: 1 },
      },
      {
        id: 'group-3',
        name: 'مجموعة الإعدادية',
        gradeLevel: 'الصف الثاني الإعدادي',
        _count: { enrollments: 8, schedules: 1 },
      },
    ],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })),
  useGenerateRegistrationLink: vi.fn(() => ({
    mutate: mutateMock,
    data: mockLinkData,
    isPending: false,
    reset: resetMock,
  })),
}));

const mockLink = {
  groupId: 'group-1',
  groupName: 'مجموعة الثانوية أ',
  token: 'test-token-123',
  registrationUrl: 'https://al-awal.online/register/group?token=test-token-123',
};

/**
 * The ui Select component mirrors its state into an sr-only native <select>
 * (order: stage, grade, group). Changing it drives the same onChange handlers
 * as the interactive dropdown, letting us exercise the cascading filter logic.
 */
const getNativeSelects = (): HTMLSelectElement[] =>
  Array.from(document.querySelectorAll('select.sr-only')) as HTMLSelectElement[];

const getSelectOptions = (index: number): string[] =>
  Array.from(getNativeSelects()[index].querySelectorAll('option')).map((o) => o.value);

const selectStage = (stage: string) => {
  fireEvent.change(getNativeSelects()[0], { target: { value: stage } });
};

const selectGrade = (grade: string) => {
  fireEvent.change(getNativeSelects()[1], { target: { value: grade } });
};

const selectGroup = (groupId: string) => {
  fireEvent.change(getNativeSelects()[2], { target: { value: groupId } });
};

describe('GroupLinkGeneratorModal', () => {
  const writeTextMock = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    mockLinkData = null;
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });
  });

  const openModal = () => render(<GroupLinkGeneratorModal isOpen onClose={() => {}} />);

  it('cascades the filters: stage limits grades, grade limits groups', () => {
    openModal();

    // Initially the grade select has no grade options
    expect(getSelectOptions(1)).toEqual(['']);

    selectStage('المرحلة الثانوية');

    // Grades are limited to the secondary stage
    const gradeOptions = getSelectOptions(1);
    expect(gradeOptions).toContain('الصف الثالث الثانوي');
    expect(gradeOptions).not.toContain('الصف الثاني الإعدادي');

    // Group select is still empty before a grade is chosen
    expect(getSelectOptions(2)).toEqual(['']);

    selectGrade('الصف الثالث الثانوي');

    // Groups are limited to the selected grade
    const groupOptions = getSelectOptions(2);
    expect(groupOptions).toContain('group-1');
    expect(groupOptions).toContain('group-2');
    expect(groupOptions).not.toContain('group-3');
  });

  it('resets downstream selections when the stage changes', () => {
    openModal();

    selectStage('المرحلة الثانوية');
    selectGrade('الصف الثالث الثانوي');

    selectStage('المرحلة الإعدادية');
    expect(getSelectOptions(2)).toEqual(['']);
    expect(getSelectOptions(1)).toContain('الصف الثاني الإعدادي');
    expect(getSelectOptions(1)).not.toContain('الصف الثالث الثانوي');
  });

  it('filters the group options with the search input', () => {
    openModal();

    selectStage('المرحلة الثانوية');
    selectGrade('الصف الثالث الثانوي');

    fireEvent.change(screen.getByPlaceholderText('ابحث عن المجموعة بالاسم...'), {
      target: { value: 'الثانوية ب' },
    });

    const groupOptions = getSelectOptions(2);
    expect(groupOptions).toContain('group-2');
    expect(groupOptions).not.toContain('group-1');
  });

  it('generates the registration link when a group is selected', () => {
    openModal();

    selectStage('المرحلة الثانوية');
    selectGrade('الصف الثالث الثانوي');
    selectGroup('group-1');

    expect(mutateMock).toHaveBeenCalledWith('group-1');
  });

  it('shows the generated link card and copies the link to clipboard with a toast', async () => {
    mockLinkData = mockLink;
    openModal();

    selectStage('المرحلة الثانوية');
    selectGrade('الصف الثالث الثانوي');
    selectGroup('group-1');

    const url = await screen.findByTestId('generated-link-url');
    expect(url).toHaveTextContent('https://al-awal.online/register/group?token=test-token-123');

    fireEvent.click(screen.getByRole('button', { name: 'نسخ الرابط' }));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(mockLink.registrationUrl);
      expect(toast.success).toHaveBeenCalledWith('تم نسخ الرابط بنجاح ✅');
    });
  });

  it('shares the link via WhatsApp with a pre-formatted Arabic message', async () => {
    mockLinkData = mockLink;
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    openModal();

    selectStage('المرحلة الثانوية');
    selectGrade('الصف الثالث الثانوي');
    selectGroup('group-1');

    fireEvent.click(screen.getByRole('button', { name: 'مشاركة عبر واتساب' }));

    expect(openSpy).toHaveBeenCalledTimes(1);
    const waUrl = openSpy.mock.calls[0][0] as string;
    expect(waUrl).toContain('https://wa.me/?text=');
    const message = decodeURIComponent(waUrl.replace('https://wa.me/?text=', ''));
    expect(message).toContain('ده رابط التسجيل المباشر لمجموعة مجموعة الثانوية أ');
    expect(message).toContain('مع الأستاذ أحمد على منصة الأول');
    expect(message).toContain(mockLink.registrationUrl);
    expect(message).toContain('يرجى الدخول وتسجيل بياناتك للانضمام فوراً');

    openSpy.mockRestore();
  });

  it('renders without the generated card when no link exists', () => {
    openModal();
    expect(screen.queryByTestId('generated-link-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('generated-link-url')).not.toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<GroupLinkGeneratorModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByTestId('link-generator-filters')).not.toBeInTheDocument();
  });
});
