import { create } from 'zustand';
import { AuthState, AuthTokensResponse, AuthUser } from '../types/auth.types';
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
  const isAuthenticated = !!(user && (token || refreshToken));

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

  updateTokens: (tokens: { accessToken: string; refreshToken: string }) => {
    updateStoredTokens(tokens);
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isAuthenticated: true,
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
