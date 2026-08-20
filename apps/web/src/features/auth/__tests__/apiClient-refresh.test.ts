import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { apiClient } from '@/lib/api/client';
import { setStoredTokens, getStoredAccessToken, getStoredRefreshToken } from '../utils/auth-tokens';
import { useAuthStore } from '../store/auth.store';
import { AuthTokensResponse } from '../types/auth.types';

describe('apiClient Silent Refresh Token Interceptor', () => {
  const mockSession: AuthTokensResponse = {
    accessToken: 'initial-access-token',
    refreshToken: 'initial-refresh-token',
    tokenType: 'Bearer',
    expiresIn: 900,
    user: {
      id: 'user-1',
      fullName: 'أحمد محمود',
      role: 'TEACHER',
    },
  };

  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isInitialized: false,
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches Bearer access token to request headers', async () => {
    setStoredTokens(mockSession);
    useAuthStore.getState().initialize();

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ success: true, data: { message: 'ok' } }),
    } as any);

    const result = await apiClient<{ message: string }>('/teachers/dashboard/overview');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, config] = fetchSpy.mock.calls[0];
    expect((config?.headers as Record<string, string>)['Authorization']).toBe('Bearer initial-access-token');
    expect(result).toEqual({ message: 'ok' });
  });

  it('transparently refreshes expired access token on 401 and retries original request', async () => {
    setStoredTokens(mockSession);
    useAuthStore.getState().initialize();

    let callCount = 0;
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any, options: any) => {
      const urlStr = String(url);
      callCount++;

      // 1. Initial request fails with 401 Unauthorized
      if (urlStr.includes('/teachers/dashboard/overview') && callCount === 1) {
        return {
          status: 401,
          ok: false,
          json: async () => ({ message: 'Unauthorized' }),
        } as any;
      }

      // 2. Token refresh request
      if (urlStr.includes('/auth/refresh')) {
        expect(options.method).toBe('POST');
        expect(JSON.parse(options.body)).toEqual({ refreshToken: 'initial-refresh-token' });
        return {
          status: 200,
          ok: true,
          json: async () => ({
            success: true,
            data: {
              accessToken: 'rotated-access-token',
              refreshToken: 'rotated-refresh-token',
            },
          }),
        } as any;
      }

      // 3. Retried request with new access token
      if (urlStr.includes('/teachers/dashboard/overview') && callCount === 3) {
        expect((options?.headers as Record<string, string>)['Authorization']).toBe('Bearer rotated-access-token');
        return {
          status: 200,
          ok: true,
          json: async () => ({ success: true, data: { stats: 'active' } }),
        } as any;
      }

      return { status: 500, ok: false, json: async () => ({}) } as any;
    });

    const result = await apiClient<{ stats: string }>('/teachers/dashboard/overview');

    expect(result).toEqual({ stats: 'active' });
    expect(getStoredAccessToken()).toBe('rotated-access-token');
    expect(getStoredRefreshToken()).toBe('rotated-refresh-token');
    expect(useAuthStore.getState().accessToken).toBe('rotated-access-token');
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('shares single refresh request across concurrent 401 calls without race conditions', async () => {
    setStoredTokens(mockSession);
    useAuthStore.getState().initialize();

    let refreshEndpointHitCount = 0;

    vi.spyOn(global, 'fetch').mockImplementation(async (url: any, options: any) => {
      const urlStr = String(url);

      if (urlStr.includes('/auth/refresh')) {
        refreshEndpointHitCount++;
        // Simulate network latency for refresh
        await new Promise((resolve) => setTimeout(resolve, 50));
        return {
          status: 200,
          ok: true,
          json: async () => ({
            success: true,
            data: {
              accessToken: 'single-rotated-access-token',
              refreshToken: 'single-rotated-refresh-token',
            },
          }),
        } as any;
      }

      const authHeader = (options?.headers as Record<string, string>)?.[
        'Authorization'
      ];
      if (authHeader === 'Bearer single-rotated-access-token') {
        return {
          status: 200,
          ok: true,
          json: async () => ({ success: true, data: { endpoint: urlStr } }),
        } as any;
      }

      // Initial calls return 401
      return {
        status: 401,
        ok: false,
        json: async () => ({ message: 'Unauthorized' }),
      } as any;
    });

    // Execute 3 concurrent requests simultaneously
    const [res1, res2, res3] = await Promise.all([
      apiClient<{ endpoint: string }>('/groups'),
      apiClient<{ endpoint: string }>('/students'),
      apiClient<{ endpoint: string }>('/schedules'),
    ]);

    expect(res1.endpoint).toContain('/groups');
    expect(res2.endpoint).toContain('/students');
    expect(res3.endpoint).toContain('/schedules');

    // Crucial: Only 1 refresh request was dispatched
    expect(refreshEndpointHitCount).toBe(1);
    expect(getStoredAccessToken()).toBe('single-rotated-access-token');
  });
});
