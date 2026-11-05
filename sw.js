/* ops-v50-2026-11-05a: only same-origin app shell is cached; Supabase/API requests are never intercepted. */
const BUILD_ID = 'ops-v50-2026-11-05a';
const CACHE = 'bazdid-' + BUILD_ID;
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icon-ops-192.png', './icon-ops-512.png', './report.html'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
});
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('bazdid-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return; // never cache Supabase, CDN, or external services
  if(url.pathname.endsWith('/sw.js')) return;
  if(req.mode==='navigate') {
    event.respondWith(fetch(req).then(response => {
      if(response && response.ok && response.type==='basic') caches.open(CACHE).then(c=>c.put(req,response.clone())).catch(()=>{});
      return response;
    }).catch(async () => (await caches.match(req)) || (await caches.match('./')) || (await caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(response => {
    if(response && response.ok && response.type==='basic') caches.open(CACHE).then(c=>c.put(req,response.clone())).catch(()=>{});
    return response;
  })));
});
