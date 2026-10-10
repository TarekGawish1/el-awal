import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Canonical Domain Enforcement Middleware
 * 
 * Ensures all external traffic is strictly routed to the official canonical domain:
 * https://al-awal.online
 * 
 * Intercepts:
 * 1. Direct Heroku default app domains (*.herokuapp.com)
 * 2. Unaliased www subdomain (www.al-awal.online)
 * 3. Insecure HTTP requests (forwarded via Heroku / Cloudflare)
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');

  // Bypass for local development and private loopback addresses
  if (
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1') ||
    host.startsWith('0.0.0.0') ||
    host.includes('local')
  ) {
    return NextResponse.next();
  }

  const normalizedHost = host.toLowerCase();
  const isHerokuDomain = normalizedHost.includes('herokuapp.com');
  const isWwwSubdomain = normalizedHost === 'www.al-awal.online';
  const isInsecureHttp = proto === 'http';

  if (isHerokuDomain || isWwwSubdomain || isInsecureHttp) {
    const canonicalUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, 'https://al-awal.online');
    return NextResponse.redirect(canonicalUrl, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt, manifest files
     * - image / media extensions
     */
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:jpg|jpeg|gif|png|webp|svg|ico)).*)',
  ],
};
