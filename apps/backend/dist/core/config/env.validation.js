"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envSchema = void 0;
exports.validateEnv = validateEnv;
const zod_1 = require("zod");
exports.envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().default(3000),
    CORS_ORIGINS: zod_1.z.string().default('*'),
    DATABASE_URL: zod_1.z.string().default('postgresql://postgres:postgres@localhost:5432/el_awal_db?schema=public'),
    JWT_SECRET: zod_1.z.string().min(16, 'JWT_SECRET must be at least 16 characters').default('super-secret-default-jwt-key-change-in-prod'),
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    R2_ACCOUNT_ID: zod_1.z.string().optional().default('mock-account-id'),
    R2_ACCESS_KEY_ID: zod_1.z.string().optional().default('mock-access-key'),
    R2_SECRET_ACCESS_KEY: zod_1.z.string().optional().default('mock-secret-key'),
    R2_BUCKET_NAME: zod_1.z.string().optional().default('el-awal-assets'),
    R2_PUBLIC_URL: zod_1.z.string().optional().default('https://assets.elawal.com'),
    BUNNY_API_KEY: zod_1.z.string().optional().default('mock-bunny-api-key'),
    BUNNY_LIBRARY_ID: zod_1.z.string().optional().default('12345'),
    BUNNY_CDN_HOSTNAME: zod_1.z.string().optional().default('vz-12345.b-cdn.net'),
    BUNNY_TOKEN_SECURITY_KEY: zod_1.z.string().optional().default('mock-token-key'),
});
function validateEnv(config) {
    const parsed = exports.envSchema.safeParse(config);
    if (!parsed.success) {
        const errorMessages = parsed.error.issues
            .map((issue) => `[${issue.path.join('.')}] ${issue.message}`)
            .join('\n');
        throw new Error(`❌ Environment variable validation failed:\n${errorMessages}`);
    }
    return parsed.data;
}
//# sourceMappingURL=env.validation.js.map