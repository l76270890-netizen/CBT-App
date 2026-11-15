const CACHE = 'examcore-app-v1';
const CORE = ['/', '/index.html', '/manifest.webmanifest'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Don't cache API calls; novels/PDFs handled via IndexedDB in app
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/uploads')) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('/index.html', copy)).catch(()=>{}); return res; }).catch(() => caches.match('/index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => {
    if (res && res.ok && (url.origin === location.origin)) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{}); }
    return res;
  }).catch(() => cached)));
});