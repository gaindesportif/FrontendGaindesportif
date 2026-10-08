/* Repli offline uniquement : aucune page dynamique, API ou donnée personnelle en cache. */
const CACHE = 'gainde-public-v1';
const PUBLIC_RESOURCES = ['/offline.html', '/icons/icon-192.png', '/icons/icon-512.png'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PUBLIC_RESOURCES)));
  // Ne pas forcer un remplacement au milieu d'une saisie de formulaire.
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('gainde-public-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/admin')
  )
    return;
  if (request.mode === 'navigate') {
    // Les navigations App Router peuvent fournir un payload RSC : ne jamais le stocker.
    event.respondWith(
      fetch(request).catch(async () => (await caches.match('/offline.html')) || Response.error()),
    );
    return;
  }
  if (PUBLIC_RESOURCES.includes(url.pathname))
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
