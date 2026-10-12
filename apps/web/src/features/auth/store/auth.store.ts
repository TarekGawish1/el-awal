import { create } from 'zustand';
import { AuthState, AuthTokensResponse, AuthUser } from '../types/auth.types';
import {
  setStoredTokens,
  updateStoredTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredUser,
  clearStoredTokens,
  setStoredUser,
} from '../utils/auth-tokens';
import { disconnectRealtimeSocket } from '@/lib/realtime/socket';

interface AuthActions {
  setSession: (session: AuthTokensResponse) => void;
  setUser: (user: AuthUser) => void;
  updateTokens: (tokens: { accessToken: string; refreshToken?: string }) => void;
  clearSession: () => void;
  initialize: () => void;
}

export type AuthStore = AuthState & AuthActions;

const getInitialState = (): AuthState => {
  if (typeof window === 'undefined') {
    return {
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isInitialized: false,
    };
  }

  const token = getStoredAccessToken();
  const user = getStoredUser();
  const refreshToken = getStoredRefreshToken();
  // An active session is indicated if a user profile is cached or an access token is in RAM
  const isAuthenticated = !!(user || token);

  return {
    user: isAuthenticated ? user : null,
    accessToken: isAuthenticated ? token : null,
    refreshToken: isAuthenticated ? refreshToken : null,
    isAuthenticated,
    isInitialized: true,
  };
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...getInitialState(),

  setSession: (session: AuthTokensResponse) => {
    setStoredTokens(session);
    set({
      user: session.user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      isAuthenticated: true,
      isInitialized: true,
    });
  },

  setUser: (user: AuthUser) => {
    setStoredUser(user);
    set({ user });
  },

  updateTokens: (tokens: { accessToken: string; refreshToken?: string }) => {
    updateStoredTokens(tokens);
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? get().refreshToken,
      isAuthenticated: true,
    });
  },

  clearSession: () => {
    clearStoredTokens();
    // Drop the realtime socket so the closed session no longer receives pushes
    disconnectRealtimeSocket();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isInitialized: true,
    });
  },

  initialize: () => {
    const token = getStoredAccessToken();
    const user = getStoredUser();
    const refreshToken = getStoredRefreshToken();

    if (user || token) {
      set({
        user,
        accessToken: token,
        refreshToken: refreshToken || null,
        isAuthenticated: true,
        isInitialized: true,
      });

      // If in-memory access token is missing after page reload, trigger silent refresh in background
      if (!token && typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine) {
        import('@/lib/api/client').then(({ refreshAccessToken }) => {
          refreshAccessToken().catch((err) => {
            console.warn('Silent session bootstrap error:', err);
          });
        });
      }
    } else {
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isInitialized: true,
      });
    }
  },
}));
