const CACHE_NAME = 'aurelia-echoes-v3';
const ASSETS = [
  '/aureliaechoes/',
  '/aureliaechoes/index.html',
  '/aureliaechoes/style.css',
  '/aureliaechoes/app.js',
  '/aureliaechoes/firebase.js',
  '/aureliaechoes/db.js',
  '/aureliaechoes/import.js',
  '/aureliaechoes/manifest.json',
  '/aureliaechoes/icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
