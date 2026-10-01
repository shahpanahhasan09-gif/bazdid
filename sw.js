const CACHE = 'bazdid-v10';
const APP_SHELL = ['./?v=10', './index.html', './manifest.webmanifest', './icon.svg', './report.html'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      const copy=response.clone(); caches.open(CACHE).then(c=>c.put('./?v=10',copy)).catch(()=>{}); return response;
    }).catch(() => caches.match('./?v=10').then(r=>r||caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy=response.clone(); caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{}); return response;
  })));
});
