import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ContentLibrary } from '../components/ContentLibrary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as useContent from '../hooks/use-content';
import { ContentType } from '../types/content.types';

// Mock hooks
vi.mock('../hooks/use-content', () => ({
  useContent: vi.fn(),
  useDeleteContent: vi.fn(),
}));

vi.mock('@/features/groups/hooks/useAcademicPeriod', () => ({
  useAcademicPeriod: () => ({
    activeYear: '2025-2026',
    activeTerm: 'FIRST_TERM',
    selectedYears: ['2025-2026'],
    selectedTerms: ['FIRST_TERM'],
    isFilterActive: false,
    academicYears: ['2025-2026'],
    currentAcademicTerm: 'FIRST_TERM',
    setSingleAcademicYear: vi.fn(),
    setSingleAcademicTerm: vi.fn(),
    toggleAcademicYear: vi.fn(),
    toggleAcademicTerm: vi.fn(),
    resetToActiveDefaults: vi.fn(),
  }),
  useStoredAcademicPeriod: () => ({
    academicYear: '2025-2026',
    academicTerm: 'FIRST_TERM',
  }),
  getDefaultAcademicYear: () => '2025-2026',
  getDefaultAcademicTerm: () => 'FIRST_TERM',
}));

vi.mock('@/features/groups/components/AcademicPeriodSwitcher', () => ({
  AcademicPeriodSwitcher: () => <div data-testid="period-switcher">Academic Period Switcher</div>,
}));

const queryClient = new QueryClient();
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('ContentLibrary', () => {
  beforeEach(() => {
    vi.mocked(useContent.useDeleteContent).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
  });

  it('renders loading state', () => {
    vi.mocked(useContent.useContent).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as any);

    const { container } = renderWithProviders(<ContentLibrary onUploadClick={vi.fn()} />);
    expect(container).toBeInTheDocument();
  });

  it('renders empty state', () => {
    vi.mocked(useContent.useContent).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);

    renderWithProviders(<ContentLibrary onUploadClick={vi.fn()} />);
    expect(screen.getByText('لا توجد مرفقات بعد لهذه الفترة')).toBeInTheDocument();
  });

  it('renders populated content', () => {
    vi.mocked(useContent.useContent).mockReturnValue({
      data: [
        {
          id: '1',
          title: 'ملخص الدرس الأول',
          contentType: ContentType.SUMMARY,
          fileKey: 'key',
          fileUrl: 'url',
          fileSize: 1024,
          gradeLevel: 'الصف الثالث الإعدادي',
          sessionTopic: 'الحصة 1: النحو',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          teacherId: 't1'
        }
      ],
      isLoading: false,
      isError: false,
    } as any);

    renderWithProviders(<ContentLibrary onUploadClick={vi.fn()} />);
    expect(screen.getByText('ملخص الدرس الأول')).toBeInTheDocument();
    expect(screen.getByText('الحصة 1: النحو')).toBeInTheDocument();
    expect(screen.getByText('الصف الثالث الإعدادي')).toBeInTheDocument();
  });

  it('calls onUploadClick when upload button is clicked', () => {
    vi.mocked(useContent.useContent).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);

    const onUploadClick = vi.fn();
    renderWithProviders(<ContentLibrary onUploadClick={onUploadClick} />);
    
    const uploadBtns = screen.getAllByRole('button', { name: /رفع/ });
    fireEvent.click(uploadBtns[0]);
    expect(onUploadClick).toHaveBeenCalledTimes(1);
  });
});

