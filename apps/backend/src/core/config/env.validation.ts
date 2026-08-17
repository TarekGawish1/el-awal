import { randomBytes } from 'crypto';
import { z } from 'zod';

const expiryPattern = /^\d+[smhd]$/;
const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CORS_ORIGINS: z.string().optional(),

  // Database (PostgreSQL / Neon)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Authentication & Security
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters').optional(),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters').optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().regex(expiryPattern, 'Use a duration such as 15m, 2h, or 7d').default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().regex(expiryPattern, 'Use a duration such as 15m, 2h, or 7d').default('7d'),

  // Cloudflare R2 Storage
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  // Bunny Stream Video Cloud
  BUNNY_API_KEY: z.string().optional(),
  BUNNY_LIBRARY_ID: z.string().optional(),
  BUNNY_CDN_HOSTNAME: z.string().optional(),
  BUNNY_TOKEN_SECURITY_KEY: z.string().optional(),

  // Operational security controls
  ENABLE_SWAGGER: z.coerce.boolean().default(false),
  TRUST_PROXY: z.coerce.boolean().default(false),
  SEED_DEMO_PASSWORD: z.string().min(12).optional(),
});

export const envSchema = baseEnvSchema.superRefine((env, ctx) => {
  if (env.JWT_ACCESS_SECRET && env.JWT_REFRESH_SECRET && env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JWT_REFRESH_SECRET'],
      message: 'JWT_REFRESH_SECRET must be different from JWT_ACCESS_SECRET',
    });
  }

  if (env.NODE_ENV !== 'production') {
    return;
  }

  const requiredProductionKeys = [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'CORS_ORIGINS',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_URL',
    'BUNNY_API_KEY',
    'BUNNY_LIBRARY_ID',
    'BUNNY_CDN_HOSTNAME',
    'BUNNY_TOKEN_SECURITY_KEY',
  ] as const;

  for (const key of requiredProductionKeys) {
    if (!env[key]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} is required in production`,
      });
    }
  }

  const origins = (env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['CORS_ORIGINS'],
      message: 'Production CORS_ORIGINS must be configured with at least one origin',
    });
  }

  if (env.DATABASE_URL.includes('localhost') || env.DATABASE_URL.includes('127.0.0.1')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['DATABASE_URL'],
      message: 'Production DATABASE_URL cannot point to localhost',
    });
  }
});

export type EnvConfig = z.infer<typeof envSchema> & {
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  CORS_ORIGINS: string;
};

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const errorMessages = parsed.error.issues
      .map((issue) => `[${issue.path.join('.')}] ${issue.message}`)
      .join('\n');
    throw new Error(`Environment variable validation failed:\n${errorMessages}`);
  }

  const isProduction = parsed.data.NODE_ENV === 'production';

  return {
    ...parsed.data,
    CORS_ORIGINS:
      parsed.data.CORS_ORIGINS ||
      (isProduction
        ? ''
        : 'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001'),
    JWT_ACCESS_SECRET:
      parsed.data.JWT_ACCESS_SECRET ||
      (isProduction ? '' : randomBytes(48).toString('base64url')),
    JWT_REFRESH_SECRET:
      parsed.data.JWT_REFRESH_SECRET ||
      (isProduction ? '' : randomBytes(48).toString('base64url')),
  };
}
