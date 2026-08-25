import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { FinancialMatrixLedger } from '../components/FinancialMatrixLedger';
import { useMatrixLedger, useRecordPayment } from '../hooks/useFinance';

vi.mock('../hooks/useFinance', () => ({
  useMatrixLedger: vi.fn(),
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
      monthlyPayments: { 8: { isPaid: false, amountPaid: 0 }, 9: { isPaid: true, amountPaid: 300 } },
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
    vi.mocked(useMatrixLedger).mockReturnValue({ data: ledger, isLoading: false, isError: false } as any);
    vi.mocked(useRecordPayment).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
  });

  it('renders only booklets for the selected grade', () => {
    render(<FinancialMatrixLedger groups={[]} />);
    fireEvent.change(screen.getByLabelText('الصف الدراسي'), { target: { value: 'الصف الأول الثانوي' } });

    expect(screen.getByText('مذكرة الصف الأول')).toBeInTheDocument();
    expect(screen.queryByText('مذكرة الصف الثاني')).not.toBeInTheDocument();
  });

  it('opens a pre-filled payment modal from an unpaid month cell', () => {
    render(<FinancialMatrixLedger groups={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'سداد اشتراك شهر 8 للطالب أحمد علي' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('أحمد علي')).toBeInTheDocument();
    expect(dialog.getByText('STU-2026-0001')).toBeInTheDocument();
    expect(dialog.getByText('اشتراك شهر 8')).toBeInTheDocument();
  });

  it('filters the matrix by student name or code', () => {
    render(<FinancialMatrixLedger groups={[]} />);
    fireEvent.change(screen.getByPlaceholderText('اسم الطالب أو STU-...'), { target: { value: 'سارة' } });

    expect(screen.getByText('سارة محمد')).toBeInTheDocument();
    expect(screen.queryByText('أحمد علي')).not.toBeInTheDocument();
  });
});
