/* Repli offline uniquement : aucune page dynamique, API ou donnée personnelle en cache. */
const CACHE = 'gainde-public-v2';
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
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/compte')
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

self.addEventListener('push', (event) => {
  let notice;
  try {
    notice = event.data?.json();
  } catch {
    return;
  }
  if (typeof notice?.title !== 'string' || !/^\/media\/[a-z0-9-]{1,200}$/.test(notice.path)) return;
  event.waitUntil(
    self.registration.showNotification(notice.title, {
      body: 'Nouvel article de Gaindé Media',
      tag: notice.path,
      silent: false,
      icon: '/icons/icon-192.png',
      data: { path: notice.path },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  const path = event.notification.data?.path;
  if (path !== '/media' && !/^\/media\/[a-z0-9-]{1,200}$/.test(path)) return;
  event.notification.close();
  event.waitUntil(
    (async () => {
      const url = new URL(path, self.location.origin).href;
      for (const client of await self.clients.matchAll({ type: 'window' })) {
        if (client.url === url) return client.focus();
      }
      return self.clients.openWindow(url);
    })(),
  );
});
