const CACHE = 'aircraft-designer-v19';
const ASSETS = [
  './', './index.html', './manifest.json',
  './ar-colored.html',
  './vendor/aframe.min.js',
  './models/aircraft_coloring.glb',
  './models/aircraft_ar_meters.glb',
  './images/aircraft_top_guide.png',
  './images/aircraft_side_guide.png',
  './images/propeller.png',
  './images/sora_coach.png'
  
  // AR用
  './ar-test.html',
  './vendor/model-viewer.min.js'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request)));
});
