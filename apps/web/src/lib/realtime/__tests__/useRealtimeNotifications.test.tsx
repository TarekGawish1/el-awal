import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useRealtimeNotifications } from '../useRealtimeNotifications';
import * as socketModule from '../socket';
import * as authModule from '@/features/auth';
import { notificationKeys } from '@/hooks/useNotifications';

describe('useRealtimeNotifications', () => {
  let queryClient: QueryClient;
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient();
    vi.spyOn(socketModule, 'getRealtimeSocket').mockReturnValue(mockSocket as any);
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1' },
    } as any);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('subscribes to notifications:changed on mount and invalidates notifications query', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useRealtimeNotifications(true), { wrapper });

    expect(mockSocket.on).toHaveBeenCalledWith('notifications:changed', expect.any(Function));

    // Trigger the callback
    const handler = mockSocket.on.mock.calls[0][1];
    handler();

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notificationKeys.all });
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useRealtimeNotifications(true), { wrapper });

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith('notifications:changed', expect.any(Function));
  });

  it('does not subscribe when disabled or unauthenticated', () => {
    renderHook(() => useRealtimeNotifications(false), { wrapper });
    expect(mockSocket.on).not.toHaveBeenCalled();

    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      user: null,
    } as any);

    renderHook(() => useRealtimeNotifications(true), { wrapper });
    expect(mockSocket.on).not.toHaveBeenCalled();
  });
});
