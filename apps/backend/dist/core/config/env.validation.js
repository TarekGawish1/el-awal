"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envSchema = void 0;
exports.validateEnv = validateEnv;
const crypto_1 = require("crypto");
const zod_1 = require("zod");
const expiryPattern = /^\d+[smhd]$/;
const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const baseEnvSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().int().min(1).max(65535).default(3000),
    CORS_ORIGINS: zod_1.z.string().optional(),
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL is required'),
    JWT_ACCESS_SECRET: zod_1.z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters').optional(),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters').optional(),
    JWT_ACCESS_EXPIRES_IN: zod_1.z.string().regex(expiryPattern, 'Use a duration such as 15m, 2h, or 7d').default('15m'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().regex(expiryPattern, 'Use a duration such as 15m, 2h, or 7d').default('7d'),
    R2_ACCOUNT_ID: zod_1.z.string().optional(),
    R2_ACCESS_KEY_ID: zod_1.z.string().optional(),
    R2_SECRET_ACCESS_KEY: zod_1.z.string().optional(),
    R2_BUCKET_NAME: zod_1.z.string().optional(),
    R2_PUBLIC_URL: zod_1.z.string().url().optional(),
    BUNNY_API_KEY: zod_1.z.string().optional(),
    BUNNY_LIBRARY_ID: zod_1.z.string().optional(),
    BUNNY_CDN_HOSTNAME: zod_1.z.string().optional(),
    BUNNY_TOKEN_SECURITY_KEY: zod_1.z.string().optional(),
    ENABLE_SWAGGER: zod_1.z.coerce.boolean().default(false),
    TRUST_PROXY: zod_1.z.coerce.boolean().default(false),
    SEED_DEMO_PASSWORD: zod_1.z.string().min(12).optional(),
});
exports.envSchema = baseEnvSchema.superRefine((env, ctx) => {
    if (env.JWT_ACCESS_SECRET && env.JWT_REFRESH_SECRET && env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
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
    ];
    for (const key of requiredProductionKeys) {
        if (!env[key]) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: [key],
                message: `${key} is required in production`,
            });
        }
    }
    const origins = (env.CORS_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    if (origins.length === 0 || origins.includes('*')) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['CORS_ORIGINS'],
            message: 'Production CORS_ORIGINS must be an explicit comma-separated allowlist',
        });
    }
    if (origins.some((origin) => localhostOriginPattern.test(origin))) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['CORS_ORIGINS'],
            message: 'Production CORS_ORIGINS cannot contain localhost origins',
        });
    }
    if (env.DATABASE_URL.includes('localhost') || env.DATABASE_URL.includes('127.0.0.1')) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['DATABASE_URL'],
            message: 'Production DATABASE_URL cannot point to localhost',
        });
    }
});
function validateEnv(config) {
    const parsed = exports.envSchema.safeParse(config);
    if (!parsed.success) {
        const errorMessages = parsed.error.issues
            .map((issue) => `[${issue.path.join('.')}] ${issue.message}`)
            .join('\n');
        throw new Error(`Environment variable validation failed:\n${errorMessages}`);
    }
    const isProduction = parsed.data.NODE_ENV === 'production';
    return {
        ...parsed.data,
        CORS_ORIGINS: parsed.data.CORS_ORIGINS ||
            (isProduction
                ? ''
                : 'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001'),
        JWT_ACCESS_SECRET: parsed.data.JWT_ACCESS_SECRET ||
            (isProduction ? '' : (0, crypto_1.randomBytes)(48).toString('base64url')),
        JWT_REFRESH_SECRET: parsed.data.JWT_REFRESH_SECRET ||
            (isProduction ? '' : (0, crypto_1.randomBytes)(48).toString('base64url')),
    };
}
//# sourceMappingURL=env.validation.js.map