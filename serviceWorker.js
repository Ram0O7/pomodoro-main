// Increment the version whenever any app-shell asset changes.
const CACHE_PREFIX = 'still-shell-' + new URL('./', self.location.href).pathname + '-';
const CACHE = `${CACHE_PREFIX}v2`;
const BASE = new URL('./', self.location.href);
const ASSETS = ['./', './index.html', './style.css', './index.js', './timer.js', './manifest.json', './images/icons/icon-192.png', './images/icons/icon-512.png', './images/icons/maskable-512.png', './images/icons/apple-touch-icon.png', './images/icons/badge.png'].map(path => new URL(path, BASE).href);
self.addEventListener('install', event => {
  // Await the entire atomic cache fill. A failed download must fail installation.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => (key.startsWith(CACHE_PREFIX) || key.startsWith('pomodoro-site-')) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  // Version-consistent app shell; unknown assets are never cached indiscriminately.
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(new URL('./index.html', BASE).href)) || fetch(event.request)));
  } else if (ASSETS.includes(url.href)) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request)) || fetch(event.request)));
  }
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    // Fixed app destination: notification payloads cannot navigate to an external URL.
    const windows = await self.clients.matchAll({type:'window', includeUncontrolled:true});
    const existing = windows.find(client => { const url = new URL(client.url); return url.origin === BASE.origin && url.pathname.startsWith(BASE.pathname); });
    if (existing) await existing.focus(); else await self.clients.openWindow(BASE.href);
  })());
});
