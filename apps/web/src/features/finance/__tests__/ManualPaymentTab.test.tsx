import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ManualPaymentTab } from '../components/ManualPaymentTab';
import { useGroupDefaulters, usePayments } from '../hooks/useFinance';

vi.mock('../hooks/useFinance', () => ({
  useGroupDefaulters: vi.fn(),
  usePayments: vi.fn(),
  useStudentPaymentHistory: vi.fn(() => ({ data: [], isLoading: false })),
  useDeletePayment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useRecordPayment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

const groups = [
  { id: 'secondary-1', name: 'مجموعة أولى ثانوي', gradeLevel: 'الصف الأول الثانوي' },
  { id: 'secondary-2', name: 'مجموعة ثانية ثانوي', gradeLevel: 'الصف الثاني الثانوي' },
  { id: 'preparatory-1', name: 'مجموعة أولى إعدادي', gradeLevel: 'الصف الأول الإعدادي' },
];

describe('ManualPaymentTab unified filters', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(useGroupDefaulters).mockReturnValue({ data: { defaulters: [], totalDefaulters: 0 }, isLoading: false, isError: false } as any);
    vi.mocked(usePayments).mockReturnValue({ data: { pages: [{ data: [] }] }, isLoading: false } as any);
  });

  afterEach(() => vi.restoreAllMocks());

  it('narrows grades to secondary grades when the secondary stage is selected', () => {
    render(<ManualPaymentTab groups={groups} initialPeriodYear={2026} initialPeriodMonth={8} />);
    fireEvent.change(screen.getByLabelText('المرحلة الدراسية'), { target: { value: 'SECONDARY' } });

    const gradeSelect = screen.getByLabelText('الصف الدراسي') as HTMLSelectElement;
    expect(Array.from(gradeSelect.options).map((option) => option.textContent)).toEqual(expect.arrayContaining(['الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي']));
    expect(Array.from(gradeSelect.options).map((option) => option.textContent)).not.toContain('الصف الأول الإعدادي');
  });

  it('updates group options after selecting a grade', () => {
    render(<ManualPaymentTab groups={groups} initialPeriodYear={2026} initialPeriodMonth={8} />);
    fireEvent.change(screen.getByLabelText('المرحلة الدراسية'), { target: { value: 'SECONDARY' } });
    fireEvent.change(screen.getByLabelText('الصف الدراسي'), { target: { value: 'الصف الأول الثانوي' } });

    const groupSelect = screen.getByLabelText('المجموعة الدراسية') as HTMLSelectElement;
    expect(Array.from(groupSelect.options).map((option) => option.textContent)).toContain('مجموعة أولى ثانوي');
    expect(Array.from(groupSelect.options).map((option) => option.textContent)).not.toContain('مجموعة ثانية ثانوي');
  });

  it('populates the month selector with the first-term months', () => {
    render(<ManualPaymentTab groups={groups} initialPeriodYear={2026} initialPeriodMonth={8} />);
    fireEvent.change(screen.getByLabelText('الفترة الدراسية'), { target: { value: 'FIRST_TERM' } });

    const monthSelect = screen.getByLabelText('الشهر') as HTMLSelectElement;
    expect(Array.from(monthSelect.options).map((option) => option.value)).toEqual(['8', '9', '10', '11', '12', '1']);
  });

  it('filters overdue students by name in real time', () => {
    vi.mocked(useGroupDefaulters).mockReturnValue({
      data: {
        defaulters: [
          { studentId: 'student-1', fullName: 'أحمد علي', studentCode: 'STU-1', monthlyFeeExpected: 300 },
          { studentId: 'student-2', fullName: 'سارة محمد', studentCode: 'STU-2', monthlyFeeExpected: 300 },
        ],
        totalDefaulters: 2,
      },
      isLoading: false,
      isError: false,
    } as any);
    render(<ManualPaymentTab groups={groups} initialPeriodYear={2026} initialPeriodMonth={8} initialGroupId="secondary-1" />);
    fireEvent.change(screen.getByLabelText('بحث سريع'), { target: { value: 'سارة' } });

    expect(screen.getByText('سارة محمد')).toBeInTheDocument();
    expect(screen.queryByText('أحمد علي')).not.toBeInTheDocument();
  });
});
