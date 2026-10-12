import { shouldRedirectToCanonicalPlatform } from './canonical-redirect.util';

describe('shouldRedirectToCanonicalPlatform', () => {
  describe('API Subdomain Requests (api.al-awal.online)', () => {
    it('should NOT redirect GET / on api.al-awal.online', () => {
      expect(shouldRedirectToCanonicalPlatform('api.al-awal.online', 'GET', '/')).toBe(false);
    });

    it('should NOT redirect GET /health on api.al-awal.online', () => {
      expect(shouldRedirectToCanonicalPlatform('api.al-awal.online', 'GET', '/health')).toBe(false);
    });

    it('should NOT redirect GET /api/v1/health on api.al-awal.online', () => {
      expect(shouldRedirectToCanonicalPlatform('api.al-awal.online', 'GET', '/api/v1/health')).toBe(false);
    });

    it('should NOT redirect GET /api/v1/unknown-endpoint on api.al-awal.online', () => {
      expect(shouldRedirectToCanonicalPlatform('api.al-awal.online', 'GET', '/api/v1/unknown-endpoint')).toBe(false);
    });

    it('should NOT redirect GET /unknown-endpoint on api.al-awal.online', () => {
      expect(shouldRedirectToCanonicalPlatform('api.al-awal.online', 'GET', '/unknown-endpoint')).toBe(false);
    });

    it('should handle ports gracefully on api.al-awal.online:443', () => {
      expect(shouldRedirectToCanonicalPlatform('api.al-awal.online:443', 'GET', '/')).toBe(false);
    });

    it('should handle multi-proxy x-forwarded-host headers', () => {
      expect(shouldRedirectToCanonicalPlatform('api.al-awal.online, 192.168.1.1', 'GET', '/')).toBe(false);
    });
  });

  describe('Raw Heroku Domain Requests (*.herokuapp.com)', () => {
    const rawHerokuHost = 'al-awal-cbe2188d9efa.herokuapp.com';

    it('should redirect GET / on raw Heroku domain', () => {
      expect(shouldRedirectToCanonicalPlatform(rawHerokuHost, 'GET', '/')).toBe(true);
    });

    it('should redirect GET /login on raw Heroku domain', () => {
      expect(shouldRedirectToCanonicalPlatform(rawHerokuHost, 'GET', '/login')).toBe(true);
    });

    it('should redirect GET /courses/123 on raw Heroku domain', () => {
      expect(shouldRedirectToCanonicalPlatform(rawHerokuHost, 'GET', '/courses/123')).toBe(true);
    });

    it('should NOT redirect GET /api/v1/health on raw Heroku domain', () => {
      expect(shouldRedirectToCanonicalPlatform(rawHerokuHost, 'GET', '/api/v1/health')).toBe(false);
    });

    it('should NOT redirect GET /api/v1/auth/login on raw Heroku domain', () => {
      expect(shouldRedirectToCanonicalPlatform(rawHerokuHost, 'GET', '/api/v1/auth/login')).toBe(false);
    });

    it('should NOT redirect /socket.io requests on raw Heroku domain', () => {
      expect(shouldRedirectToCanonicalPlatform(rawHerokuHost, 'GET', '/socket.io/')).toBe(false);
    });

    it('should NOT redirect non-GET methods on raw Heroku domain (e.g. POST /auth/login)', () => {
      expect(shouldRedirectToCanonicalPlatform(rawHerokuHost, 'POST', '/auth/login')).toBe(false);
      expect(shouldRedirectToCanonicalPlatform(rawHerokuHost, 'HEAD', '/')).toBe(false);
      expect(shouldRedirectToCanonicalPlatform(rawHerokuHost, 'OPTIONS', '/')).toBe(false);
    });

    it('should handle raw Heroku domain with port (*.herokuapp.com:443)', () => {
      expect(shouldRedirectToCanonicalPlatform(`${rawHerokuHost}:443`, 'GET', '/login')).toBe(true);
    });
  });

  describe('Localhost & Development Environments', () => {
    it('should NOT redirect on localhost:3000', () => {
      expect(shouldRedirectToCanonicalPlatform('localhost:3000', 'GET', '/')).toBe(false);
      expect(shouldRedirectToCanonicalPlatform('localhost:3000', 'GET', '/health')).toBe(false);
    });

    it('should NOT redirect on 127.0.0.1:4000', () => {
      expect(shouldRedirectToCanonicalPlatform('127.0.0.1:4000', 'GET', '/')).toBe(false);
    });
  });

  describe('Edge cases and malformed inputs', () => {
    it('should return false for missing or null arguments', () => {
      expect(shouldRedirectToCanonicalPlatform(null, 'GET', '/')).toBe(false);
      expect(shouldRedirectToCanonicalPlatform('example.com', null, '/')).toBe(false);
      expect(shouldRedirectToCanonicalPlatform('example.com', 'GET', null)).toBe(false);
      expect(shouldRedirectToCanonicalPlatform('', '', '')).toBe(false);
    });
  });
});
