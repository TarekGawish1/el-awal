import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GroupList } from '../components/GroupList';
import * as useGroupsHooks from '../hooks/useGroups';

// Mock dependencies
vi.mock('../hooks/useGroups', () => ({
  useGroups: vi.fn(),
  useCreateGroup: vi.fn(),
}));

const mockGroups = [
  {
    id: 'group-1',
    name: 'مجموعة الأحد والأربعاء - الصف الثالث',
    gradeLevel: 'الصف الثالث الثانوي',
    status: 'ACTIVE',
    _count: { enrollments: 10, schedules: 2 },
  },
  {
    id: 'group-2',
    name: 'مجموعة المراجعة النهائية',
    gradeLevel: 'الصف الثالث الثانوي',
    status: 'ACTIVE',
    _count: { enrollments: 5, schedules: 1 },
  }
];

describe('GroupList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    vi.spyOn(useGroupsHooks, 'useGroups').mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<GroupList />);
    
    // Skeleton should be rendered (indicated by empty structure or lack of group text)
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

    render(<GroupList />);
    
    expect(screen.getByText('لا توجد مجموعات بعد')).toBeInTheDocument();
  });

  it('renders groups correctly', () => {
    vi.spyOn(useGroupsHooks, 'useGroups').mockReturnValue({
      data: mockGroups,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<GroupList />);
    
    expect(screen.getByText('مجموعة الأحد والأربعاء - الصف الثالث')).toBeInTheDocument();
    expect(screen.getByText('مجموعة المراجعة النهائية')).toBeInTheDocument();
  });

  it('filters groups based on search query', () => {
    vi.spyOn(useGroupsHooks, 'useGroups').mockReturnValue({
      data: mockGroups,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<GroupList />);
    
    const searchInput = screen.getByPlaceholderText(/ابحث عن مجموعة/i);
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

    render(<GroupList />);
    
    expect(screen.getByText('فشل في تحميل المجموعات')).toBeInTheDocument();
  });
});
