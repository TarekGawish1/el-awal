import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LessonVideoPlayer } from '../components/LessonVideoPlayer';
import { apiClient } from '@/lib/api/client';

describe('LessonVideoPlayer Component Hardened Security Defenses', () => {
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

  it('renders blurred security overlay when tab becomes hidden (visibilitychange)', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      embedUrl: mockSecureEmbedUrl,
      expiresAt: 1720000000,
    });

    renderWithClient(
      <LessonVideoPlayer lessonId="lesson-physics-101" user={mockUser} />,
    );

    await screen.findByTestId('bunny-stream-iframe');

    // Initially not obscured
    expect(screen.queryByTestId('tab-hidden-overlay')).not.toBeInTheDocument();

    // Simulate tab hiding
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Blurred overlay should appear
    expect(screen.getByTestId('tab-hidden-overlay')).toBeInTheDocument();
    expect(
      screen.getByText('⚠️ تم إيقاف المشاهدة مؤقتاً: يرجى العودة لتبويب الدرس للمتابعة.'),
    ).toBeInTheDocument();

    // Restore tab visibility
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(screen.queryByTestId('tab-hidden-overlay')).not.toBeInTheDocument();
  });

  it('verifies pressing F12 or Ctrl+Shift+I fires preventDefault', () => {
    renderWithClient(
      <LessonVideoPlayer lessonId="lesson-physics-101" user={mockUser} />,
    );

    // Test F12
    const f12Event = new KeyboardEvent('keydown', {
      key: 'F12',
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(f12Event);
    expect(f12Event.defaultPrevented).toBe(true);

    // Test Ctrl + Shift + I (DevTools inspection)
    const ctrlShiftIEvent = new KeyboardEvent('keydown', {
      key: 'I',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(ctrlShiftIEvent);
    expect(ctrlShiftIEvent.defaultPrevented).toBe(true);

    // Test Ctrl + U (View Source)
    const ctrlUEvent = new KeyboardEvent('keydown', {
      key: 'u',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(ctrlUEvent);
    expect(ctrlUEvent.defaultPrevented).toBe(true);

    // Test PrintScreen
    const printScreenEvent = new KeyboardEvent('keydown', {
      key: 'PrintScreen',
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(printScreenEvent);
    expect(printScreenEvent.defaultPrevented).toBe(true);
  });

  it('displays full student attribution dynamic watermark and static ghost nodes', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      embedUrl: mockSecureEmbedUrl,
      expiresAt: 1720000000,
    });

    renderWithClient(
      <LessonVideoPlayer lessonId="lesson-physics-101" user={mockUser} />,
    );

    const watermark = screen.getByTestId('dynamic-video-watermark');
    expect(watermark).toBeInTheDocument();
    expect(watermark).toHaveTextContent('أحمد محمود رضوان • STU-2026-8888 • 01012345678');
    expect(watermark).toHaveStyle({ position: 'absolute' });

    // Ghost nodes with identifying information across the frame
    const ghostMatches = screen.getAllByText('أحمد محمود رضوان • STU-2026-8888 • 01012345678');
    expect(ghostMatches.length).toBeGreaterThanOrEqual(4);
  });

  it('shifts watermark coordinates randomly over timer intervals between 10% and 85%', async () => {
    vi.useFakeTimers();

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      embedUrl: mockSecureEmbedUrl,
      expiresAt: 1720000000,
    });

    renderWithClient(
      <LessonVideoPlayer lessonId="lesson-physics-101" user={mockUser} />,
    );

    const watermark = screen.getByTestId('dynamic-video-watermark');

    // Advance timer by 25 seconds to trigger next random shift
    act(() => {
      vi.advanceTimersByTime(25000);
    });

    const topValue = parseInt(watermark.style.top, 10);
    const leftValue = parseInt(watermark.style.left, 10);

    expect(topValue).toBeGreaterThanOrEqual(10);
    expect(topValue).toBeLessThanOrEqual(85);
    expect(leftValue).toBeGreaterThanOrEqual(10);
    expect(leftValue).toBeLessThanOrEqual(85);

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
