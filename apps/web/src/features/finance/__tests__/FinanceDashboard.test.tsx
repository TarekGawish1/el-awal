import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FinanceDashboard } from '../components/FinanceDashboard';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { usePayments, useGroupDefaulters, useScanPaymentQr } from '../hooks/useFinance';
import { useBooklets } from '@/features/booklets/hooks/useBooklets';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/teacher/finance',
}));

// Mock dependencies
vi.mock('@/features/groups/hooks/useGroups', () => ({
  useGroups: vi.fn(),
  useGroupStudents: vi.fn(() => ({ groupEnrollments: [], isLoading: false })),
}));

vi.mock('@/features/booklets/hooks/useBooklets', () => ({
  useBooklets: vi.fn(() => ({
    booklets: [
      {
        id: 'b-1',
        title: 'مذكرة النحو والتدريبات',
        price: 75,
        gradeLevel: 'الصف الأول الثانوي',
        stockCount: 50,
        salesCount: 0,
        totalRevenue: 0,
        isActive: true,
      },
    ],
    isLoading: false,
    createBooklet: vi.fn(),
    isCreating: false,
    updateBooklet: vi.fn(),
    isUpdating: false,
    deleteBooklet: vi.fn(),
    isDeleting: false,
  })),
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
  useFinanceAnalytics: vi.fn(() => ({ data: { totalCollected: 1000, studentsPaid: 10, targetRevenue: 5000 }, isLoading: false })),
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
    
    // Header title and description
    expect(screen.getByText('الماليات والمصروفات')).toBeInTheDocument();
    
    // Tabs should be visible directly
    expect(screen.getByRole('button', { name: /الماسح السريع \(QR\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ تسجيل مصروف/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /المذكرات والملازم/i })).toBeInTheDocument();

    // Click QR button
    fireEvent.click(screen.getByRole('button', { name: /الماسح السريع \(QR\)/i }));

    // QR scanner is ready
    expect(screen.getByTestId('mock-qr-scanner')).toBeInTheDocument();
  });

  it('allows selecting a group and switching between tabs', () => {
    render(<FinanceDashboard />);

    // Switch to manual tab
    fireEvent.click(screen.getByRole('button', { name: /\+ تسجيل مصروف/i }));

    // Group select label should be visible in manual tab
    expect(screen.getByText(/المجموعة الدراسية/i)).toBeInTheDocument();

    // Select group
    fireEvent.change(screen.getByLabelText('المجموعة الدراسية'), { target: { value: 'group-1' } });

    expect(screen.getByText(/الطلاب المتأخرين عن السداد/i)).toBeInTheDocument();
    expect(screen.getAllByText('طالب متأخر').length).toBeGreaterThan(0);
  });

  it('renders the booklets management view when booklets tab is selected', () => {
    render(<FinanceDashboard />);

    // Click on Booklets tab
    fireEvent.click(screen.getByRole('button', { name: /المذكرات والملازم/i }));

    // Header and booklet card should be rendered
    expect(screen.getByText('إدارة المذكرات والملازم الدراسية')).toBeInTheDocument();
    expect(screen.getByText('مذكرة النحو والتدريبات')).toBeInTheDocument();
  });
});
