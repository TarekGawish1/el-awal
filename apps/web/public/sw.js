/**
 * Service Worker for El-Awal PWA
 * Platform: Next.js 14 Web App
 * Features:
 * - App Shell caching for full offline SPA hydration
 * - Offline navigation fallback to cached root / login / offline shell
 * - Support for mobile network IP testing (e.g. 192.168.x.x)
 */

const CACHE_NAME = 'el-awal-core-v4';
const RUNTIME_CACHE = 'el-awal-runtime-v4';

// Critical App Shell assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/login',
  '/offline.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/icon.svg',
  '/icons/icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/apple-touch-icon.png',
  '/favicon.ico',
  '/favicon.svg',
];

// 1. Install Event: Pre-cache core shell & offline page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        for (const url of PRECACHE_URLS) {
          try {
            await cache.add(url);
          } catch (err) {
            console.warn('[SW] Failed to precache:', url, err);
          }
        }
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Pre-cache error on install:', err);
      }),
  );
});

// 2. Activate Event: Clean up outdated caches and claim clients immediately
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return cacheNames.filter((cacheName) => !currentCaches.includes(cacheName));
      })
      .then((cachesToDelete) => {
        return Promise.all(
          cachesToDelete.map((cacheToDelete) => caches.delete(cacheToDelete)),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// 3. Fetch Event: Intelligent multi-strategy caching with App Shell fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (e.g. POST, PUT, DELETE handled by TanStack Query & Outbox Engine)
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension, non-http protocols
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Skip Next.js hot module reloading & development webpack internals
  if (
    url.pathname.includes('/_next/webpack-hmr') ||
    url.pathname.includes('/_next/static/webpack/') ||
    url.pathname.includes('/api/auth/session')
  ) {
    return;
  }

  // Strategy A: HTML Navigation Requests (Network First -> Cache -> App Shell Fallback)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          // 1. Try exact requested route from runtime or core cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }

          // 2. Fall back to cached App Shell document so Next.js client router mounts offline
          const appShell = (await caches.match('/')) || (await caches.match('/login'));
          if (appShell) {
            return appShell;
          }

          // 3. Final fallback: standalone offline page
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) {
            return offlinePage;
          }

          return new Response('Offline - Platform El-Awal', {
            status: 503,
            statusText: 'Offline',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }),
    );
    return;
  }

  // Strategy B: Static Assets (_next/static, fonts, icons, images, manifests) -> Cache-First / Stale-While-Revalidate
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/favicon') ||
    url.pathname.includes('manifest') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.webmanifest') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'manifest';

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Revalidate in background if online
          if (navigator.onLine) {
            fetch(request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, networkResponse));
                }
              })
              .catch(() => {});
          }
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
            }
            return networkResponse;
          })
          .catch(async () => {
            // Fallback for icons/manifests
            if (url.pathname.includes('manifest')) {
              const cachedManifest = (await caches.match('/manifest.webmanifest')) || (await caches.match('/manifest.json'));
              if (cachedManifest) return cachedManifest;
            }
            if (url.pathname.endsWith('.svg') || url.pathname.endsWith('.png')) {
              const cachedIcon = (await caches.match('/favicon.svg')) || (await caches.match('/icons/icon.svg')) || (await caches.match('/icon.svg'));
              if (cachedIcon) return cachedIcon;
            }
            return new Response('', { status: 408, statusText: 'Request timed out' });
          });
      }),
    );
    return;
  }

  // Skip cross-origin API calls (handled directly by React Query & Offline Sync Engine)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Strategy C: Other GET requests (Same-origin Next.js RSC prefetch / dynamic routes) -> Network First with dynamic cache & safe fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        // If RSC prefetch request, return cached app shell or empty payload to prevent client-side routing crash
        if (url.search.includes('_rsc=')) {
          const appShell = (await caches.match('/')) || (await caches.match('/login'));
          if (appShell) return appShell;
        }

        return new Response(JSON.stringify({ error: 'Network error or resource unavailable offline' }), {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' },
        });
      }),
  );
});

// Listen for message to skip waiting when updated
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
