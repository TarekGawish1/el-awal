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

const CACHE_NAME = 'el-awal-core-v14';
const RUNTIME_CACHE = 'el-awal-runtime-v14';
const RSC_CACHE = 'el-awal-rsc-v14';

// Maximum entries allowed in dynamic caches to prevent device storage bloating
const MAX_RUNTIME_ITEMS = 300;
const MAX_RSC_ITEMS = 100;
const MAX_CACHABLE_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB guard

/**
 * Trim cache to maxItems using FIFO eviction while protecting JS code chunks
 */
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      // Prioritize preserving JS chunks and core assets over ad-hoc queries
      const deletableKeys = keys.filter((req) => {
        const url = new URL(req.url);
        return !url.pathname.startsWith('/_next/static/chunks/');
      });
      const itemsToDelete = (deletableKeys.length > 0 ? deletableKeys : keys).slice(0, keys.length - maxItems);
      await Promise.all(itemsToDelete.map((key) => cache.delete(key)));
    }
  } catch (err) {
    console.debug('[SW] Cache trim notice:', err);
  }
}

/**
 * Validates if response is safe and within size bounds to cache.
 * Strictly prevents private/authenticated API responses, no-store directives,
 * Authorization headers, and oversized payloads from entering CacheStorage (SEC-17).
 */
function isCachableResponse(requestOrResponse, maybeResponse) {
  const req = maybeResponse ? requestOrResponse : null;
  const res = maybeResponse ? maybeResponse : requestOrResponse;

  if (!res || res.status !== 200) return false;
  if (res.type === 'opaque' || res.type === 'error') return false;

  // Never cache API routes in CacheStorage
  if (req) {
    try {
      const u = new URL(req.url || '', self.location.origin);
      if (u.pathname.startsWith('/api/') || u.pathname.includes('/api/v1/')) {
        return false;
      }
    } catch {}

    // Never cache requests with Authorization header
    if (req.headers && typeof req.headers.get === 'function') {
      if (req.headers.get('Authorization') || req.headers.get('authorization')) {
        return false;
      }
    }
  }

  // Response header inspection: Respect Cache-Control directives
  if (res.headers && typeof res.headers.get === 'function') {
    const cacheControl = (res.headers.get('cache-control') || '').toLowerCase();
    if (
      cacheControl.includes('no-store') ||
      cacheControl.includes('no-cache') ||
      cacheControl.includes('private') ||
      cacheControl.includes('max-age=0')
    ) {
      return false;
    }

    const pragma = (res.headers.get('pragma') || '').toLowerCase();
    if (pragma.includes('no-cache')) {
      return false;
    }

    const vary = (res.headers.get('vary') || '').toLowerCase();
    if (vary.includes('*') || vary.includes('authorization') || vary.includes('cookie')) {
      return false;
    }

    const len = res.headers.get('content-length');
    if (len && parseInt(len, 10) > MAX_CACHABLE_SIZE_BYTES) {
      return false;
    }
  }

  return true;
}

// Critical App Shell assets to pre-cache on install.
// Kept ultra-lightweight (offline fallback, manifests, icons) to prevent network contention on mobile.
// Dashboard routes, chunks, and RSC flight payloads are cached dynamically as users browse
// or asynchronously during idle time.
const PRECACHE_URLS = [
  '/offline.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/apple-touch-icon.png',
  '/favicon.ico',
  '/favicon.svg',
  '/wasm/zxing_reader.wasm',
];

// 1. Install Event: Pre-cache core shell and offline fallback only
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const coreCache = await caches.open(CACHE_NAME);

      // Pre-cache static shell URLs
      for (const url of PRECACHE_URLS) {
        try {
          const response = await fetch(url);
          if (response && response.status === 200 && !response.redirected) {
            await coreCache.put(url, response);
          }
        } catch (err) {
          console.debug('[SW] Precache notice:', url, err);
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
      .then(async () => {
        // Upgrade & migration safety: Scan and purge any lingering /api/ entries
        for (const name of [RUNTIME_CACHE, RSC_CACHE]) {
          try {
            const c = await caches.open(name);
            const keys = await c.keys();
            for (const req of keys) {
              const u = new URL(req.url);
              if (u.pathname.startsWith('/api/') || u.pathname.includes('/api/v1/')) {
                await c.delete(req);
              }
            }
          } catch {}
        }
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

  // =========================================================================
  // SEC-17: Authenticated & Private API Isolation
  // Under NO circumstances should /api/ responses be stored in CacheStorage.
  // Intentional offline data is managed by IndexedDB (offlineDb/Dexie) and
  // TanStack Query. The Service Worker passes /api/ directly to the network.
  // When offline, it returns an explicit 503 JSON without caching or reading stale data.
  // =========================================================================
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            error: 'Network error or resource unavailable offline',
            offline: true,
          }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'no-store, no-cache, private, must-revalidate',
              'Pragma': 'no-cache',
            },
          },
        );
      }),
    );
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
              if (!contentType.includes('text/html') && isCachableResponse(request, networkResponse)) {
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

        if (url.pathname.startsWith('/teacher/finance')) {
          const financeParentReq = new Request('/teacher/finance', { headers: { RSC: '1' } });
          const financeRsc = (await rscCache.match(financeParentReq)) || (await runtimeCache.match(financeParentReq));
          if (financeRsc) return financeRsc;
        }

        if (url.pathname.startsWith('/teacher/schedules')) {
          const schedulesParentReq = new Request('/teacher/schedules', { headers: { RSC: '1' } });
          const schedulesRsc = (await rscCache.match(schedulesParentReq)) || (await runtimeCache.match(schedulesParentReq));
          if (schedulesRsc) return schedulesRsc;
        }

        if (url.pathname.startsWith('/teacher/assessments/')) {
          const assessParentReq = new Request('/teacher/assessments', { headers: { RSC: '1' } });
          const assessRsc = await rscCache.match(assessParentReq);
          if (assessRsc) return assessRsc;
        }

        // 5. Fall back to root dashboard RSC ONLY if requested route is the root dashboard
        if (url.pathname === '/teacher/dashboard' || url.pathname === '/student/dashboard' || url.pathname === '/parent/dashboard') {
          const dashboardRsc = await rscCache.match(new Request(url.pathname, { headers: { RSC: '1' } }));
          if (dashboardRsc) {
            return dashboardRsc;
          }
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

        // Fast path for PWA launcher '/app': Serve from cache immediately if available for zero-latency launch
        if (url.pathname === '/app') {
          const cachedApp = (await coreCache.match('/app')) || (await runtimeCache.match('/app'));
          if (cachedApp) {
            // Background revalidate in parallel
            fetch(request).then((res) => {
              if (isCachableResponse(request, res)) runtimeCache.put('/app', res);
            }).catch(() => {});
            return cachedApp;
          }
        }

        // 1. Try network first if online
        if (navigator.onLine) {
          try {
            const networkResponse = await fetch(request);
            if (isCachableResponse(request, networkResponse) && !networkResponse.redirected) {
              await runtimeCache.put(request, networkResponse.clone());
              const cleanUrl = url.origin + url.pathname;
              await runtimeCache.put(cleanUrl, networkResponse.clone());
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
        if (url.pathname.startsWith('/teacher/finance')) {
          const parentDoc = (await coreCache.match('/teacher/finance')) || (await runtimeCache.match('/teacher/finance'));
          if (parentDoc) return parentDoc;
        }
        if (url.pathname.startsWith('/teacher/students/')) {
          const parentDoc = (await coreCache.match('/teacher/students')) || (await runtimeCache.match('/teacher/students'));
          if (parentDoc) return parentDoc;
        }
        if (url.pathname.startsWith('/teacher/groups/')) {
          const parentDoc = (await coreCache.match('/teacher/groups')) || (await runtimeCache.match('/teacher/groups'));
          if (parentDoc) return parentDoc;
        }
        if (url.pathname.startsWith('/teacher/schedules')) {
          const parentDoc = (await coreCache.match('/teacher/schedules')) || (await runtimeCache.match('/teacher/schedules'));
          if (parentDoc) return parentDoc;
        }
        if (url.pathname.startsWith('/teacher/assessments/')) {
          const parentDoc = (await coreCache.match('/teacher/assessments')) || (await runtimeCache.match('/teacher/assessments'));
          if (parentDoc) return parentDoc;
        }

        // 5. Scoped Role App Shell Fallback (CRITICAL: ZERO REDIRECT TO ROOT '/' FOR DASHBOARD ROUTES)
        if (url.pathname.startsWith('/teacher')) {
          let teacherShell =
            (await coreCache.match(url.pathname)) ||
            (await runtimeCache.match(url.pathname));

          if (!teacherShell) {
            if (url.pathname.startsWith('/teacher/finance')) {
              teacherShell = (await coreCache.match('/teacher/finance')) || (await runtimeCache.match('/teacher/finance'));
            } else if (url.pathname.startsWith('/teacher/attendance')) {
              teacherShell = (await coreCache.match('/teacher/attendance')) || (await runtimeCache.match('/teacher/attendance'));
            } else if (url.pathname.startsWith('/teacher/students')) {
              teacherShell = (await coreCache.match('/teacher/students')) || (await runtimeCache.match('/teacher/students'));
            } else if (url.pathname.startsWith('/teacher/groups')) {
              teacherShell = (await coreCache.match('/teacher/groups')) || (await runtimeCache.match('/teacher/groups'));
            } else if (url.pathname.startsWith('/teacher/schedules')) {
              teacherShell = (await coreCache.match('/teacher/schedules')) || (await runtimeCache.match('/teacher/schedules'));
            } else if (url.pathname === '/teacher/dashboard' || url.pathname === '/teacher') {
              teacherShell = (await coreCache.match('/teacher/dashboard')) || (await runtimeCache.match('/teacher/dashboard'));
            }
          }

          if (teacherShell) {
            return teacherShell;
          }
        } else if (url.pathname.startsWith('/student')) {
          const studentShell =
            (await coreCache.match(url.pathname)) ||
            (await runtimeCache.match(url.pathname)) ||
            (await coreCache.match('/student/dashboard')) ||
            (await runtimeCache.match('/student/dashboard'));
          if (studentShell) {
            return studentShell;
          }
        } else if (url.pathname.startsWith('/parent')) {
          const parentShell =
            (await coreCache.match(url.pathname)) ||
            (await runtimeCache.match(url.pathname)) ||
            (await coreCache.match('/parent/dashboard')) ||
            (await runtimeCache.match('/parent/dashboard'));
          if (parentShell) {
            return parentShell;
          }
        } else if (url.pathname === '/' || url.pathname === '/login') {
          const publicShell =
            (await coreCache.match(url.pathname)) ||
            (await coreCache.match('/login')) ||
            (await coreCache.match('/'));
          if (publicShell) return publicShell;
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
    url.pathname.startsWith('/wasm/') ||
    url.pathname.endsWith('.wasm') ||
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
          if (isCachableResponse(request, networkResponse)) {
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
          if (url.pathname.endsWith('.wasm') || url.pathname.startsWith('/wasm/')) {
            const cachedWasm = (await caches.match('/wasm/zxing_reader.wasm')) || (await coreCache.match('/wasm/zxing_reader.wasm'));
            if (cachedWasm) return cachedWasm;
          }
          // For static assets requested offline that aren't cached yet, return 503 so Webpack / browser handles cleanly
          return new Response('Offline asset unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
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
        if (isCachableResponse(request, response)) {
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
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, private',
          },
        });
      }
    })(),
  );
});

// Listen for message from clients (skip waiting, clear caches, warm offline shell)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && (event.data.type === 'CLEAR_CACHE' || event.data.type === 'CLEAR_USER_SESSION')) {
    event.waitUntil(
      (async () => {
        // Delete dynamic/user-scoped caches (RUNTIME_CACHE, RSC_CACHE)
        // to prevent cross-account data leaks when switching users on the same device.
        await caches.delete(RUNTIME_CACHE);
        await caches.delete(RSC_CACHE);

        // If explicitly requested to wipe everything, also purge other caches except static shell
        if (event.data.all) {
          const allNames = await caches.keys();
          await Promise.all(
            allNames
              .filter((name) => name !== CACHE_NAME)
              .map((name) => caches.delete(name)),
          );
        }

        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true, timestamp: Date.now() });
        }
      })(),
    );
  }
  if (event.data && event.data.type === 'WARM_OFFLINE_SHELL') {
    const urlsToWarm = Array.isArray(event.data.urls) && event.data.urls.length > 0
      ? event.data.urls
      : [
          '/teacher/dashboard',
          '/teacher/attendance',
          '/teacher/finance',
          '/teacher/groups',
          '/teacher/students',
          '/teacher/schedules',
        ];
    event.waitUntil(
      (async () => {
        const coreCache = await caches.open(CACHE_NAME);
        const rscCache = await caches.open(RSC_CACHE);
        const runtimeCache = await caches.open(RUNTIME_CACHE);

        for (const path of urlsToWarm) {
          try {
            // 1. Warm full HTML document shell
            const docReq = new Request(path, { credentials: 'same-origin' });
            const docRes = await fetch(docReq);
            if (docRes && docRes.status === 200 && !docRes.redirected) {
              await runtimeCache.put(docReq, docRes.clone());
              await coreCache.put(path, docRes.clone());

              // Extract and cache all JS chunks and CSS files referenced in the HTML document shell
              try {
                const htmlText = await docRes.text();
                const staticMatches = htmlText.matchAll(/(?:src|href)=["'](\/_next\/static\/[^"']+)["']/g);
                for (const match of staticMatches) {
                  const assetUrl = match[1];
                  const alreadyCached = (await runtimeCache.match(assetUrl)) || (await coreCache.match(assetUrl));
                  if (!alreadyCached) {
                    try {
                      const assetRes = await fetch(assetUrl);
                      if (assetRes && assetRes.status === 200) {
                        await runtimeCache.put(assetUrl, assetRes);
                      }
                    } catch (assetErr) {
                      console.debug('[SW] Warm asset skip:', assetUrl, assetErr);
                    }
                  }
                }
              } catch (htmlErr) {
                console.debug('[SW] Warm HTML parse skip:', path, htmlErr);
              }
            }

            // 2. Warm RSC flight payload for seamless client-side Next.js navigation
            const rscReq = new Request(`${path}?_rsc=init`, {
              headers: { RSC: '1', 'Next-Router-Prefetch': '1' },
              credentials: 'same-origin',
            });
            const rscRes = await fetch(rscReq);
            if (rscRes && rscRes.status === 200 && !rscRes.redirected) {
              await rscCache.put(rscReq, rscRes.clone());
              const normalizedReq = new Request(path, { headers: { RSC: '1' } });
              await rscCache.put(normalizedReq, rscRes.clone());

              // Extract and cache any JS chunks referenced in the RSC flight payload
              try {
                const rscText = await rscRes.text();
                const rscMatches = rscText.matchAll(/(?:\/_next\/static\/chunks\/|static\/chunks\/)[a-zA-Z0-9_\-\.\/]+\.js/g);
                for (const match of rscMatches) {
                  let chunkUrl = match[0];
                  if (!chunkUrl.startsWith('/_next/')) {
                    chunkUrl = '/_next/' + chunkUrl;
                  }
                  const alreadyCached = (await runtimeCache.match(chunkUrl)) || (await coreCache.match(chunkUrl));
                  if (!alreadyCached) {
                    try {
                      const chunkRes = await fetch(chunkUrl);
                      if (chunkRes && chunkRes.status === 200) {
                        await runtimeCache.put(chunkUrl, chunkRes);
                      }
                    } catch (chunkErr) {
                      console.debug('[SW] Warm RSC chunk skip:', chunkUrl, chunkErr);
                    }
                  }
                }
              } catch (rscErr) {
                console.debug('[SW] Warm RSC parse skip:', path, rscErr);
              }
            }
          } catch (err) {
            console.debug('[SW] Warm offline shell skip:', path, err);
          }
        }

        // Also precache ZXing WASM module during offline shell warming
        try {
          const wasmUrl = '/wasm/zxing_reader.wasm';
          const alreadyCachedWasm = (await coreCache.match(wasmUrl)) || (await runtimeCache.match(wasmUrl));
          if (!alreadyCachedWasm) {
            const wasmRes = await fetch(wasmUrl);
            if (wasmRes && wasmRes.status === 200) {
              await coreCache.put(wasmUrl, wasmRes);
            }
          }
        } catch (wasmErr) {
          console.debug('[SW] Warm WASM skip:', wasmErr);
        }
      })(),
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

  const notif = payload.notification || {};
  const data = payload.data || {};

  const title = notif.title || payload.title || PUSH_APP_NAME;
  const targetUrl = payload.fcmOptions?.link || data.url || payload.url || '/';

  const options = {
    body: notif.body || payload.body || '',
    icon: notif.icon || payload.icon || PUSH_ICON,
    badge: notif.badge || payload.badge || PUSH_BADGE,
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    tag: payload.tag || data.tag || (data.id ? `el-awal-${data.id}` : `el-awal-${Date.now()}`),
    renotify: true,
    requireInteraction: false,
    data: {
      url: targetUrl,
      ...data,
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
