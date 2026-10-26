/**
 * Evaluates whether an incoming HTTP Origin header is permitted under the hardened CORS policy.
 * Replaces overly broad wildcards (*.vercel.app, *.herokuapp.com) with exact project domains
 * and explicit allowlisting to prevent cross-tenant/cross-origin CSRF and token leakage.
 */
export function isOriginPermitted(
  origin: string,
  explicitAllowedOrigins: string[] = [],
  isDevelopment: boolean = false,
): boolean {
  if (!origin) return false;
  const normalized = origin.toLowerCase().trim();

  // 1. Explicitly configured origins from CORS_ORIGINS
  if (explicitAllowedOrigins.includes(normalized)) {
    return true;
  }

  // 2. Production platform domain and subdomains (al-awal.online)
  if (/^https:\/\/(.*\.)?al-awal\.online$/i.test(normalized)) {
    return true;
  }

  // 3. El Awal Vercel deployment preview and production domains
  if (/^https:\/\/([a-zA-Z0-9_-]*el-awal[a-zA-Z0-9_-]*)\.vercel\.app$/i.test(normalized)) {
    return true;
  }

  // 4. El Awal Heroku deployment domains (for Swagger/OpenAPI interactive tests)
  if (/^https:\/\/(al-awal|el-awal)(-[a-zA-Z0-9_-]+)?\.herokuapp\.com$/i.test(normalized)) {
    return true;
  }

  // 5. Localhost and 127.0.0.1 for development environments only
  if (isDevelopment && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized)) {
    return true;
  }

  return false;
}
