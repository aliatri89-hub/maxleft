// ─── Max Left SERVICE WORKER ──────────────────────────────────
// Strategy: NEVER cache HTML or JS. Let Vite's content hashing handle that.
// Only cache: images (aggressive) and fonts (forever).
// This prevents the blank-page-after-deploy problem entirely.
// ────────────────────────────────────────────────────────────

const CACHE_VERSION = 'mantl-v14';
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const FONT_CACHE = `${CACHE_VERSION}-fonts`;

const IMAGE_CACHE_LIMIT = 500;

const IMAGE_DOMAINS = [
  'image.tmdb.org', 'books.google.com', 'flagcdn.com',
  'wsrv.nl', 'upload.wikimedia.org', 'covers.openlibrary.org',
];

// ─── INSTALL ───────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.put(
      new Request('/_offline'),
      new Response(
        '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Mantl — Offline</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#F5F0E8;font-family:"Lora",serif;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#2C2824}.wrap{text-align:center;padding:32px}.brand{font-family:"Barlow Condensed",sans-serif;font-weight:900;font-size:44px;letter-spacing:.08em;text-transform:uppercase}.line{height:3px;width:52px;background:#C4734F;border-radius:2px;margin:6px auto 24px}.msg{font-style:italic;font-size:15px;color:#8A8279;line-height:1.6}.retry{display:inline-block;margin-top:24px;padding:12px 32px;background:#C4734F;color:#FDFBF7;font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:15px;letter-spacing:.1em;text-transform:uppercase;border:none;border-radius:10px;cursor:pointer}</style></head><body><div class="wrap"><div class="brand">Max Left</div><div class="line"></div><div class="msg">You\'re offline right now.<br>Check your connection and try again.</div><button class="retry" onclick="location.reload()">Retry</button></div></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      )
    ))
  );
  self.skipWaiting();
});

// ─── ACTIVATE ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('mantl-') && !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── MESSAGE ───────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// ─── FETCH ─────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Navigation → network-first, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/_offline'))
    );
    return;
  }
  // NEVER intercept auth, edge functions, HTML, JS, CSS, or API calls
  if (url.pathname.includes('/auth/')) return;
  if (url.pathname.includes('/functions/')) return;
  if (/\.(html|js|css|json)(\?.*)?$/.test(url.pathname)) return;
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('api.themoviedb.org')) return;
  if (url.hostname.includes('api.rawg.io')) return;
  if (url.hostname.includes('googleapis.com')) return;
  if (url.hostname.includes('wikipedia.org')) return;
  if (url.hostname.includes('strava.com')) return;

  // ── Images → Cache-first ──
  if (isImageDomain(url.hostname) || isImageRequest(request)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, IMAGE_CACHE_LIMIT));
    return;
  }

  // ── Fonts → Cache-first ──
  if (/\.(woff2?|ttf|otf|eot)(\?.*)?$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }
});

// ─── STRATEGIES ────────────────────────────────────────────

async function cacheFirst(request, cacheName, limit) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      if (limit) pruneCache(cacheName, limit);
    }
    return response;
  } catch {
    if (isImageRequest(request) || isImageDomain(new URL(request.url).hostname)) {
      return new Response(
        Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), c => c.charCodeAt(0)),
        { headers: { 'Content-Type': 'image/gif' } }
      );
    }
    return new Response('', { status: 503 });
  }
}

function isImageDomain(hostname) {
  return IMAGE_DOMAINS.some((d) => hostname.includes(d));
}

function isImageRequest(request) {
  const accept = request.headers.get('Accept') || '';
  return accept.includes('image/');
}

async function pruneCache(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > limit) {
    for (let i = 0; i < keys.length - limit; i++) {
      await cache.delete(keys[i]);
    }
  }
}

// ─── PUSH NOTIFICATIONS ───────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Mantl', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: data.tag || 'mantl-notification',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes('maxleft.app') && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
