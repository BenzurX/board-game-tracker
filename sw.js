const CACHE = 'board-game-tracker-v53';
const APP_VERSION = '0.25';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './sfx.js',
  './qrcode.js',
  './manifest.json',
  './icons/pip-mark.svg',
  './icons/pip-mark-flat.svg',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'GET_VERSION' && e.source) {
    e.source.postMessage({ type: 'VERSION', cacheVersion: CACHE, version: APP_VERSION });
  }
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
