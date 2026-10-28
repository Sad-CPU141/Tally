// Offline support: cache the app shell, serve it cache-first, refresh in the background.
// Bump VERSION whenever you deploy so phones pick up the new files.
const VERSION = 'tally-v5';
const ASSETS = [
  './',
  './css/app.css',
  './fonts/archivo.woff2',
  './fonts/geist-mono.woff2',
  './fonts/geist.woff2',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './index.html',
  './js/app.js',
  './js/lib/actions.js',
  './js/lib/analytics.js',
  './js/lib/cards.js',
  './js/lib/charts.js',
  './js/lib/dash-defaults.js',
  './js/lib/exercises.js',
  './js/lib/firebase-config.js',
  './js/lib/food.js',
  './js/lib/sample.js',
  './js/lib/store.js',
  './js/lib/ui.js',
  './js/lib/util.js',
  './js/screens/food.js',
  './js/screens/me.js',
  './js/screens/picker.js',
  './js/screens/stats.js',
  './js/screens/today.js',
  './js/screens/train.js',
  './js/screens/workout.js',
  './js/vendor/preact-htm.js',
  './js/vendor/zxing.min.js',
  './manifest.webmanifest',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.ok) caches.open(VERSION).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => hit || caches.match('./index.html'));
      return hit || net;
    })
  );
});
