import { create } from 'zustand';
import { AuthState, AuthTokensResponse, AuthUser, RefreshTokenResponse } from '../types/auth.types';
import {
  setStoredTokens,
  updateStoredTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredUser,
  clearStoredTokens,
} from '../utils/auth-tokens';

interface AuthActions {
  setSession: (session: AuthTokensResponse) => void;
  updateTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  clearSession: () => void;
  initialize: () => void;
  validateSession: () => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isInitialized: false,
  isValidating: false,

  setSession: (session: AuthTokensResponse) => {
    setStoredTokens(session);
    set({
      user: session.user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      isAuthenticated: true,
      isInitialized: true,
      isValidating: false,
    });
  },

  updateTokens: (tokens: { accessToken: string; refreshToken: string }) => {
    updateStoredTokens(tokens);
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isAuthenticated: true,
      isValidating: false,
    });
  },

  clearSession: () => {
    clearStoredTokens();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isInitialized: true,
      isValidating: false,
    });
  },

  initialize: () => {
    if (get().isInitialized) return;

    const token = getStoredAccessToken();
    const user = getStoredUser();
    const refreshToken = getStoredRefreshToken();

    // Authenticated if user profile and either access token or refresh token is available
    if (user && (token || refreshToken)) {
      set({
        user,
        accessToken: token,
        refreshToken,
        isAuthenticated: true,
        isInitialized: true,
        isValidating: true,
      });
    } else {
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isInitialized: true,
        isValidating: false,
      });
    }
  },

  /**
   * Async session validation — called after initialize() to verify the stored
   * session against the backend. If the access token is expired, attempts a
   * silent refresh. If both tokens are invalid, clears the session gracefully.
   * This prevents the "crash on reopen" scenario where localStorage contains
   * stale tokens that cause immediate 401 cascades.
   */
  validateSession: async () => {
    const state = get();
    if (!state.isAuthenticated || !state.refreshToken) {
      set({ isValidating: false });
      return;
    }

    // Quick check: Try to fetch the user profile with current access token
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

    try {
      // First, try with the current access token
      if (state.accessToken) {
        const meResponse = await fetch(`${API_BASE_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${state.accessToken}`,
            Accept: 'application/json',
          },
        });

        if (meResponse.ok) {
          // Token is valid, session is good
          set({ isValidating: false });
          return;
        }
      }

      // Access token is expired/invalid — try refresh
      if (state.refreshToken) {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ refreshToken: state.refreshToken }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          const tokens = (data && data.data ? data.data : data) as {
            accessToken: string;
            refreshToken: string;
          };

          if (tokens?.accessToken && tokens?.refreshToken) {
            // Refresh succeeded — update stored tokens
            updateStoredTokens({
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
            });
            set({
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              isAuthenticated: true,
              isValidating: false,
            });
            return;
          }
        }
      }

      // Both access token and refresh token are invalid — clear session
      clearStoredTokens();
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isInitialized: true,
        isValidating: false,
      });
    } catch {
      // Network error — keep current session state (offline tolerance)
      // The user may be offline; don't log them out just because the network is down
      set({ isValidating: false });
    }
  },
}));
