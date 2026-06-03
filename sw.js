const CACHE_NAME = 'york-route-v43';
const APP_FILES = [
  './',
  './index.html',
  './uber.css',
  './features.css',
  './project-hub.css',
  './shop-page.css',
  './money-tracker.css',
  './shop-status.css',
  './firebase-config.js',
  './sync-lite.js',
  './voice-notes.js',
  './project-hub.js',
  './menu-pages.js',
  './shop-page.js',
  './ios-scroll-fix.js',
  './app.js',
  './businesses.js',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
  );
});
