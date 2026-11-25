// Service Worker for ExamCore offline-first experience
// Pre-caches core frontend assets and intercepts requests to serve cached copies.
const CACHE_NAME = 'examcore-sw-v1';
let registered = false;

if ('serviceWorker' in navigator && typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    if (!registered) {
      registered = true;
      caches.open(CACHE_NAME).then(cache => cache.addAll([
        '/frontend/src/main.tsx',
        '/frontend/src/App.tsx',
        '/frontend/src/api.ts',
        '/frontend/src/config.ts',
        '/frontend/src/theme.css',
        '/frontend/src/index.css'
      ]));
      // Precache known static assets
      const assetUrls = [
        '/frontend/src/assets/hero.png',
        '/frontend/src/assets/react.svg',
        '/frontend/src/assets/vite.svg'
      ];
      assetUrls.forEach(u => {
        caches.open(CACHE_NAME).then(cache => cache.put(u, 'static'));
      });
    }
    window.sw.register('/service-worker.js').catch(() => {});
  });
}

self.addEventListener('fetch', async (event) => {
  const url = event.request.url;
  if (url.startsWith('/')) {
    const cache = await caches.match(url);
    if (cache) {
      event.respondWith(cache);
      return;
    }
  }
});
