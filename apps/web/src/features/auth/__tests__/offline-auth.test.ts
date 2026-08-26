import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  saveOfflineCredentials,
  verifyOfflineLogin,
  getOfflineCredentials,
  hashPasswordWithSalt,
  normalizeIdentifier,
  pureJsSha256,
  getIdentifierVariations,
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

  it('pureJsSha256 produces exact FIPS 180-4 standard cryptographic hashes', () => {
    expect(pureJsSha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(pureJsSha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(pureJsSha256('hello world')).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  it('normalizes Egyptian phone numbers and identifier variations accurately', () => {
    expect(normalizeIdentifier('+201012345678')).toBe('01012345678');
    expect(normalizeIdentifier('00201012345678')).toBe('01012345678');
    expect(normalizeIdentifier('201012345678')).toBe('01012345678');
    expect(normalizeIdentifier('010-1234-5678')).toBe('01012345678');
    expect(normalizeIdentifier(' 010 1234 5678 ')).toBe('01012345678');
    expect(normalizeIdentifier('User@Domain.COM ')).toBe('user@domain.com');

    const vars = getIdentifierVariations('01012345678');
    expect(vars).toContain('01012345678');
    expect(vars).toContain('+201012345678');
    expect(vars).toContain('201012345678');
  });

  it('securely stores salted hash and retrieves credentials across phone formats', async () => {
    await saveOfflineCredentials('teacher@elawal.com', 'SecretPassword123', mockSession);

    const creds = await getOfflineCredentials('teacher@elawal.com');
    expect(creds).not.toBeNull();
    expect(creds?.identifier).toBe('teacher@elawal.com');
    expect(creds?.user.fullName).toBe('أستاذ محمد علي');
    expect(creds?.salt).toBeDefined();
    expect(creds?.hash).toBeDefined();

    // Verify lookup by national phone format
    const credsByPhone = await getOfflineCredentials('01012345678');
    expect(credsByPhone).not.toBeNull();
    expect(credsByPhone?.user.id).toBe('teacher-user-1');

    // Verify lookup by international format with +20
    const credsByIntlPhone = await getOfflineCredentials('+201012345678');
    expect(credsByIntlPhone).not.toBeNull();
    expect(credsByIntlPhone?.user.id).toBe('teacher-user-1');
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

  it('authenticates offline via phone variations seamlessly', async () => {
    await saveOfflineCredentials('01012345678', 'SecretPassword123', mockSession);

    const verified = await verifyOfflineLogin({
      identifier: '+20 101 234 5678',
      password: 'SecretPassword123',
    });

    expect(verified.user.id).toBe('teacher-user-1');
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
    ).rejects.toThrow('بيانات الدخول غير مسجلة للعمل بدون إنترنت على هذا الجهاز');
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
