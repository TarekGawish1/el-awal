import { describe, it, expect } from 'vitest';
import { proxy } from '../proxy';
import { NextRequest } from 'next/server';

describe('Next.js Edge Proxy & Route Guard (SEC-14 & Canonical Domain)', () => {
  it('redirects unauthenticated requests on protected routes to /login', () => {
    const req = new NextRequest('https://al-awal.online/teacher/dashboard', {
      headers: { host: 'al-awal.online' },
    });

    const response = proxy(req);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://al-awal.online/login?redirect=%2Fteacher%2Fdashboard');
  });

  it('allows access to protected routes when refreshToken cookie is present', () => {
    const req = new NextRequest('https://al-awal.online/student/dashboard', {
      headers: {
        host: 'al-awal.online',
        cookie: 'refreshToken=valid-mock-token',
      },
    });

    const response = proxy(req);
    // NextResponse.next() returns a response with status 200 or x-middleware-next
    expect(response.headers.get('location')).toBeNull();
  });

  it('allows public routes unconditionally', () => {
    const publicPaths = ['/login', '/register', '/privacy', '/terms', '/landing'];
    for (const path of publicPaths) {
      const req = new NextRequest(`https://al-awal.online${path}`, {
        headers: { host: 'al-awal.online' },
      });
      const response = proxy(req);
      expect(response.headers.get('location')).toBeNull();
    }
  });

  it('redirects insecure or non-canonical herokuapp.com hosts to https://al-awal.online', () => {
    const req = new NextRequest('http://al-awal.herokuapp.com/teacher/dashboard', {
      headers: {
        host: 'al-awal.herokuapp.com',
        'x-forwarded-host': 'al-awal.herokuapp.com',
        'x-forwarded-proto': 'http',
      },
    });

    const response = proxy(req);
    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('https://al-awal.online/teacher/dashboard');
  });
});
