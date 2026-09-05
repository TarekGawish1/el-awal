import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FinanceOverviewTab } from '../components/FinanceOverviewTab';
import { useFinanceDashboardAnalytics } from '../hooks/useFinance';

vi.mock('../hooks/useFinance', () => ({
  useFinanceDashboardAnalytics: vi.fn(),
}));

const mockAnalyticsData = {
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
    {
      id: 'group-2',
      name: 'مجموعة النخبة',
      stage: 'PREPARATORY',
      gradeLevel: 'الصف الثالث الإعدادي',
      studentCount: 15,
      subscription: { expected: 400, collected: 200, remaining: 200, rate: 50 },
      booklets: { expected: 300, collected: 200, remaining: 100, rate: 66.67 },
      total: { expected: 700, collected: 400, remaining: 300, rate: 57.14 },
    },
  ],
  onlineCourses: [
    {
      id: 'course-1',
      title: 'كورس الكيمياء المكثف',
      price: 250,
      enrolledStudents: 30,
      totalCollected: 7500,
      gradeLevel: 'الصف الأول الثانوي',
    },
    {
      id: 'course-2',
      title: 'مراجعة الفيزياء الشاملة',
      price: 200,
      enrolledStudents: 25,
      totalCollected: 5000,
      gradeLevel: 'الصف الثالث الثانوي',
    },
  ],
};

describe('FinanceOverviewTab', () => {
  const onTermChangeMock = vi.fn();
  const onMonthChangeMock = vi.fn();
  const onOpenGroupMatrixMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFinanceDashboardAnalytics).mockReturnValue({
      data: mockAnalyticsData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);
  });

  it('renders the 4 macro KPI cards verifying expected, collected, and percentage calculations', () => {
    render(
      <FinanceOverviewTab
        academicYear="2026-2027"
        academicTerm="FIRST_TERM"
        periodMonth={8}
        onTermChange={onTermChangeMock}
        onMonthChange={onMonthChangeMock}
        onOpenGroupMatrix={onOpenGroupMatrixMock}
      />
    );

    // 1. Subscriptions card
    expect(screen.getByText('الاشتراكات الشهرية')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.getAllByText('600').length).toBeGreaterThan(0);
    expect(screen.getAllByText('400').length).toBeGreaterThan(0);

    // 2. Booklets card
    expect(screen.getAllByText('المذكرات والملازم').length).toBeGreaterThan(0);
    expect(screen.getAllByText('500').length).toBeGreaterThan(0);
    expect(screen.getAllByText('300').length).toBeGreaterThan(0);

    // 3. Online Courses card
    expect(screen.getByText('الكورسات والدورات')).toBeInTheDocument();
    expect(screen.getByText('2,000')).toBeInTheDocument();
    expect(screen.getByText('1,500')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();

    // 4. Grand Total card
    expect(screen.getByText('المؤشر المالي العام')).toBeInTheDocument();
    expect(screen.getByText('3,500')).toBeInTheDocument();
    expect(screen.getByText('2,400')).toBeInTheDocument();
    expect(screen.getByText('1,100')).toBeInTheDocument();
    expect(screen.getByText('68.57%')).toBeInTheDocument();
  });

  it('filters group cards by search input and stage selection, and invokes onOpenGroupMatrix', () => {
    render(
      <FinanceOverviewTab
        academicYear="2026-2027"
        academicTerm="FIRST_TERM"
        onTermChange={onTermChangeMock}
        onMonthChange={onMonthChangeMock}
        onOpenGroupMatrix={onOpenGroupMatrixMock}
      />
    );

    // Initially both groups are displayed
    expect(screen.getByText('مجموعة الأوائل')).toBeInTheDocument();
    expect(screen.getByText('مجموعة النخبة')).toBeInTheDocument();

    // Search by group name
    const searchInput = screen.getByPlaceholderText('بحث باسم المجموعة أو الصف...');
    fireEvent.change(searchInput, { target: { value: 'الأوائل' } });

    expect(screen.getByText('مجموعة الأوائل')).toBeInTheDocument();
    expect(screen.queryByText('مجموعة النخبة')).not.toBeInTheDocument();

    // Reset search
    fireEvent.change(searchInput, { target: { value: '' } });

    // Filter by stage: PREPARATORY
    const stageSelect = screen.getByLabelText('المرحلة الدراسية');
    fireEvent.change(stageSelect, { target: { value: 'PREPARATORY' } });

    expect(screen.queryByText('مجموعة الأوائل')).not.toBeInTheDocument();
    expect(screen.getByText('مجموعة النخبة')).toBeInTheDocument();

    // Click "كشف حساب المجموعة" button on the card
    const matrixBtn = screen.getByRole('button', { name: /كشف حساب المجموعة/i });
    fireEvent.click(matrixBtn);

    expect(onOpenGroupMatrixMock).toHaveBeenCalledWith('group-2');
  });

  it('filters online courses correctly by course search input', () => {
    render(
      <FinanceOverviewTab
        academicYear="2026-2027"
        academicTerm="FIRST_TERM"
        onTermChange={onTermChangeMock}
        onMonthChange={onMonthChangeMock}
        onOpenGroupMatrix={onOpenGroupMatrixMock}
      />
    );

    // Both courses are rendered initially
    expect(screen.getByText('كورس الكيمياء المكثف')).toBeInTheDocument();
    expect(screen.getByText('مراجعة الفيزياء الشاملة')).toBeInTheDocument();

    // Search for chemistry course
    const courseSearchInput = screen.getByPlaceholderText('بحث باسم الكورس أو المرحلة...');
    fireEvent.change(courseSearchInput, { target: { value: 'الكيمياء' } });

    expect(screen.getByText('كورس الكيمياء المكثف')).toBeInTheDocument();
    expect(screen.queryByText('مراجعة الفيزياء الشاملة')).not.toBeInTheDocument();
  });
});
