import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FinancialMatrixLedger } from '../components/FinancialMatrixLedger';
import { useMatrixLedger, useRecordPayment } from '../hooks/useFinance';

vi.mock('../hooks/useFinance', () => ({
  useMatrixLedger: vi.fn(),
  useBillingConfiguration: vi.fn(() => ({ data: null })),
  useUpdateBillingConfiguration: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useRecordPayment: vi.fn(),
  useStudentPaymentHistory: vi.fn(() => ({ data: [], isLoading: false })),
  useDeletePayment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

const ledger = {
  academicYear: '2026-2027',
  academicTerm: 'FIRST_TERM',
  months: [8, 9],
  booklets: [
    { id: 'b1', title: 'مذكرة الصف الأول', price: 50, gradeLevel: 'الصف الأول الثانوي' },
    { id: 'b2', title: 'مذكرة الصف الثاني', price: 60, gradeLevel: 'الصف الثاني الثانوي' },
  ],
  students: [
    {
      id: 'student-1', studentCode: 'STU-2026-0001', fullName: 'أحمد علي', phone: '', gradeLevel: 'الصف الأول الثانوي', groupId: 'group-1', groupName: 'المجموعة أ', monthlyFee: 300,
      monthlyPayments: { 8: { isPaid: false, amountPaid: 0 }, 9: { isPaid: false, amountPaid: 0 } },
      bookletPayments: { b1: { isPaid: false, amountPaid: 0 } }, totalPaid: 300, totalDue: 350,
    },
    {
      id: 'student-2', studentCode: 'STU-2026-0002', fullName: 'سارة محمد', phone: '', gradeLevel: 'الصف الثاني الثانوي', groupId: 'group-1', groupName: 'المجموعة أ', monthlyFee: 300,
      monthlyPayments: { 8: { isPaid: true, amountPaid: 300 }, 9: { isPaid: true, amountPaid: 300 } },
      bookletPayments: { b2: { isPaid: true, amountPaid: 60 } }, totalPaid: 660, totalDue: 0,
    },
  ],
};

describe('FinancialMatrixLedger', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-15T12:00:00.000Z'));
    vi.mocked(useMatrixLedger).mockReturnValue({ data: ledger, isLoading: false, isError: false } as any);
    vi.mocked(useRecordPayment).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
  });

  afterEach(() => vi.useRealTimers());

  it('renders only booklets for the selected grade', () => {
    render(<FinancialMatrixLedger groups={[]} />);
    fireEvent.change(screen.getByLabelText('المرحلة الدراسية'), { target: { value: 'SECONDARY' } });
    fireEvent.change(screen.getByLabelText('الصف الدراسي'), { target: { value: 'الصف الأول الثانوي' } });

    expect(screen.getByText('مذكرة الصف الأول')).toBeInTheDocument();
    expect(screen.queryByText('مذكرة الصف الثاني')).not.toBeInTheDocument();
  });

  it('does not render the removed quick-payment action', () => {
    render(<FinancialMatrixLedger groups={[]} />);
    fireEvent.change(screen.getByLabelText('المرحلة الدراسية'), { target: { value: 'SECONDARY' } });
    fireEvent.change(screen.getByLabelText('الصف الدراسي'), { target: { value: 'الصف الأول الثانوي' } });
    expect(screen.queryByText('سداد سريع')).not.toBeInTheDocument();
    expect(screen.getAllByText('كشف حساب').length).toBeGreaterThan(0);
  });

  it('filters the matrix by student name or code', () => {
    render(<FinancialMatrixLedger groups={[]} />);
    fireEvent.change(screen.getByLabelText('المرحلة الدراسية'), { target: { value: 'SECONDARY' } });
    fireEvent.change(screen.getByLabelText('الصف الدراسي'), { target: { value: 'الصف الثاني الثانوي' } });
    fireEvent.change(screen.getByPlaceholderText('اسم الطالب أو STU-...'), { target: { value: 'سارة' } });

    expect(screen.getByText('سارة محمد')).toBeInTheDocument();
    expect(screen.queryByText('أحمد علي')).not.toBeInTheDocument();
  });

  it('restricts month columns to the selected term and blanks future months', () => {
    render(<FinancialMatrixLedger groups={[]} />);
    fireEvent.change(screen.getByLabelText('المرحلة الدراسية'), { target: { value: 'SECONDARY' } });
    fireEvent.change(screen.getByLabelText('الصف الدراسي'), { target: { value: 'الصف الأول الثانوي' } });
    expect(screen.getByText('اشتراك 8')).toBeInTheDocument();
    expect(screen.getByText('اشتراك 1')).toBeInTheDocument();
    expect(screen.queryByText('اشتراك 2')).not.toBeInTheDocument();
    expect(screen.getByLabelText('شهر 9 لم يبدأ بعد')).toBeInTheDocument();
    expect(screen.getByText(/متبقي ٣٥٠/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('الفترة الدراسية'), { target: { value: 'SECOND_TERM' } });
    expect(screen.getByText('اشتراك 2')).toBeInTheDocument();
    expect(screen.getByText('اشتراك 7')).toBeInTheDocument();
    expect(screen.queryByText('اشتراك 8')).not.toBeInTheDocument();
  });

  it('requires a stage and grade before showing students', () => {
    render(<FinancialMatrixLedger groups={[]} />);

    expect(screen.getByText('اختر المرحلة والصف لعرض سجل المدفوعات.')).toBeInTheDocument();
    expect(screen.queryByText('كل المراحل')).not.toBeInTheDocument();
    expect(screen.queryByText('كل الصفوف')).not.toBeInTheDocument();
    expect(screen.getByLabelText('الصف الدراسي')).toBeDisabled();
  });

  it('cascades stage, grade, and group filters', () => {
    const groups = [
      { id: 'group-1', name: 'المجموعة الأولى', gradeLevel: 'الصف الأول الثانوي' },
      { id: 'group-2', name: 'المجموعة الثانية', gradeLevel: 'الصف الثاني الثانوي' },
      { id: 'group-3', name: 'المجموعة الإعدادية', gradeLevel: 'الصف الأول الإعدادي' },
    ];
    render(<FinancialMatrixLedger groups={groups} />);

    fireEvent.change(screen.getByLabelText('المرحلة الدراسية'), { target: { value: 'SECONDARY' } });
    fireEvent.change(screen.getByLabelText('الصف الدراسي'), { target: { value: 'الصف الأول الثانوي' } });
    const groupSelect = screen.getByLabelText('المجموعة الدراسية') as HTMLSelectElement;
    expect(Array.from(groupSelect.options).map((option) => option.textContent)).toContain('المجموعة الأولى');
    expect(Array.from(groupSelect.options).map((option) => option.textContent)).not.toContain('المجموعة الثانية');

    fireEvent.change(groupSelect, { target: { value: 'group-1' } });
    fireEvent.change(screen.getByLabelText('المرحلة الدراسية'), { target: { value: 'PREPARATORY' } });
    expect(groupSelect.value).toBe('');
    expect((screen.getByLabelText('الصف الدراسي') as HTMLSelectElement).value).toBe('');
  });
});
