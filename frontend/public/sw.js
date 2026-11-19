const CACHE = 'examcore-app-v3-offline';
const IMAGE_CACHE = 'examcore-images-v1';
const CORE = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE).catch(() => {});
    try {
      const response = await fetch('/index.html', { cache: 'reload' });
      if (response.ok) {
        await cache.put('/index.html', response.clone());
        const html = await response.text();
        const assets = Array.from(html.matchAll(/(?:src|href)="([^"]+)"/g))
          .map((match) => match[1])
          .filter((url) => url.startsWith('/') && !url.startsWith('/api'));
        await Promise.all(assets.map((url) => cache.add(url).catch(() => {})));
      }
    } catch {}
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE && key !== IMAGE_CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.pathname.startsWith('/api')) return;

  if (req.destination === 'image' || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const response = await fetch(req);
          if (response && (response.ok || response.type === 'opaque')) cache.put(req, response.clone()).catch(() => {});
          return response;
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  if (url.pathname.startsWith('/uploads')) return;

  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match('/index.html')))
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
EOF