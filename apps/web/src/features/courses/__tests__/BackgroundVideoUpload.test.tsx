import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  VideoUploadManagerProvider,
  useVideoUploadManager,
} from '../context/video-upload-manager.context';
import { BackgroundVideoUploadMonitor } from '../components/BackgroundVideoUploadMonitor';

// Test consumer to trigger uploads
function TestUploadComponent() {
  const { startUpload, tasks } = useVideoUploadManager();
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          const fakeFile = new File(['dummy content'], 'physics_lesson_1.mp4', {
            type: 'video/mp4',
          });
          startUpload({
            file: fakeFile,
            lessonId: 'lesson-123',
            lessonTitle: 'الدرس الأول: الحركة والسرعة',
          }).catch(() => {});
        }}
      >
        بدء الرفع
      </button>
      <div data-testid="tasks-count">{Object.keys(tasks).length}</div>
    </div>
  );
}

describe('Background Video Upload & Monitor Suite', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it('renders nothing when there are no active background uploads', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <VideoUploadManagerProvider>
          <BackgroundVideoUploadMonitor />
        </VideoUploadManagerProvider>
      </QueryClientProvider>,
    );

    expect(container.querySelector('aside')).toBeNull();
  });

  it('renders floating monitor with lesson title and progress bar when upload starts', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <VideoUploadManagerProvider>
          <TestUploadComponent />
          <BackgroundVideoUploadMonitor />
        </VideoUploadManagerProvider>
      </QueryClientProvider>,
    );

    const uploadBtn = screen.getByText('بدء الرفع');
    fireEvent.click(uploadBtn);

    // Monitor should appear
    expect(await screen.findByText('الدرس الأول: الحركة والسرعة')).toBeDefined();
    expect(screen.getByText('جاري الرفع في الخلفية')).toBeDefined();
    expect(screen.getByText(/يستمر الرفع بأمان في الخلفية/)).toBeDefined();
  });

  it('supports minimizing and expanding the floating monitor', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <VideoUploadManagerProvider>
          <TestUploadComponent />
          <BackgroundVideoUploadMonitor />
        </VideoUploadManagerProvider>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByText('بدء الرفع'));
    expect(await screen.findByText('الدرس الأول: الحركة والسرعة')).toBeDefined();

    const toggleBtn = screen.getByTitle('تصغير');
    fireEvent.click(toggleBtn);

    // After minimize, the detailed note is hidden
    expect(screen.queryByText(/يستمر الرفع بأمان في الخلفية/)).toBeNull();

    const expandBtn = screen.getByTitle('تكبير');
    fireEvent.click(expandBtn);

    // After expand, the detailed note is visible again
    expect(screen.getByText(/يستمر الرفع بأمان في الخلفية/)).toBeDefined();
  });
});
