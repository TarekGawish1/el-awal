import { validateEnv } from '../env.validation';

describe('Environment Validation', () => {
  const validConfig = {
    DATABASE_URL: 'postgresql://postgres:password@db.example.com:5432/el_awal',
    JWT_ACCESS_SECRET: 'super-secret-access-key-minimum-32-chars-long',
    JWT_REFRESH_SECRET: 'super-secret-refresh-key-minimum-32-chars-long',
    NODE_ENV: 'production',
  };

  it('passes validation when both JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are provided', () => {
    const config = validateEnv(validConfig);
    expect(config.JWT_ACCESS_SECRET).toBe(validConfig.JWT_ACCESS_SECRET);
    expect(config.JWT_REFRESH_SECRET).toBe(validConfig.JWT_REFRESH_SECRET);
  });

  it('throws an error if JWT_ACCESS_SECRET is missing and there is no legacy JWT_SECRET', () => {
    const invalidConfig = { ...validConfig };
    delete (invalidConfig as any).JWT_ACCESS_SECRET;

    expect(() => validateEnv(invalidConfig)).toThrow('FATAL: JWT_ACCESS_SECRET is not configured');
  });

  it('throws an error if JWT_REFRESH_SECRET is missing and there is no legacy JWT_SECRET', () => {
    const invalidConfig = { ...validConfig };
    delete (invalidConfig as any).JWT_REFRESH_SECRET;

    expect(() => validateEnv(invalidConfig)).toThrow('FATAL: JWT_REFRESH_SECRET is not configured');
  });

  it('supports legacy JWT_SECRET by deriving access and refresh secrets', () => {
    const legacyConfig = {
      DATABASE_URL: validConfig.DATABASE_URL,
      JWT_SECRET: 'legacy-super-secret-key-minimum-32-chars-long',
      NODE_ENV: 'production',
    };

    const config = validateEnv(legacyConfig);
    expect(config.JWT_ACCESS_SECRET).toBe(legacyConfig.JWT_SECRET);
    expect(config.JWT_REFRESH_SECRET).toBe(`${legacyConfig.JWT_SECRET}_refresh_derived_key_2026`);
  });

  it('throws an error if secrets are provided but are less than 32 characters', () => {
    const invalidConfig = {
      ...validConfig,
      JWT_ACCESS_SECRET: 'too-short',
    };

    expect(() => validateEnv(invalidConfig)).toThrow('must be at least 32 characters');
  });
});
