const CACHE_NAME = 'ai-offline-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// حفظ الملفات في ذاكرة الهاتف
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// استرجاع الملفات من الذاكرة إذا انقطع الإنترنت
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;
      return fetch(event.request);
    })
  );
});
