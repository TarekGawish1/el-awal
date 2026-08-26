import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BookletManagementSection } from '../components/BookletManagementSection';
import { useBooklets } from '../hooks/useBooklets';

vi.mock('../hooks/useBooklets', () => ({
  useBooklets: vi.fn(),
}));

describe('BookletManagementSection Component', () => {
  const mockCreateBooklet = vi.fn().mockResolvedValue({ id: 'new-b' });
  const mockUpdateBooklet = vi.fn().mockResolvedValue({ id: 'upd-b' });
  const mockDeleteBooklet = vi.fn().mockResolvedValue({ success: true });

  const mockBooklets = [
    {
      id: 'b-1',
      title: 'مذكرة الشرح والتدريبات - كيمياء 1',
      description: 'مذكرة شاملة لجميع فصول المنهج',
      price: 85,
      gradeLevel: 'الصف الأول الثانوي',
      stockCount: 40,
      salesCount: 15,
      totalRevenue: 1275,
      isActive: true,
      createdAt: '2026-08-20T10:00:00.000Z',
    },
    {
      id: 'b-2',
      title: 'بنك أسئلة الكيمياء العضوية',
      description: 'أكثر من 500 سؤال',
      price: 110,
      gradeLevel: 'الصف الثالث الثانوي',
      stockCount: 0,
      salesCount: 30,
      totalRevenue: 3300,
      isActive: true,
      createdAt: '2026-08-21T10:00:00.000Z',
    },
  ];

  const mockGroups = [
    { id: 'grp-1', name: 'مجموعة أبطال الكيمياء', gradeLevel: 'الصف الأول الثانوي' },
    { id: 'grp-2', name: 'مجموعة العباقرة', gradeLevel: 'الصف الثالث الثانوي' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBooklets).mockReturnValue({
      booklets: mockBooklets as any,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      createBooklet: mockCreateBooklet,
      isCreating: false,
      updateBooklet: mockUpdateBooklet,
      isUpdating: false,
      deleteBooklet: mockDeleteBooklet,
      isDeleting: false,
    });
  });

  it('renders stats metrics, search bar, and booklet cards correctly', () => {
    render(<BookletManagementSection groups={mockGroups} />);

    expect(screen.getByText('إدارة المذكرات والملازم الدراسية')).toBeInTheDocument();
    expect(screen.getByText('إجمالي التحصيلات')).toBeInTheDocument();
    expect(screen.getByText('النسخ المسددة')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument(); // 15 + 30
    expect(screen.getByText('4,575')).toBeInTheDocument(); // 1275 + 3300

    expect(screen.getByText('مذكرة الشرح والتدريبات - كيمياء 1')).toBeInTheDocument();
    expect(screen.getByText('بنك أسئلة الكيمياء العضوية')).toBeInTheDocument();
    expect(screen.getByText('نفد المخزون')).toBeInTheDocument(); // Stock 0 badge
  });

  it('filters booklets by search term and grade level', () => {
    render(<BookletManagementSection groups={mockGroups} />);

    const searchInput = screen.getByPlaceholderText(/بحث باسم المذكرة/i);
    fireEvent.change(searchInput, { target: { value: 'العضوية' } });

    expect(screen.getByText('بنك أسئلة الكيمياء العضوية')).toBeInTheDocument();
    expect(screen.queryByText('مذكرة الشرح والتدريبات - كيمياء 1')).not.toBeInTheDocument();
  });

  it('opens create booklet modal when clicking add button', () => {
    render(<BookletManagementSection groups={mockGroups} />);

    const addButton = screen.getByRole('button', { name: /إضافة مذكرة جديدة/i });
    fireEvent.click(addButton);

    expect(screen.getByText('إضافة مذكرة / ملزمة دراسية')).toBeInTheDocument();
    expect(screen.getByText(/عنوان أو اسم المذكرة/i)).toBeInTheDocument();
  });
});
