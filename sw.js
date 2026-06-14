// ============================================================
// Cents PWA — Service Worker
// Strategy: Cache-first for CDN assets, Network-first for app shell
// ============================================================

const CACHE_NAME = 'cents-v1.2';
const OFFLINE_URL = '/cents/';

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/cents/',
  '/cents/index.html',
  '/cents/manifest.json',
  '/cents/icons/icon-192.png',
  '/cents/icons/icon-512.png',
  '/cents/icons/apple-touch-icon.png',
];

// CDN assets — cache on first fetch, reuse forever
const CDN_ORIGINS = [
  'unpkg.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// ─── INSTALL ─────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH ───────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // CDN resources → Cache First (never changes, massive speed boost)
  if (CDN_ORIGINS.some((origin) => url.hostname.includes(origin))) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        try {
          const response = await fetch(event.request);
          if (response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        } catch {
          return cached || new Response('Offline', { status: 503 });
        }
      })
    );
    return;
  }

  // App shell → Network First, fall back to cache (ensures updates land)
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then(
            (cached) => cached || caches.match(OFFLINE_URL)
          )
        )
    );
    return;
  }
});
