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

  // Web Push (VAPID)
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default('mailto:admin@elawal.com'),

  // WhatsApp (Baileys & Anti-Ban Rate Limiting)
  WHATSAPP_ENABLED: z.string().optional().default('true'),
  WHATSAPP_HOURLY_LIMIT: z.string().optional().default('25'),
  WHATSAPP_DAILY_LIMIT: z.string().optional().default('80'),

  // Frontend app URL (used for push notification deep links)
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
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
  const normalizedConfig = { ...config };
  const isProduction = normalizedConfig.NODE_ENV === 'production';

  // Backward compatibility: If JWT_SECRET is provided, derive access and refresh secrets if not explicitly set
  if (normalizedConfig.JWT_SECRET && typeof normalizedConfig.JWT_SECRET === 'string') {
    if (!normalizedConfig.JWT_ACCESS_SECRET) {
      normalizedConfig.JWT_ACCESS_SECRET = normalizedConfig.JWT_SECRET;
    }
    if (!normalizedConfig.JWT_REFRESH_SECRET) {
      normalizedConfig.JWT_REFRESH_SECRET = `${normalizedConfig.JWT_SECRET}_refresh_derived_key_2026`;
    }
  }

  // JWT secrets MUST be stable and persistent across restarts/deploys. If they are not,
  // every restart re-signs tokens with a new key, so all existing access AND refresh
  // tokens fail verification and every user is forced to log in again.
  //
  // In production we therefore REQUIRE explicit secrets and fail fast when they are
  // missing — we never silently fall back to a random value (which rotates on every
  // boot) or to a hardcoded constant (a signing secret committed to the repo, which
  // would let anyone forge tokens for any user). Outside production we use a fixed,
  // clearly-labelled dev secret so local development works without setup and does not
  // log you out on hot restarts.
  if (!normalizedConfig.JWT_ACCESS_SECRET || !normalizedConfig.JWT_REFRESH_SECRET) {
    if (isProduction) {
      throw new Error(
        'Missing JWT secrets in production. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET ' +
          '(each at least 32 characters and different from each other) as persistent ' +
          'environment variables so user sessions survive restarts and deploys. ' +
          'You may instead set a single strong JWT_SECRET. Generate a secret with: ' +
          'node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
      );
    }
    if (!normalizedConfig.JWT_ACCESS_SECRET) {
      normalizedConfig.JWT_ACCESS_SECRET = 'dev-only-el-awal-access-secret-change-me-000000000000';
    }
    if (!normalizedConfig.JWT_REFRESH_SECRET) {
      normalizedConfig.JWT_REFRESH_SECRET = 'dev-only-el-awal-refresh-secret-change-me-000000000000';
    }
  }

  if (!normalizedConfig.CORS_ORIGINS) {
    normalizedConfig.CORS_ORIGINS = '*';
  }

  const parsed = envSchema.safeParse(normalizedConfig);

  if (!parsed.success) {
    const errorMessages = parsed.error.issues
      .map((issue) => `[${issue.path.join('.')}] ${issue.message}`)
      .join('\n');
    throw new Error(`Environment variable validation failed:\n${errorMessages}`);
  }

  return {
    ...parsed.data,
    CORS_ORIGINS: (parsed.data.CORS_ORIGINS as string) || '*',
    JWT_ACCESS_SECRET: parsed.data.JWT_ACCESS_SECRET as string,
    JWT_REFRESH_SECRET: parsed.data.JWT_REFRESH_SECRET as string,
  };
}
