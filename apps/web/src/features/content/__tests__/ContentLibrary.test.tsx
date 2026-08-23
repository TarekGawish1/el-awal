import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ContentLibrary } from '../components/ContentLibrary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as useContent from '../hooks/use-content';
import * as useOnlineStatus from '@/lib/offline/use-online-status';
import { ContentType } from '../types/content.types';

// Mock hooks
vi.mock('../hooks/use-content', () => ({
  useContent: vi.fn(),
  useDeleteContent: vi.fn(),
  useUpdateContent: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useGroupSessions: () => ({
    data: [],
    isLoading: false,
  }),
}));

vi.mock('@/lib/offline/use-online-status', () => ({
  useOnlineStatus: vi.fn(() => true),
}));

vi.mock('@/features/groups/hooks/useAcademicPeriod', () => ({
  useAcademicPeriod: () => ({
    activeYear: '2026-2027',
    activeTerm: 'FIRST_TERM',
    selectedYears: ['2026-2027'],
    setSelectedYears: vi.fn(),
    selectedTerms: ['FIRST_TERM'],
    isFilterActive: false,
    academicYears: ['2026-2027'],
    currentAcademicTerm: 'FIRST_TERM',
    setSingleAcademicYear: vi.fn(),
    setSingleAcademicTerm: vi.fn(),
    toggleAcademicYear: vi.fn(),
    toggleAcademicTerm: vi.fn(),
    resetToActiveDefaults: vi.fn(),
  }),
  useStoredAcademicPeriod: () => ({
    academicYear: '2026-2027',
    academicTerm: 'FIRST_TERM',
  }),
  getDefaultAcademicYear: () => '2026-2027',
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
    vi.mocked(useOnlineStatus.useOnlineStatus).mockReturnValue(true);
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
    expect(screen.getAllByText('الصف الثالث الإعدادي').length).toBeGreaterThan(0);
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

  it('disables upload actions with an Arabic tooltip offline', () => {
    vi.mocked(useOnlineStatus.useOnlineStatus).mockReturnValue(false);
    vi.mocked(useContent.useContent).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);

    renderWithProviders(<ContentLibrary onUploadClick={vi.fn()} />);

    const uploadButton = screen.getByRole('button', { name: 'رفع مرفق / ملزمة جديدة' });
    expect(uploadButton).toBeDisabled();
    expect(uploadButton.parentElement).toHaveAttribute('title', 'يتطلب رفع المرفقات اتصالاً بالإنترنت');
    expect(screen.getByRole('button', { name: 'رفع أول مرفق للحصة' })).toBeDisabled();
  });
});

