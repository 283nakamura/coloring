// Dream On offline PWA: Safari MP4 byte-range support.
const CACHE = 'dreamon-aircraft-v7-video-range';
const CORE = [
  './', './index.html', './manifest.json', './vendor/aframe.min.js',
  './models/aircraft_coloring.glb',
  './images/aircraft_top_guide.png', './images/aircraft_side_guide.png',
  './images/sora_coach.png', './images/propeller.png',
  './ar-colored.html', './flight-captain.html',
  './AirTaxi_Offline.html',
  './videos/flight_01.mp4', './videos/flight_02.mp4', './videos/flight_03.mp4',
  './audio/flight_01.mp3',
  './images/flight_01.jpg', './images/flight_01.png', './images/flight_02.png'
];
const isVideo = url => /\/videos\/flight_0[123]\.mp4$/i.test(url.pathname);
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  // Optional resources are individually cached, so a missing file does not block installation.
  for (const path of CORE) {
    try {
      const response = await fetch(path, { cache: 'reload' });
      if (response.ok && response.status === 200) await cache.put(path, response);
    } catch (err) { console.warn('Cache skipped:', path, err); }
  }
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) {
    if (name.startsWith('dreamon-aircraft-') && name !== CACHE) await caches.delete(name);
  }
  await self.clients.claim();
})()));
async function serveRange(request, cache) {
  const range = request.headers.get('Range');
  const cached = await cache.match(request.url, { ignoreVary: true });
  if (!cached || !cached.ok || cached.status !== 200) {
    // Let the server answer with HTTP 206; never cache a partial response as a whole video.
    return fetch(request);
  }
  if (!range) return cached;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match) return fetch(request);
  const buffer = await cached.arrayBuffer();
  const total = buffer.byteLength;
  let start = match[1] === '' ? 0 : Number(match[1]);
  let end = match[2] === '' ? total - 1 : Number(match[2]);
  if (match[1] === '' && match[2] !== '') {
    const suffix = Number(match[2]);
    start = Math.max(0, total - suffix);
    end = total - 1;
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= total || end < start) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } });
  }
  end = Math.min(end, total - 1);
  const headers = new Headers();
  headers.set('Content-Type', cached.headers.get('Content-Type') || 'video/mp4');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
  headers.set('Content-Length', String(end - start + 1));
  return new Response(buffer.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers });
}
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.includes('/api/') || url.pathname.endsWith('/admin')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (isVideo(url)) return serveRange(request, cache);
    // Non-video requests must never receive an incorrectly cached partial response.
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && response.status === 200) {
        try { await cache.put(request, response.clone()); } catch (err) { console.warn('Cache write skipped', err); }
      }
      return response;
    } catch (err) {
      if (request.mode === 'navigate') return await cache.match('./index.html') || Response.error();
      throw err;
    }
  })());
});
