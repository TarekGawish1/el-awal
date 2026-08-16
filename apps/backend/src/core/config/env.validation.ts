import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGINS: z.string().default('*'),

  // Database (PostgreSQL / Neon)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Authentication & Security
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters').default('super-secret-default-jwt-key-change-in-prod'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Cloudflare R2 Storage
  R2_ACCOUNT_ID: z.string().optional().default('mock-account-id'),
  R2_ACCESS_KEY_ID: z.string().optional().default('mock-access-key'),
  R2_SECRET_ACCESS_KEY: z.string().optional().default('mock-secret-key'),
  R2_BUCKET_NAME: z.string().optional().default('el-awal-assets'),
  R2_PUBLIC_URL: z.string().optional().default('https://assets.elawal.com'),

  // Bunny Stream Video Cloud
  BUNNY_API_KEY: z.string().optional().default('mock-bunny-api-key'),
  BUNNY_LIBRARY_ID: z.string().optional().default('12345'),
  BUNNY_CDN_HOSTNAME: z.string().optional().default('vz-12345.b-cdn.net'),
  BUNNY_TOKEN_SECURITY_KEY: z.string().optional().default('mock-token-key'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const errorMessages = parsed.error.issues
      .map((issue) => `[${issue.path.join('.')}] ${issue.message}`)
      .join('\n');
    throw new Error(`❌ Environment variable validation failed:\n${errorMessages}`);
  }

  return parsed.data;
}
