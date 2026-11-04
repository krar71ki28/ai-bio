const CACHE = 'ai-hub-v3';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll([
    './', './index.html', './game.html', './daily.html', './swarm.html', './chat.html',
    './css/style.css', './css/game.css', './css/chat.css',
    './js/game.js', './js/daily.js', './js/swarm.js', './js/chat.js', 
    './js/ai-worker.js', './js/daily-worker.js', './js/swarm-worker.js',
    './manifest.json'
  ])));
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
