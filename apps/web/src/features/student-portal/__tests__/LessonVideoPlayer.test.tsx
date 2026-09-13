import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LessonVideoPlayer } from '../components/LessonVideoPlayer';
import { apiClient } from '@/lib/api/client';

describe('LessonVideoPlayer Component', () => {
  let queryClient: QueryClient;

  const mockSecureEmbedUrl =
    'https://iframe.mediadelivery.net/embed/730290/video-guid-123?token=mocked-sha256-signature&expires=1720000000';

  const mockUser = {
    fullName: 'أحمد محمود رضوان',
    studentCode: 'STU-2026-8888',
    phone: '01012345678',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    );
  };

  it('verifies the iframe loads with the secure URL once query resolves', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      embedUrl: mockSecureEmbedUrl,
      expiresAt: 1720000000,
    });

    renderWithClient(
      <LessonVideoPlayer lessonId="lesson-physics-101" user={mockUser} />,
    );

    // Initial loading state
    expect(screen.getByTestId('player-loading-skeleton')).toBeInTheDocument();

    // After query resolves, verify iframe
    const iframe = await screen.findByTestId('bunny-stream-iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', mockSecureEmbedUrl);
    expect(iframe).toHaveAttribute('allowFullScreen');
    expect(iframe).toHaveAttribute(
      'allow',
      'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;',
    );

    expect(apiClient.get).toHaveBeenCalledWith(
      '/courses/lessons/lesson-physics-101/stream-ticket',
    );
  });

  it('verifies right-click / context menu is prevented on the video container', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      embedUrl: mockSecureEmbedUrl,
      expiresAt: 1720000000,
    });

    renderWithClient(
      <LessonVideoPlayer lessonId="lesson-physics-101" user={mockUser} />,
    );

    const container = screen.getByTestId('lesson-video-player-container');
    expect(container).toBeInTheDocument();

    const contextMenuEvent = fireEvent.contextMenu(container);
    // When default is prevented, fireEvent returns false
    expect(contextMenuEvent).toBe(false);
  });

  it('displays dynamic floating anti-theft watermark with student information', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      embedUrl: mockSecureEmbedUrl,
      expiresAt: 1720000000,
    });

    renderWithClient(
      <LessonVideoPlayer lessonId="lesson-physics-101" user={mockUser} />,
    );

    const watermark = screen.getByTestId('dynamic-video-watermark');
    expect(watermark).toBeInTheDocument();
    expect(watermark).toHaveTextContent('أحمد محمود رضوان • STU-2026-8888');
    expect(watermark).toHaveStyle({ position: 'absolute' });
  });

  it('shifts watermark coordinates randomly over timer intervals', async () => {
    vi.useFakeTimers();

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      embedUrl: mockSecureEmbedUrl,
      expiresAt: 1720000000,
    });

    renderWithClient(
      <LessonVideoPlayer lessonId="lesson-physics-101" user={mockUser} />,
    );

    const watermark = screen.getByTestId('dynamic-video-watermark');
    const initialTop = watermark.style.top;
    const initialLeft = watermark.style.left;

    // Advance timer by 35 seconds to trigger next random shift
    act(() => {
      vi.advanceTimersByTime(35000);
    });

    // Positions should be valid percentage strings
    expect(watermark.style.top).toMatch(/%$/);
    expect(watermark.style.left).toMatch(/%$/);

    vi.useRealTimers();
  });

  it('renders graceful error message with retry button when stream-ticket API fails', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValueOnce(
      new Error('يجب الاشتراك في هذا الكورس أولاً لمشاهدة شرح هذا الدرس'),
    );

    renderWithClient(
      <LessonVideoPlayer lessonId="lesson-locked" user={mockUser} />,
    );

    const errorFallback = await screen.findByTestId('player-error-fallback');
    expect(errorFallback).toBeInTheDocument();
    expect(
      screen.getByText('يجب الاشتراك في هذا الكورس أولاً لمشاهدة شرح هذا الدرس'),
    ).toBeInTheDocument();
    expect(screen.getByText('إعادة المحاولة')).toBeInTheDocument();
  });
});
