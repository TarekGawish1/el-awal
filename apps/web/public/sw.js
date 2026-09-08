/**
 * Service Worker for El-Awal PWA
 * Platform: Next.js 14 Web App (App Router)
 * Features:
 * - App Shell caching for full offline SPA hydration
 * - Dedicated Next.js App Router RSC (?_rsc= / RSC: 1) offline handling
 * - Pre-caching all teacher, student, and parent dashboard routes & RSC flight payloads
 * - Safe chunk fallback preventing fatal ChunkLoadErrors offline
 * - Zero-redirect offline subpage navigation
 */

const CACHE_NAME = 'el-awal-core-v8';
const RUNTIME_CACHE = 'el-awal-runtime-v8';
const RSC_CACHE = 'el-awal-rsc-v8';

// Maximum entries allowed in dynamic caches to prevent device storage bloating
const MAX_RUNTIME_ITEMS = 60;
const MAX_RSC_ITEMS = 30;
const MAX_CACHABLE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB guard

/**
 * Trim cache to maxItems using FIFO eviction
 */
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      const itemsToDelete = keys.slice(0, keys.length - maxItems);
      await Promise.all(itemsToDelete.map((key) => cache.delete(key)));
    }
  } catch (err) {
    console.debug('[SW] Cache trim notice:', err);
  }
}

/**
 * Validates if response is safe and within size bounds to cache
 */
function isCachableResponse(response) {
  if (!response || response.status !== 200) return false;
  const len = response.headers.get('content-length');
  if (len && parseInt(len, 10) > MAX_CACHABLE_SIZE_BYTES) {
    return false;
  }
  return true;
}

// Critical App Shell assets and core dashboard routes to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/login',
  '/teacher/dashboard',
  '/teacher/groups',
  '/teacher/schedules',
  '/teacher/attendance',
  '/teacher/students',
  '/teacher/assessments',
  '/teacher/content',
  '/teacher/finance',
  '/student/dashboard',
  '/student/courses',
  '/student/attendance',
  '/student/assessments',
  '/student/payments',
  '/parent/dashboard',
  '/parent-access',
  '/register/student',
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
  '/wasm/zxing_reader.wasm',
];

// Core routes whose RSC payloads should also be pre-cached for instant client-side routing
const PRECACHE_RSC_ROUTES = [
  '/teacher/dashboard',
  '/teacher/students',
  '/teacher/groups',
  '/teacher/schedules',
  '/teacher/attendance',
  '/teacher/finance',
  '/teacher/assessments',
  '/teacher/content',
  '/student/dashboard',
  '/parent/dashboard',
];

// 1. Install Event: Pre-cache core shell, offline page, and RSC payloads
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const coreCache = await caches.open(CACHE_NAME);
      const rscCache = await caches.open(RSC_CACHE);

      // Pre-cache static shell URLs
      for (const url of PRECACHE_URLS) {
        try {
          await coreCache.add(url);
        } catch (err) {
          console.debug('[SW] Precache notice:', url, err);
        }
      }

      // Pre-cache RSC payloads for dashboard routes
      for (const route of PRECACHE_RSC_ROUTES) {
        try {
          const rscRequest = new Request(`${route}?_rsc=init`, {
            headers: { RSC: '1', 'Next-Router-Prefetch': '1' },
          });
          const response = await fetch(rscRequest);
          if (response && response.ok) {
            await rscCache.put(rscRequest, response.clone());
            // Also store under normalized route key
            const normalizedReq = new Request(route, { headers: { RSC: '1' } });
            await rscCache.put(normalizedReq, response);
          }
        } catch (err) {
          console.debug('[SW] RSC precache notice:', route, err);
        }
      }
    })()
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Pre-cache error on install:', err);
      }),
  );
});

// 2. Activate Event: Clean up outdated caches and claim clients immediately
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE, RSC_CACHE];
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

// 3. Fetch Event: Intelligent multi-strategy caching with App Shell & RSC safety
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (handled by TanStack Query & Outbox Engine)
  if (request.method !== 'GET') {
    return;
  }

  // Skip non-http protocols
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

  // Identify Next.js React Server Component (RSC) requests
  const isRscRequest =
    request.headers.get('RSC') === '1' ||
    request.headers.get('Next-Router-Prefetch') === '1' ||
    request.headers.get('Next-Router-State-Tree') !== null ||
    url.searchParams.has('_rsc') ||
    url.search.includes('_rsc=') ||
    url.pathname.includes('/_next/data/');

  // =========================================================================
  // Strategy A: Next.js App Router RSC Fetch Requests
  // =========================================================================
  if (isRscRequest) {
    event.respondWith(
      (async () => {
        const rscCache = await caches.open(RSC_CACHE);
        const runtimeCache = await caches.open(RUNTIME_CACHE);

        // 1. If online, fetch from network and cache
        if (navigator.onLine) {
          try {
            const networkResponse = await fetch(request);
            if (networkResponse && networkResponse.status === 200) {
              const contentType = networkResponse.headers.get('content-type') || '';
              // Only cache actual RSC flight payloads, not unexpected HTML redirects
              if (!contentType.includes('text/html') && isCachableResponse(networkResponse)) {
                await rscCache.put(request, networkResponse.clone());
                // Also cache by normalized pathname without query params
                const normalizedReq = new Request(url.pathname, { headers: { RSC: '1' } });
                await rscCache.put(normalizedReq, networkResponse.clone());
                trimCache(RSC_CACHE, MAX_RSC_ITEMS);
              }
            }
            return networkResponse;
          } catch (fetchErr) {
            console.debug('[SW] RSC network fetch failed, falling back to cache:', fetchErr);
          }
        }

        // 2. Offline: Try exact request match in RSC and Runtime caches
        const cachedExact = (await rscCache.match(request)) || (await runtimeCache.match(request));
        if (cachedExact) {
          const contentType = cachedExact.headers.get('content-type') || '';
          if (!contentType.includes('text/html')) {
            return cachedExact;
          }
        }

        // 3. Offline: Try normalized pathname match with RSC header
        const normalizedReq = new Request(url.pathname, { headers: { RSC: '1' } });
        const cachedNormalized = await rscCache.match(normalizedReq);
        if (cachedNormalized) {
          const contentType = cachedNormalized.headers.get('content-type') || '';
          if (!contentType.includes('text/html')) {
            return cachedNormalized;
          }
        }

        // 4. Dynamic subpage fallback: If navigating to /teacher/students/[id] or /teacher/groups/[id],
        // match parent list route RSC payload if available
        if (url.pathname.startsWith('/teacher/students/')) {
          const studentParentReq = new Request('/teacher/students', { headers: { RSC: '1' } });
          const studentRsc = await rscCache.match(studentParentReq);
          if (studentRsc) return studentRsc;
        }

        if (url.pathname.startsWith('/teacher/groups/')) {
          const groupParentReq = new Request('/teacher/groups', { headers: { RSC: '1' } });
          const groupRsc = await rscCache.match(groupParentReq);
          if (groupRsc) return groupRsc;
        }

        if (url.pathname.startsWith('/teacher/assessments/')) {
          const assessParentReq = new Request('/teacher/assessments', { headers: { RSC: '1' } });
          const assessRsc = await rscCache.match(assessParentReq);
          if (assessRsc) return assessRsc;
        }

        // 5. Fall back to root dashboard RSC if available
        const dashboardRsc = await rscCache.match(new Request('/teacher/dashboard', { headers: { RSC: '1' } }));
        if (dashboardRsc) {
          return dashboardRsc;
        }

        // 6. Return safe non-error empty response with text/x-component header
        return new Response('', {
          status: 200,
          headers: {
            'Content-Type': 'text/x-component; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Nextjs-Offline-RSC': '1',
          },
        });
      })(),
    );
    return;
  }

  // =========================================================================
  // Strategy B: Full HTML Document Navigation Requests (request.mode === 'navigate')
  // =========================================================================
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const runtimeCache = await caches.open(RUNTIME_CACHE);
        const coreCache = await caches.open(CACHE_NAME);

        // 1. Try network first if online
        if (navigator.onLine) {
          try {
            const networkResponse = await fetch(request);
            if (isCachableResponse(networkResponse)) {
              await runtimeCache.put(request, networkResponse.clone());
              trimCache(RUNTIME_CACHE, MAX_RUNTIME_ITEMS);
            }
            return networkResponse;
          } catch (err) {
            console.debug('[SW] Navigation fetch failed, falling back to cache:', err);
          }
        }

        // 2. Try exact requested route from runtime or core cache
        const cachedResponse = (await runtimeCache.match(request)) || (await coreCache.match(request));
        if (cachedResponse) {
          return cachedResponse;
        }

        // 3. Try match without query parameters
        const cleanUrl = url.origin + url.pathname;
        const cachedClean = (await runtimeCache.match(cleanUrl)) || (await coreCache.match(cleanUrl));
        if (cachedClean) {
          return cachedClean;
        }

        // 4. For subpages (e.g. /teacher/students/123), try parent route document before falling back to dashboard
        if (url.pathname.startsWith('/teacher/students/')) {
          const parentDoc = (await coreCache.match('/teacher/students')) || (await runtimeCache.match('/teacher/students'));
          if (parentDoc) return parentDoc;
        }
        if (url.pathname.startsWith('/teacher/groups/')) {
          const parentDoc = (await coreCache.match('/teacher/groups')) || (await runtimeCache.match('/teacher/groups'));
          if (parentDoc) return parentDoc;
        }
        if (url.pathname.startsWith('/teacher/assessments/')) {
          const parentDoc = (await coreCache.match('/teacher/assessments')) || (await runtimeCache.match('/teacher/assessments'));
          if (parentDoc) return parentDoc;
        }

        // 5. Fall back to cached App Shell document
        const appShell =
          (await coreCache.match('/teacher/dashboard')) ||
          (await coreCache.match('/')) ||
          (await coreCache.match('/login'));
        if (appShell) {
          return appShell;
        }

        // 6. Final fallback: standalone offline page
        const offlinePage = await coreCache.match('/offline.html');
        if (offlinePage) {
          return offlinePage;
        }

        return new Response('Offline - Platform El-Awal', {
          status: 503,
          statusText: 'Offline',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      })(),
    );
    return;
  }

  // =========================================================================
  // Strategy C: Static Assets (_next/static, fonts, icons, images, manifests)
  // =========================================================================
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
    // The hero animation reuses the same finite image sequence. Cache frames
    // without background revalidation so each animation loop stays offline.
    const isHeroAnimationFrame = url.pathname.startsWith('/hero-animation/');

    event.respondWith(
      (async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          // Hero frames are intentionally cache-first; revalidating here would
          // download the entire sequence again on every animation loop.
          if (navigator.onLine && !isHeroAnimationFrame) {
            fetch(request)
              .then(async (networkResponse) => {
                if (isCachableResponse(networkResponse)) {
                  const runtimeCache = await caches.open(RUNTIME_CACHE);
                  await runtimeCache.put(request, networkResponse);
                  trimCache(RUNTIME_CACHE, MAX_RUNTIME_ITEMS);
                }
              })
              .catch(() => {});
          }
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (isCachableResponse(networkResponse)) {
            const runtimeCache = await caches.open(RUNTIME_CACHE);
            await runtimeCache.put(request, networkResponse.clone());
            trimCache(RUNTIME_CACHE, MAX_RUNTIME_ITEMS);
          }
          return networkResponse;
        } catch {
          // Fallback for icons/manifests
          if (url.pathname.includes('manifest')) {
            const cachedManifest = (await caches.match('/manifest.webmanifest')) || (await caches.match('/manifest.json'));
            if (cachedManifest) return cachedManifest;
          }
          if (url.pathname.endsWith('.svg') || url.pathname.endsWith('.png')) {
            const cachedIcon = (await caches.match('/favicon.svg')) || (await caches.match('/icons/icon.svg')) || (await caches.match('/icon.svg'));
            if (cachedIcon) return cachedIcon;
          }
          // For JavaScript / CSS files requested offline that aren't cached yet, return a safe fallback rather than fatal error
          if (url.pathname.endsWith('.js')) {
            return new Response('/* offline chunk placeholder */', {
              status: 200,
              headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
            });
          }
          if (url.pathname.endsWith('.css')) {
            return new Response('/* offline css placeholder */', {
              status: 200,
              headers: { 'Content-Type': 'text/css; charset=utf-8' },
            });
          }
          return new Response('', { status: 503, statusText: 'Offline' });
        }
      })(),
    );
    return;
  }

  // Skip cross-origin API calls (handled directly by React Query & Offline Sync Engine)
  if (url.origin !== self.location.origin) {
    return;
  }

  // =========================================================================
  // Strategy D: Other Same-Origin Requests -> Network First with dynamic cache & safe JSON fallback
  // =========================================================================
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (isCachableResponse(response)) {
          const runtimeCache = await caches.open(RUNTIME_CACHE);
          await runtimeCache.put(request, response.clone());
          trimCache(RUNTIME_CACHE, MAX_RUNTIME_ITEMS);
        }
        return response;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;

        const cleanUrl = url.origin + url.pathname;
        const cachedClean = await caches.match(cleanUrl);
        if (cachedClean) return cachedClean;

        return new Response(JSON.stringify({ error: 'Network error or resource unavailable offline' }), {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' },
        });
      }
    })(),
  );
});

// Listen for message from clients (skip waiting, clear caches)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((name) => caches.delete(name)));
      })
    );
  }
});

// =========================================================================
// WEB PUSH NOTIFICATION HANDLERS
// =========================================================================

const PUSH_APP_NAME = 'منصة الأول التعليمية';
const PUSH_ICON = '/icons/icon-192x192.png';
const PUSH_BADGE = '/icons/badge-72x72.png';

/**
 * Push Event: Display notification to user.
 * Payload format: { title, body, icon?, badge?, url?, tag?, data? }
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: PUSH_APP_NAME, body: event.data.text() };
  }

  const title = payload.title || PUSH_APP_NAME;
  const options = {
    body: payload.body || '',
    icon: payload.icon || PUSH_ICON,
    badge: payload.badge || PUSH_BADGE,
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    tag: payload.tag || 'el-awal-notification',
    renotify: true,
    requireInteraction: false,
    data: {
      url: payload.url || '/',
      ...payload.data,
    },
    actions: [
      { action: 'open', title: 'فتح' },
      { action: 'dismiss', title: 'تجاهل' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Notification Click: Navigate user to the relevant page.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing tab if already open
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      }),
  );
});

/**
 * Push Subscription Change: Re-subscribe when browser rotates the subscription.
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
      })
      .then((newSubscription) => {
        return fetch('/api/v1/notifications/push-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSubscription.toJSON()),
          credentials: 'include',
        });
      })
      .catch((err) => {
        console.error('[SW] pushsubscriptionchange failed:', err);
      }),
  );
});
