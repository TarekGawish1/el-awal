import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  saveOfflineCredentials,
  verifyOfflineLogin,
  getOfflineCredentials,
  hashPasswordWithSalt,
} from '../utils/offline-auth';
import { loginUser } from '../api/auth.api';
import { AuthTokensResponse } from '../types/auth.types';
import { ApiError } from '@/lib/api/errors';

describe('Offline Authentication & Credentials Vault', () => {
  const mockSession: AuthTokensResponse = {
    accessToken: 'test-access-token-123',
    refreshToken: 'test-refresh-token-456',
    tokenType: 'Bearer',
    expiresIn: 900,
    user: {
      id: 'teacher-user-1',
      fullName: 'أستاذ محمد علي',
      email: 'teacher@elawal.com',
      phone: '01012345678',
      role: 'TEACHER',
    },
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('securely stores salted hash and retrieves credentials', async () => {
    await saveOfflineCredentials('teacher@elawal.com', 'SecretPassword123', mockSession);

    const creds = getOfflineCredentials('teacher@elawal.com');
    expect(creds).not.toBeNull();
    expect(creds?.identifier).toBe('teacher@elawal.com');
    expect(creds?.user.fullName).toBe('أستاذ محمد علي');
    expect(creds?.salt).toBeDefined();
    expect(creds?.hash).toBeDefined();

    // Verify lookup by phone also works
    const credsByPhone = getOfflineCredentials('01012345678');
    expect(credsByPhone).not.toBeNull();
    expect(credsByPhone?.user.id).toBe('teacher-user-1');
  });

  it('authenticates offline when password matches salted hash', async () => {
    await saveOfflineCredentials('teacher@elawal.com', 'SecretPassword123', mockSession);

    const verified = await verifyOfflineLogin({
      identifier: 'Teacher@ElAwal.com', // Case insensitive test
      password: 'SecretPassword123',
    });

    expect(verified.user.id).toBe('teacher-user-1');
    expect(verified.accessToken).toBe('test-access-token-123');
    expect(verified.refreshToken).toBe('test-refresh-token-456');
  });

  it('rejects offline login when password is incorrect', async () => {
    await saveOfflineCredentials('teacher@elawal.com', 'SecretPassword123', mockSession);

    await expect(
      verifyOfflineLogin({
        identifier: 'teacher@elawal.com',
        password: 'WrongPassword',
      }),
    ).rejects.toThrow('كلمة المرور غير صحيحة');
  });

  it('rejects offline login if account was never logged in online before on this device', async () => {
    await expect(
      verifyOfflineLogin({
        identifier: 'unknown@elawal.com',
        password: 'SomePassword',
      }),
    ).rejects.toThrow('لم يتم تسجيل الدخول من هذا الجهاز مسبقاً');
  });

  it('loginUser transparently resolves offline when navigator.onLine is false', async () => {
    await saveOfflineCredentials('teacher@elawal.com', 'MyPassword', mockSession);

    // Mock offline state
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    const result = await loginUser({
      identifier: 'teacher@elawal.com',
      password: 'MyPassword',
    });

    expect(result.user.fullName).toBe('أستاذ محمد علي');
    expect(result.accessToken).toBe('test-access-token-123');
  });
});
