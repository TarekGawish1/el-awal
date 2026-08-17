import { create } from 'zustand';
import { AuthState, AuthTokensResponse, AuthUser } from '../types/auth.types';
import {
  setStoredTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredUser,
  clearStoredTokens,
} from '../utils/auth-tokens';

interface AuthActions {
  setSession: (session: AuthTokensResponse) => void;
  clearSession: () => void;
  initialize: () => void;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isInitialized: false,

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

  clearSession: () => {
    clearStoredTokens();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isInitialized: true,
    });
  },

  initialize: () => {
    if (get().isInitialized) return;

    const token = getStoredAccessToken();
    const user = getStoredUser();
    const refreshToken = getStoredRefreshToken();

    if (token && user) {
      set({
        user,
        accessToken: token,
        refreshToken,
        isAuthenticated: true,
        isInitialized: true,
      });
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
