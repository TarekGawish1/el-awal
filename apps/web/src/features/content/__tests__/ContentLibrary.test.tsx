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
    expect(screen.getByText('لا توجد ملفات بعد')).toBeInTheDocument();
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
    expect(screen.getByText('ملخص')).toBeInTheDocument();
  });

  it('calls onUploadClick when upload button is clicked', () => {
    vi.mocked(useContent.useContent).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);

    const onUploadClick = vi.fn();
    renderWithProviders(<ContentLibrary onUploadClick={onUploadClick} />);
    
    const uploadBtns = screen.getAllByRole('button', { name: /رفع ملف/ });
    fireEvent.click(uploadBtns[0]);
    expect(onUploadClick).toHaveBeenCalledTimes(1);
  });
});
