import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FinanceDashboard } from '../components/FinanceDashboard';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useGroupDefaulters } from '../hooks/useFinance';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/teacher/finance',
}));

vi.mock('@/core/hooks/usePermissions', () => ({
  usePermissions: () => ({
    can: () => true,
    role: 'TEACHER',
  }),
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
  useGroupDefaulters: vi.fn(),
  useMatrixLedger: vi.fn(() => ({ data: null, isLoading: false })),
  useStudentPaymentHistory: vi.fn(() => ({ data: [], isLoading: false })),
  usePayments: vi.fn(() => ({ data: undefined, isLoading: false })),
  useRecordPayment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useScanPaymentQr: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useFinanceDashboardAnalytics: vi.fn(() => ({
    data: {
      overview: {
        subscriptions: { expected: 1000, collected: 600, remaining: 400, rate: 60 },
        booklets: { expected: 500, collected: 300, remaining: 200, rate: 60 },
        onlineCourses: { expected: 2000, collected: 1500, remaining: 500, rate: 75 },
        grandTotal: { expected: 3500, collected: 2400, remaining: 1100, rate: 68.57 },
      },
      groups: [
        {
          id: 'group-1',
          name: 'مجموعة الأوائل',
          stage: 'SECONDARY',
          gradeLevel: 'الصف الأول الثانوي',
          studentCount: 20,
          subscription: { expected: 600, collected: 400, remaining: 200, rate: 66.67 },
          booklets: { expected: 200, collected: 100, remaining: 100, rate: 50 },
          total: { expected: 800, collected: 500, remaining: 300, rate: 62.5 },
        },
      ],
      onlineCourses: [],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
}));

describe('FinanceDashboard', () => {
  beforeEach(() => {
    vi.mocked(useGroups).mockReturnValue({
      data: [{ id: 'group-1', name: 'مجموعة الأوائل', gradeLevel: 'G1', monthlyFee: 300 }],
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

  it('allows opening manual payment recording modal', () => {
    render(<FinanceDashboard />);

    // Switch to manual recording
    fireEvent.click(screen.getByRole('button', { name: /\+ تسجيل مصروف/i }));

    // Modal should be opened
    expect(screen.getByText(/تسجيل مصروف \/ سداد/i)).toBeInTheDocument();
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
