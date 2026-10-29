// Offline support.
// - App code (HTML, JS, CSS) is network-first, so a new deploy shows up on the next open,
//   with the cached copy used when there's no signal.
// - Fonts and icons are cache-first since they rarely change.
// Bump VERSION whenever you deploy.
const VERSION = 'tally-v10';
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
  './js/lib/exmedia.js',
  './js/lib/firebase-config.js',
  './js/lib/food.js',
  './js/lib/howto.js',
  './js/lib/photo.js',
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
  // cache: 'reload' skips the browser's HTTP cache so we never precache stale files.
  e.waitUntil(caches.open(VERSION)
    .then(c => Promise.all(ASSETS.map(u => fetch(new Request(u, { cache: 'reload' })).then(r => r.ok ? c.put(u, r) : null).catch(() => null))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const STATIC = /\.(woff2|png|jpg|webmanifest)$/;

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (STATIC.test(url.pathname)) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    })));
    return;
  }
  e.respondWith(fetch(new Request(req, { cache: 'no-cache' })).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html'))));
});
