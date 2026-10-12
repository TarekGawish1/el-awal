/**
 * Canonical Platform Redirection Utility
 *
 * Determines whether an incoming request to the backend service should be redirected
 * to the canonical frontend web application.
 *
 * Rules:
 * 1. Only requests arriving on raw Heroku deployment hostnames (*.herokuapp.com) are redirected.
 * 2. Dedicated API hostnames (e.g. api.al-awal.online) must NEVER be redirected.
 * 3. API endpoints (/api/*) and realtime sockets (/socket.io/*) must NEVER be redirected.
 * 4. Non-GET methods (POST, PUT, DELETE, PATCH, OPTIONS, HEAD) must NEVER be redirected.
 */
export function shouldRedirectToCanonicalPlatform(
  hostHeader: string | undefined | null,
  method: string | undefined | null,
  path: string | undefined | null,
): boolean {
  if (!hostHeader || !method || !path) {
    return false;
  }

  // Only GET requests are eligible for canonical navigation redirection
  if (method.toUpperCase() !== 'GET') {
    return false;
  }

  // Normalize host: strip multiple forwarded proxy entries and port numbers
  const firstHost = hostHeader.split(',')[0].trim();
  const normalizedHost = firstHost.split(':')[0].trim().toLowerCase();

  // Only raw Heroku platform domains (*.herokuapp.com) are eligible
  const isRawHerokuDomain = normalizedHost.endsWith('herokuapp.com');
  if (!isRawHerokuDomain) {
    return false;
  }

  // Preserve API and WebSocket routes on all hosts
  const isApiRoute = path.startsWith('/api');
  const isSocketRoute = path.startsWith('/socket.io');

  if (isApiRoute || isSocketRoute) {
    return false;
  }

  return true;
}
