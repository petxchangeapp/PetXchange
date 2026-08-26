// PetXchange service worker.
// Kept deliberately small: its only job is to satisfy the "installable PWA"
// requirement (both for Chrome's install prompt and for Play Store packaging
// via PWABuilder) and to let the app shell open even with a flaky connection.
// It does NOT cache API calls — Supabase data should always be fresh.

const CACHE = 'petxchange-shell-v1';
const SHELL = ['/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only ever handle same-origin, GET, navigation/document or shell requests.
  // Everything else (Supabase, CDNs, POST/PATCH writes) goes straight to the
  // network untouched — this app's data must never be served stale.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('/index.html')))
  );
});
