import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/teacher', '/student', '/parent', '/select-role'];

/**
 * Next.js Edge Proxy & Route Guard (Canonical Domain & SEC-14)
 * 
 * 1. Ensures all external traffic is strictly routed to the official canonical domain:
 *    https://al-awal.online
 * 2. Blocks unauthenticated server-side HTML streaming on protected dashboard routes (SEC-14),
 *    while preserving public assets, service worker, and offline workflows.
 */
export function proxy(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');

  const normalizedHost = host.toLowerCase();
  const isLocalDev =
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1') ||
    host.startsWith('0.0.0.0') ||
    host.includes('local');

  // 1. Canonical Domain Enforcement
  if (!isLocalDev) {
    const isHerokuDomain = normalizedHost.includes('herokuapp.com');
    const isWwwSubdomain = normalizedHost === 'www.al-awal.online';
    const isInsecureHttp = proto === 'http';

    if (isHerokuDomain || isWwwSubdomain || isInsecureHttp) {
      const canonicalUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, 'https://al-awal.online');
      return NextResponse.redirect(canonicalUrl, 301);
    }
  }

  // 2. Server-Side Dashboard Route Authentication Guard (SEC-14)
  const { pathname } = request.nextUrl;
  const isProtectedPath = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtectedPath) {
    const hasSessionCookie =
      request.cookies.has('refreshToken') ||
      request.cookies.has('el_awal_session') ||
      request.cookies.has('el_awal_token') ||
      Boolean(request.headers.get('authorization'));

    if (!hasSessionCookie) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt, manifest.json, sw.js
     * - image / media extensions
     */
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.json|sw\\.js|offline\\.html|.*\\.(?:jpg|jpeg|gif|png|webp|svg|ico|css|js)).*)',
  ],
};
