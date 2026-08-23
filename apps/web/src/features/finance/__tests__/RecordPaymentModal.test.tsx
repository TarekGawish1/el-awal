import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { useBooklets } from '@/features/booklets/hooks/useBooklets';
import { useGroupDefaulters, useRecordPayment } from '../hooks/useFinance';

vi.mock('@/features/booklets/hooks/useBooklets', () => ({
  useBooklets: vi.fn(),
}));

vi.mock('../hooks/useFinance', () => ({
  useGroupDefaulters: vi.fn(),
  useRecordPayment: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

describe('RecordPaymentModal booklet eligibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRecordPayment).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
    vi.mocked(useGroupDefaulters).mockReturnValue({
      data: {
        defaulters: [
          {
            studentId: 'student-1',
            fullName: 'أحمد',
            gradeLevel: 'G1',
            monthlyFeeExpected: 300,
          },
        ],
      },
      isLoading: false,
    } as any);
    vi.mocked(useBooklets).mockReturnValue({
      booklets: [
        { id: 'booklet-1', title: 'مذكرة عامة للصف الأول', price: 50, gradeLevel: 'G1' },
        { id: 'booklet-2', title: 'مذكرة مجموعة الطالب', price: 60, gradeLevel: 'G1', groupId: 'group-1' },
        { id: 'booklet-3', title: 'مذكرة مجموعة أخرى', price: 70, gradeLevel: 'G1', groupId: 'group-2' },
        { id: 'booklet-4', title: 'مذكرة صف آخر', price: 80, gradeLevel: 'G2' },
      ],
      isLoading: false,
    } as any);
  });

  it('shows only booklets with the selected student grade and group membership', () => {
    render(
      <RecordPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        groupId="group-1"
        periodYear={2026}
        periodMonth={8}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /سداد قيمة مذكرة/i }));
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'student-1' } });

    expect(screen.getByRole('option', { name: /مذكرة عامة للصف الأول/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /مذكرة مجموعة الطالب/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /مذكرة مجموعة أخرى/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /مذكرة صف آخر/i })).not.toBeInTheDocument();
  });
});
