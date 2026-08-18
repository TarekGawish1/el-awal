import { describe, it, expect, beforeEach } from 'vitest';
import {
  setStoredTokens,
  updateStoredTokens,
  hasStoredSession,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredUser,
  clearStoredTokens,
} from '../utils/auth-tokens';
import { AuthTokensResponse } from '../types/auth.types';

describe('Auth Tokens Storage Utilities', () => {
  const mockSession: AuthTokensResponse = {
    accessToken: 'mock-access-jwt-token',
    refreshToken: 'mock-refresh-jwt-token',
    tokenType: 'Bearer',
    expiresIn: 900,
    user: {
      id: 'usr-1234-uuid',
      fullName: 'أحمد محمود',
      email: 'teacher@elawal.com',
      phone: '+201012345678',
      role: 'TEACHER',
      teacherProfileId: 'tch-5678-uuid',
    },
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('should store and retrieve access token, refresh token, and user profile', () => {
    setStoredTokens(mockSession);

    expect(getStoredAccessToken()).toBe('mock-access-jwt-token');
    expect(getStoredRefreshToken()).toBe('mock-refresh-jwt-token');
    expect(getStoredUser()).toEqual(mockSession.user);
  });

  it('should clear stored tokens from localStorage upon logout', () => {
    setStoredTokens(mockSession);
    expect(getStoredAccessToken()).toBe('mock-access-jwt-token');

    clearStoredTokens();

    expect(getStoredAccessToken()).toBeNull();
    expect(getStoredRefreshToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it('should update access and refresh tokens without altering stored user profile', () => {
    setStoredTokens(mockSession);

    updateStoredTokens({
      accessToken: 'new-access-jwt-token',
      refreshToken: 'new-refresh-jwt-token',
    });

    expect(getStoredAccessToken()).toBe('new-access-jwt-token');
    expect(getStoredRefreshToken()).toBe('new-refresh-jwt-token');
    expect(getStoredUser()).toEqual(mockSession.user);
  });

  it('should correctly detect if session exists in storage', () => {
    expect(hasStoredSession()).toBe(false);

    setStoredTokens(mockSession);
    expect(hasStoredSession()).toBe(true);

    clearStoredTokens();
    expect(hasStoredSession()).toBe(false);
  });
});
