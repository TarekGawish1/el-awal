import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAuthStore } from '../store/auth.store';
import { setStoredTokens, getStoredAccessToken, getStoredRefreshToken, getStoredUser, clearStoredTokens } from '../utils/auth-tokens';
import { AuthTokensResponse } from '../types/auth.types';

const mockSession: AuthTokensResponse = {
  accessToken: 'valid-access-token',
  refreshToken: 'valid-refresh-token',
  tokenType: 'Bearer',
  expiresIn: 900,
  user: {
    id: 'user-1',
    fullName: 'أحمد محمود',
    email: 'teacher@elawal.com',
    role: 'TEACHER',
    teacherProfileId: 'tch-1',
  },
};

describe('Auth Store — Session Lifecycle & Startup Recovery', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isInitialized: false,
      isValidating: false,
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── initialize() ──────────────────────────────────────────────────────────

  describe('initialize()', () => {
    it('sets isAuthenticated=true when valid tokens + user exist in localStorage', () => {
      setStoredTokens(mockSession);
      useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isValidating).toBe(true);
      expect(state.user).toEqual(mockSession.user);
      expect(state.accessToken).toBe('valid-access-token');
      expect(state.refreshToken).toBe('valid-refresh-token');
    });

    it('sets isAuthenticated=false when localStorage is empty', () => {
      useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.isAuthenticated).toBe(false);
      expect(state.isValidating).toBe(false);
      expect(state.user).toBeNull();
    });

    it('sets isAuthenticated=true if only refresh token + user exist (expired access token cleared)', () => {
      setStoredTokens(mockSession);
      localStorage.removeItem('el_awal_token'); // Simulate access token cleared

      useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isValidating).toBe(true);
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBe('valid-refresh-token');
    });

    it('is idempotent — second call does not overwrite state', () => {
      setStoredTokens(mockSession);
      useAuthStore.getState().initialize();

      // Modify state after first init
      useAuthStore.setState({ accessToken: 'updated-token' });

      // Second init should be a no-op
      useAuthStore.getState().initialize();
      expect(useAuthStore.getState().accessToken).toBe('updated-token');
    });
  });

  // ─── setSession() ──────────────────────────────────────────────────────────

  describe('setSession()', () => {
    it('persists tokens + user to both Zustand and localStorage', () => {
      useAuthStore.getState().setSession(mockSession);

      // Zustand
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.isInitialized).toBe(true);
      expect(state.isValidating).toBe(false);
      expect(state.user?.id).toBe('user-1');

      // localStorage
      expect(getStoredAccessToken()).toBe('valid-access-token');
      expect(getStoredRefreshToken()).toBe('valid-refresh-token');
      expect(getStoredUser()?.id).toBe('user-1');
    });
  });

  // ─── clearSession() ───────────────────────────────────────────────────────

  describe('clearSession()', () => {
    it('removes all auth state from Zustand and localStorage', () => {
      useAuthStore.getState().setSession(mockSession);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      useAuthStore.getState().clearSession();

      // Zustand
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isInitialized).toBe(true);
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();

      // localStorage
      expect(getStoredAccessToken()).toBeNull();
      expect(getStoredRefreshToken()).toBeNull();
      expect(getStoredUser()).toBeNull();
    });
  });

  // ─── validateSession() ────────────────────────────────────────────────────

  describe('validateSession()', () => {
    it('keeps session intact when access token is valid (server returns 200)', async () => {
      useAuthStore.getState().setSession(mockSession);

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockSession.user }),
      } as any);

      await useAuthStore.getState().validateSession();

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().isValidating).toBe(false);
      expect(useAuthStore.getState().user?.id).toBe('user-1');
    });

    it('refreshes tokens when access token is expired but refresh token is valid', async () => {
      useAuthStore.getState().setSession(mockSession);

      const fetchSpy = vi.spyOn(global, 'fetch')
        // First call: GET /users/me → 401
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ message: 'Unauthorized' }),
        } as any)
        // Second call: POST /auth/refresh → 200 with new tokens
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              accessToken: 'refreshed-access-token',
              refreshToken: 'refreshed-refresh-token',
            },
          }),
        } as any);

      await useAuthStore.getState().validateSession();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.isValidating).toBe(false);
      expect(state.accessToken).toBe('refreshed-access-token');
      expect(state.refreshToken).toBe('refreshed-refresh-token');
      expect(getStoredAccessToken()).toBe('refreshed-access-token');
      expect(getStoredRefreshToken()).toBe('refreshed-refresh-token');
    });

    it('clears session when both access and refresh tokens are invalid', async () => {
      useAuthStore.getState().setSession(mockSession);

      vi.spyOn(global, 'fetch')
        // First call: GET /users/me → 401
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as any)
        // Second call: POST /auth/refresh → 401
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ message: 'Invalid refresh token' }),
        } as any);

      await useAuthStore.getState().validateSession();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isValidating).toBe(false);
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(getStoredAccessToken()).toBeNull();
      expect(getStoredRefreshToken()).toBeNull();
    });

    it('preserves session on network error (offline tolerance)', async () => {
      useAuthStore.getState().setSession(mockSession);

      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await useAuthStore.getState().validateSession();

      // Session should NOT be cleared on network error
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().isValidating).toBe(false);
      expect(useAuthStore.getState().user?.id).toBe('user-1');
    });

    it('is a no-op when not authenticated', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      await useAuthStore.getState().validateSession();

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('is a no-op when authenticated but no refresh token', async () => {
      useAuthStore.setState({
        user: mockSession.user,
        accessToken: 'some-token',
        refreshToken: null,
        isAuthenticated: true,
        isInitialized: true,
      });

      const fetchSpy = vi.spyOn(global, 'fetch');

      await useAuthStore.getState().validateSession();

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  // ─── updateTokens() ───────────────────────────────────────────────────────

  describe('updateTokens()', () => {
    it('updates tokens in both Zustand and localStorage without altering user', () => {
      useAuthStore.getState().setSession(mockSession);

      useAuthStore.getState().updateTokens({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      expect(useAuthStore.getState().accessToken).toBe('new-access');
      expect(useAuthStore.getState().refreshToken).toBe('new-refresh');
      expect(useAuthStore.getState().user?.id).toBe('user-1'); // Unchanged
      expect(getStoredAccessToken()).toBe('new-access');
      expect(getStoredRefreshToken()).toBe('new-refresh');
    });
  });
});

describe('Auth Store — handleAuthFailure guard', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isInitialized: false,
      isValidating: false,
    });
    vi.restoreAllMocks();
  });

  it('clearSession removes all 4 localStorage keys', () => {
    setStoredTokens(mockSession);

    // Verify all 4 keys exist
    expect(localStorage.getItem('el_awal_token')).not.toBeNull();
    expect(localStorage.getItem('el_awal_refresh_token')).not.toBeNull();
    expect(localStorage.getItem('el_awal_user')).not.toBeNull();
    expect(localStorage.getItem('el_awal_teacher_session')).not.toBeNull();

    useAuthStore.getState().clearSession();

    // Verify all 4 keys removed
    expect(localStorage.getItem('el_awal_token')).toBeNull();
    expect(localStorage.getItem('el_awal_refresh_token')).toBeNull();
    expect(localStorage.getItem('el_awal_user')).toBeNull();
    expect(localStorage.getItem('el_awal_teacher_session')).toBeNull();
  });
});
