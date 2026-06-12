// ===== Naša Kuharica - Service Worker =====
// VAŽNO: pri svakoj novoj verziji app PROMIJENITE broj ispod (npr. v2 -> v3).
// To je ono što natjera preglednik da odbaci stari cache i povuče novu verziju.
const CACHE_VERSION = 'nasa-kuharica-v14';

// Datoteke koje želimo imati dostupne i bez interneta (offline)
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png'
];

// --- Instalacija: spremi osnovne datoteke i odmah preuzmi kontrolu ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // nova verzija se aktivira odmah
  );
});

// --- Aktivacija: obriši sve stare cache verzije ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// --- Dohvaćanje ---
// HTML (sama aplikacija): NETWORK-FIRST -> uvijek prvo probaj s mreže
//   pa ako uspije, koristi i osvježi cache; ako nema interneta, vrati cache.
// Ostalo (ikone, manifest): CACHE-FIRST -> brzo, iz cache-a.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
  } else {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
  }
});

// Omogući app-u da kaže "preskoči čekanje" (za gumb 'ažuriraj odmah')
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
