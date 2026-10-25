import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { purgeServiceWorkerUserCache, clearStoredTokens } from '../utils/auth-tokens';
import fs from 'fs';
import path from 'path';

describe('SEC-17: Service Worker Cache & Session Isolation', () => {
  const swScriptPath = path.resolve(__dirname, '../../../../public/sw.js');
  let swSource: string;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    swSource = fs.readFileSync(swScriptPath, 'utf-8');
  });

  describe('1. Service Worker Source Code Security Assertions', () => {
    it('should use v14 cache versioning to invalidate legacy cached responses', () => {
      expect(swSource).toContain("const CACHE_NAME = 'el-awal-core-v14';");
      expect(swSource).toContain("const RUNTIME_CACHE = 'el-awal-runtime-v14';");
      expect(swSource).toContain("const RSC_CACHE = 'el-awal-rsc-v14';");
    });

    it('should explicitly intercept /api/ requests and prevent them from entering CacheStorage', () => {
      // Must contain SEC-17 marker and early return
      expect(swSource).toContain('SEC-17: Authenticated & Private API Isolation');
      expect(swSource).toContain("if (url.pathname.startsWith('/api/'))");
      // Must return an offline JSON 503 response without caching
      expect(swSource).toContain("'Cache-Control': 'no-store, no-cache, private, must-revalidate'");
    });

    it('should enforce strict response caching rules in isCachableResponse', () => {
      expect(swSource).toContain("u.pathname.startsWith('/api/') || u.pathname.includes('/api/v1/')");
      expect(swSource).toContain("req.headers.get('Authorization') || req.headers.get('authorization')");
      expect(swSource).toContain("cacheControl.includes('no-store')");
      expect(swSource).toContain("cacheControl.includes('private')");
      expect(swSource).toContain("cacheControl.includes('no-cache')");
      expect(swSource).toContain("pragma.includes('no-cache')");
    });

    it('should purge outdated caches on activate and clean legacy /api/ entries', () => {
      expect(swSource).toContain('caches.delete(cacheToDelete)');
      expect(swSource).toContain("u.pathname.startsWith('/api/') || u.pathname.includes('/api/v1/')");
      expect(swSource).toContain('await c.delete(req)');
    });

    it('should handle CLEAR_USER_SESSION message to wipe runtime and RSC caches', () => {
      expect(swSource).toContain("event.data.type === 'CLEAR_USER_SESSION'");
      expect(swSource).toContain('await caches.delete(RUNTIME_CACHE);');
      expect(swSource).toContain('await caches.delete(RSC_CACHE);');
    });
  });

  describe('2. Client-Side Service Worker Cache Purge & Session Boundary', () => {
    let mockPostMessage: ReturnType<typeof vi.fn>;
    let mockCacheDelete: ReturnType<typeof vi.fn>;
    let mockCacheKeys: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockPostMessage = vi.fn();
      mockCacheDelete = vi.fn().mockResolvedValue(true);
      mockCacheKeys = vi.fn().mockResolvedValue([
        'el-awal-core-v14',
        'el-awal-runtime-v14',
        'el-awal-rsc-v14',
        'other-dynamic-cache',
      ]);

      // Mock navigator.serviceWorker
      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            controller: {
              postMessage: mockPostMessage,
            },
          },
        },
        writable: true,
        configurable: true,
      });

      // Mock window.caches
      Object.defineProperty(global, 'window', {
        value: {
          caches: {
            keys: mockCacheKeys,
            delete: mockCacheDelete,
          },
          localStorage: global.localStorage,
          sessionStorage: global.sessionStorage,
        },
        writable: true,
        configurable: true,
      });
    });

    it('purgeServiceWorkerUserCache should post CLEAR_USER_SESSION to Service Worker controller', async () => {
      await purgeServiceWorkerUserCache();

      expect(mockPostMessage).toHaveBeenCalledWith({ type: 'CLEAR_USER_SESSION' });
    });

    it('purgeServiceWorkerUserCache should directly delete runtime and rsc caches, preserving core app shell', async () => {
      await purgeServiceWorkerUserCache();

      expect(mockCacheKeys).toHaveBeenCalled();
      // Must delete runtime and rsc caches
      expect(mockCacheDelete).toHaveBeenCalledWith('el-awal-runtime-v14');
      expect(mockCacheDelete).toHaveBeenCalledWith('el-awal-rsc-v14');
      // Must NOT delete static core app shell cache
      expect(mockCacheDelete).not.toHaveBeenCalledWith('el-awal-core-v14');
    });

    it('clearStoredTokens should trigger purgeServiceWorkerUserCache automatically', async () => {
      clearStoredTokens();

      // Wait a tick for async purge to initiate
      await new Promise((r) => setTimeout(r, 10));

      expect(mockPostMessage).toHaveBeenCalledWith({ type: 'CLEAR_USER_SESSION' });
      expect(mockCacheDelete).toHaveBeenCalledWith('el-awal-runtime-v14');
    });

    it('switching accounts on the same device isolates previous user cached data', async () => {
      // Simulate User 1 logging out
      clearStoredTokens();
      await purgeServiceWorkerUserCache();

      expect(mockCacheDelete).toHaveBeenCalledWith('el-awal-runtime-v14');
      expect(mockCacheDelete).toHaveBeenCalledWith('el-awal-rsc-v14');

      // Now verify caches.delete was called for all user-scoped caches
      const deletedCaches = mockCacheDelete.mock.calls.map((call) => call[0]);
      expect(deletedCaches).toContain('el-awal-runtime-v14');
      expect(deletedCaches).toContain('el-awal-rsc-v14');
      expect(deletedCaches).not.toContain('el-awal-core-v14');
    });
  });
});
