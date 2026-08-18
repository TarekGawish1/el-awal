import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GroupList } from '../components/GroupList';
import * as useGroupsHooks from '../hooks/useGroups';
import { 
  STORAGE_YEAR_KEY, 
  STORAGE_TERM_KEY, 
  getDefaultAcademicYear, 
  getDefaultAcademicTerm 
} from '../hooks/useAcademicPeriod';

// Mock dependencies
vi.mock('../hooks/useGroups', () => ({
  useGroups: vi.fn(),
  useCreateGroup: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ activeAcademicYear: '2025-2026', activeAcademicTerm: 'FIRST_TERM' }),
    put: vi.fn().mockResolvedValue({ activeAcademicYear: '2025-2026', activeAcademicTerm: 'FIRST_TERM' }),
  },
}));

const currentYear = getDefaultAcademicYear();
const currentTerm = getDefaultAcademicTerm();

const mockGroups = [
  {
    id: 'group-1',
    name: 'مجموعة الأحد والأربعاء - الصف الثالث',
    gradeLevel: 'الصف الثالث الثانوي',
    academicYear: currentYear,
    academicTerm: currentTerm,
    status: 'ACTIVE',
    _count: { enrollments: 10, schedules: 2 },
  },
  {
    id: 'group-2',
    name: 'مجموعة المراجعة النهائية',
    gradeLevel: 'الصف الثالث الثانوي',
    academicYear: '2020-2021',
    academicTerm: 'SECOND_TERM',
    status: 'ACTIVE',
    _count: { enrollments: 5, schedules: 1 },
  },
];

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('GroupList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders loading state', () => {
    vi.spyOn(useGroupsHooks, 'useGroups').mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithQuery(<GroupList />);
    
    expect(screen.queryByText('مجموعة الأحد والأربعاء - الصف الثالث')).not.toBeInTheDocument();
  });

  it('renders empty state when no groups exist', () => {
    vi.spyOn(useGroupsHooks, 'useGroups').mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithQuery(<GroupList />);
    
    expect(screen.getByText('لا توجد مجموعات بعد')).toBeInTheDocument();
  });

  it('renders groups with default active academic year and term pre-selected', () => {
    vi.spyOn(useGroupsHooks, 'useGroups').mockReturnValue({
      data: mockGroups,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithQuery(<GroupList />);
    
    // Group-1 matching current default year and term should be visible
    expect(screen.getByText('مجموعة الأحد والأربعاء - الصف الثالث')).toBeInTheDocument();

    // Verify filter dropdowns exist
    expect(screen.getByText('جميع المراحل التعليمية')).toBeInTheDocument();
    expect(screen.getByText('جميع الصفوف الدراسية')).toBeInTheDocument();
    expect(screen.getByText('جميع الأماكن والسناتر')).toBeInTheDocument();
  });

  it('loads and respects stored academic year and semester from localStorage', () => {
    localStorage.setItem(STORAGE_YEAR_KEY, JSON.stringify(['2020-2021']));
    localStorage.setItem(STORAGE_TERM_KEY, JSON.stringify(['SECOND_TERM']));

    vi.spyOn(useGroupsHooks, 'useGroups').mockReturnValue({
      data: mockGroups,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithQuery(<GroupList />);

    // Group-2 matching stored 2020-2021 and SECOND_TERM should be visible
    expect(screen.getByText('مجموعة المراجعة النهائية')).toBeInTheDocument();
    expect(screen.queryByText('مجموعة الأحد والأربعاء - الصف الثالث')).not.toBeInTheDocument();
  });

  it('filters groups based on search query when viewing all', () => {
    localStorage.setItem(STORAGE_YEAR_KEY, JSON.stringify([currentYear, '2020-2021']));
    localStorage.setItem(STORAGE_TERM_KEY, JSON.stringify([currentTerm, 'SECOND_TERM']));

    vi.spyOn(useGroupsHooks, 'useGroups').mockReturnValue({
      data: mockGroups,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithQuery(<GroupList />);
    
    const searchInput = screen.getByPlaceholderText(/بحث بالاسم أو الصف أو المكان/i);
    fireEvent.change(searchInput, { target: { value: 'المراجعة' } });
    
    expect(screen.queryByText('مجموعة الأحد والأربعاء - الصف الثالث')).not.toBeInTheDocument();
    expect(screen.getByText('مجموعة المراجعة النهائية')).toBeInTheDocument();
  });

  it('renders error state', () => {
    vi.spyOn(useGroupsHooks, 'useGroups').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('API Error'),
      refetch: vi.fn(),
    } as any);

    renderWithQuery(<GroupList />);
    
    expect(screen.getByText('فشل في تحميل المجموعات')).toBeInTheDocument();
  });
});
