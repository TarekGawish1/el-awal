import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FinanceDashboard } from '../components/FinanceDashboard';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { usePayments, useGroupDefaulters, useScanPaymentQr } from '../hooks/useFinance';

// Mock dependencies
vi.mock('@/features/groups/hooks/useGroups', () => ({
  useGroups: vi.fn(),
}));

vi.mock('@yudiel/react-qr-scanner', () => ({
  Scanner: vi.fn(() => <div data-testid="mock-qr-scanner">Scanner Mock</div>),
}));

vi.mock('../hooks/useFinance', () => ({
  usePayments: vi.fn(),
  useGroupDefaulters: vi.fn(),
  useDeletePayment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useRecordPayment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useScanPaymentQr: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

describe('FinanceDashboard', () => {
  beforeEach(() => {
    vi.mocked(useGroups).mockReturnValue({
      data: [{ id: 'group-1', name: 'مجموعة الأوائل', gradeLevel: 'G1', monthlyFee: 300 }],
      isLoading: false,
    } as any);

    vi.mocked(usePayments).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);

    vi.mocked(useGroupDefaulters).mockReturnValue({
      data: {
        groupId: 'group-1',
        groupName: 'مجموعة الأوائل',
        periodYear: 2026,
        periodMonth: 8,
        totalEnrolled: 1,
        totalDefaulters: 1,
        defaulters: [
          {
            studentId: 's-1',
            studentCode: 'STU-01',
            fullName: 'طالب متأخر',
            phone: '010',
            gradeLevel: 'G1',
            monthlyFeeExpected: 300,
            parentName: null,
            parentPhone: null,
          },
        ],
      },
      isLoading: false,
    } as any);
  });

  it('renders the QR scanner directly on initial load without requiring group selection', () => {
    render(<FinanceDashboard />);
    
    // Group select label should be there
    expect(screen.getByText(/المجموعة الدراسية/i)).toBeInTheDocument();
    
    // Tabs should be visible directly
    expect(screen.getByRole('button', { name: /مسح QR/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /رصد يدوي/i })).toBeInTheDocument();

    // QR scanner is ready immediately
    expect(screen.getByTestId('mock-qr-scanner')).toBeInTheDocument();
  });

  it('allows selecting a group and switching between tabs', () => {
    render(<FinanceDashboard />);

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'group-1' } });

    // Switch to manual tab
    fireEvent.click(screen.getByRole('button', { name: /رصد يدوي/i }));
    expect(screen.getByText(/الطلاب المتأخرين - مجموعة الأوائل/i)).toBeInTheDocument();
    expect(screen.getAllByText('طالب متأخر').length).toBeGreaterThan(0);
  });
});
