import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { FinanceAnalyticsTab } from '../components/FinanceAnalyticsTab';
import { useFinanceAnalytics } from '../hooks/useFinance';

const routerPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/teacher/finance',
}));

vi.mock('../hooks/useFinance', () => ({
  useFinanceAnalytics: vi.fn(),
}));

const analyticsPayload = {
  academicYear: '2026-2027',
  academicTerm: 'FIRST_TERM',
  months: [8, 9, 10, 11, 12, 1],
  overview: {
    totalExpected: 4940,
    totalCollected: 450,
    totalRemaining: 4490,
    collectionRate: 9.11,
    totalStudents: 3,
    tuition: { expected: 4800, collected: 400, remaining: 4400, collectionRate: 8.33 },
    booklets: { expected: 140, collected: 50, remaining: 90, collectionRate: 35.71 },
  },
  groups: [
    {
      id: 'group-1',
      name: 'مجموعة الأوائل',
      gradeLevel: 'الصف الأول الثانوي',
      stage: 'SECONDARY',
      studentCount: 2,
      tuition: { expected: 3600, collected: 300, remaining: 3300, rate: 8.33 },
      booklets: { expected: 100, collected: 50, remaining: 50, rate: 50 },
      total: { expected: 3700, collected: 350, remaining: 3350, rate: 9.46 },
    },
    {
      id: 'group-2',
      name: 'مجموعة التفوق',
      gradeLevel: 'الصف الأول الإعدادي',
      stage: 'PREPARATORY',
      studentCount: 1,
      tuition: { expected: 1200, collected: 100, remaining: 1100, rate: 8.33 },
      booklets: { expected: 40, collected: 0, remaining: 40, rate: 0 },
      total: { expected: 1240, collected: 100, remaining: 1140, rate: 8.06 },
    },
  ],
};

const groups = [
  { id: 'group-1', name: 'مجموعة الأوائل', gradeLevel: 'الصف الأول الثانوي' },
  { id: 'group-2', name: 'مجموعة التفوق', gradeLevel: 'الصف الأول الإعدادي' },
];

describe('FinanceAnalyticsTab', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(useFinanceAnalytics).mockReturnValue({ data: analyticsPayload, isLoading: false, isError: false } as any);
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders macro KPI cards including booklet expected, collected, and collection percentage', () => {
    render(<FinanceAnalyticsTab groups={groups} />);

    expect(screen.getByText('لوحة الإحصائيات والتقارير المالية')).toBeInTheDocument();
    expect(screen.getByText('4,940 ج.م')).toBeInTheDocument();
    expect(screen.getByText('450 ج.م')).toBeInTheDocument();
    expect(screen.getByText('4,490 ج.م')).toBeInTheDocument();
    expect(screen.getByText('9.11%')).toBeInTheDocument();

    const bookletsCard = screen.getByText('بطاقة المذكرات والملازم').closest('div.bg-white') as HTMLElement;
    expect(bookletsCard).toHaveTextContent('140 ج.م');
    expect(bookletsCard).toHaveTextContent('50 ج.م');
    expect(bookletsCard).toHaveTextContent('35.71%');
  });

  it('renders group analytics cards with tuition and booklet collection rates', () => {
    render(<FinanceAnalyticsTab groups={groups} />);

    const groupsSection = screen.getByLabelText('إحصائيات المجموعات الدراسية');
    expect(within(groupsSection).getByText('مجموعة الأوائل')).toBeInTheDocument();
    expect(within(groupsSection).getByText('2 طالب')).toBeInTheDocument();
    expect(within(groupsSection).getAllByText(/8\.33%/).length).toBeGreaterThan(0);
    expect(within(groupsSection).getAllByText(/50%/).length).toBeGreaterThan(0);
    expect(within(groupsSection).getByText('9.46%')).toBeInTheDocument();
    expect(within(groupsSection).getAllByText('اشتراكات الحصص').length).toBe(2);
    expect(within(groupsSection).getAllByText('مذكرات المجموعة/الصف').length).toBe(2);
  });

  it('narrows group cards by the quick search box', () => {
    render(<FinanceAnalyticsTab groups={groups} />);

    fireEvent.change(screen.getByLabelText('بحث سريع'), { target: { value: 'التفوق' } });

    const groupsSection = screen.getByLabelText('إحصائيات المجموعات الدراسية');
    expect(within(groupsSection).getByText('مجموعة التفوق')).toBeInTheDocument();
    expect(within(groupsSection).queryByText('مجموعة الأوائل')).not.toBeInTheDocument();
  });

  it('cascades stage and grade filters and forwards them to the analytics query', () => {
    render(<FinanceAnalyticsTab groups={groups} />);

    fireEvent.change(screen.getByLabelText('المرحلة الدراسية'), { target: { value: 'SECONDARY' } });
    fireEvent.change(screen.getByLabelText('الصف الدراسي'), { target: { value: 'الصف الأول الثانوي' } });

    expect(useFinanceAnalytics).toHaveBeenLastCalledWith(
      expect.objectContaining({ stage: 'SECONDARY', gradeLevel: 'الصف الأول الثانوي' }),
    );
    const gradeSelect = screen.getByLabelText('الصف الدراسي') as HTMLSelectElement;
    expect(Array.from(gradeSelect.options).map((option) => option.textContent)).toContain('الصف الأول الثانوي');
    expect(Array.from(gradeSelect.options).map((option) => option.textContent)).not.toContain('الصف الأول الإعدادي');
  });

  it('navigates to the matrix ledger scoped to the group', () => {
    render(<FinanceAnalyticsTab groups={groups} />);

    fireEvent.click(screen.getAllByRole('button', { name: /فتح في سجل المدفوعات الشامل/ })[0]);

    expect(routerPush).toHaveBeenCalledWith(
      expect.stringContaining('/teacher/finance?tab=matrix&groupId=group-1'),
    );
    expect(routerPush).toHaveBeenCalledWith(expect.stringContaining('gradeLevel='));
  });
});
