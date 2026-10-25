// Dream On offline cache. Version change forces fresh asset installation.
const CACHE = 'dreamon-aircraft-v6-diag';
const CORE = [
  './', './index.html', './manifest.json', './vendor/aframe.min.js',
  './models/aircraft_coloring.glb',
  './images/aircraft_top_guide.png', './images/aircraft_side_guide.png',
  './images/sora_coach.png', './images/propeller.png',
  './ar-colored.html', './flight-captain.html'
];
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  // Missing optional files do not block basic coloring installation.
  await Promise.all(CORE.map(async path => {
    try { const response = await fetch(path, {cache:'reload'});
      if (response.ok) await cache.put(path, response);
    } catch (err) { console.warn('Cache skipped:', path, err); }
  }));
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) if (name.startsWith('dreamon-aircraft-') && name !== CACHE) await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.includes('/api/') || url.pathname.endsWith('/admin')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch (err) {
      if (request.mode === 'navigate') return await cache.match('./index.html') || Response.error();
      throw err;
    }
  })());
});
