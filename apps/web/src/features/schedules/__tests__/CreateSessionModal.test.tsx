import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CreateSessionModal } from '../components/CreateSessionModal';

vi.mock('../hooks/useSchedules', () => ({
  useCreateSession: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useSessionTopics: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/features/groups/hooks/useGroups', () => ({
  useGroups: vi.fn(),
}));

vi.mock('@/features/groups/hooks/useAcademicPeriod', () => ({
  useStoredAcademicPeriod: vi.fn(() => ({ activeYear: '', activeTerm: '' })),
}));

import { useGroups } from '@/features/groups/hooks/useGroups';

const groups = [
  { id: 'g-1a', name: 'مجموعة أولى ثانوي (أ)', gradeLevel: 'الصف الأول الثانوي' },
  { id: 'g-1b', name: 'مجموعة أولى ثانوي (ب)', gradeLevel: 'الصف الأول الثانوي' },
  { id: 'g-3', name: 'مجموعة ثالثة ثانوي', gradeLevel: 'الصف الثالث الثانوي' },
  { id: 'g-prep', name: 'مجموعة أولى إعدادي', gradeLevel: 'الصف الأول الإعدادي' },
];

describe('CreateSessionModal group filters', () => {
  beforeEach(() => {
    vi.mocked(useGroups).mockReturnValue({ data: groups, isLoading: false } as any);
  });

  it('requires stage and grade before enabling the group select', () => {
    render(<CreateSessionModal isOpen onClose={() => {}} />);

    expect(screen.getByLabelText('المجموعة الدراسية')).toBeDisabled();
    expect(screen.getByLabelText('الصف الدراسي')).toBeDisabled();

    fireEvent.change(screen.getByLabelText('المرحلة الدراسية'), { target: { value: 'SECONDARY' } });
    expect(screen.getByLabelText('الصف الدراسي')).not.toBeDisabled();

    fireEvent.change(screen.getByLabelText('الصف الدراسي'), { target: { value: 'الصف الأول الثانوي' } });
    expect(screen.getByLabelText('المجموعة الدراسية')).not.toBeDisabled();
  });

  it('narrows grade and group options by the selected stage and grade', () => {
    render(<CreateSessionModal isOpen onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('المرحلة الدراسية'), { target: { value: 'SECONDARY' } });

    const gradeSelect = screen.getByLabelText('الصف الدراسي') as HTMLSelectElement;
    const gradeTexts = Array.from(gradeSelect.options).map((o) => o.textContent);
    expect(gradeTexts).toContain('الصف الأول الثانوي');
    expect(gradeTexts).not.toContain('الصف الأول الإعدادي');

    fireEvent.change(gradeSelect, { target: { value: 'الصف الأول الثانوي' } });

    const groupSelect = screen.getByLabelText('المجموعة الدراسية') as HTMLSelectElement;
    const groupTexts = Array.from(groupSelect.options).map((o) => o.textContent);
    expect(groupTexts).toContain('مجموعة أولى ثانوي (أ)');
    expect(groupTexts).not.toContain('مجموعة ثالثة ثانوي');
    expect(groupTexts).not.toContain('مجموعة أولى إعدادي');
  });

  it('prefills stage and grade when opened with an initial group', () => {
    render(<CreateSessionModal isOpen onClose={() => {}} initialGroupId="g-3" />);

    expect((screen.getByLabelText('المرحلة الدراسية') as HTMLSelectElement).value).toBe('SECONDARY');
    expect((screen.getByLabelText('الصف الدراسي') as HTMLSelectElement).value).toBe('الصف الثالث الثانوي');

    const groupSelect = screen.getByLabelText('المجموعة الدراسية') as HTMLSelectElement;
    expect(groupSelect).not.toBeDisabled();
    expect((groupSelect as HTMLSelectElement).value).toBe('g-3');
  });
});