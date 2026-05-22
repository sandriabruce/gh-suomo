const CACHE_NAME = 'ghsuomo-v5';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/rest/v1/') || event.request.url.includes('/functions/v1/')) return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Handle incoming push notifications
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'GH Suɔmɔ', body: event.data ? event.data.text() : 'You have a new message' };
  }

  const title = data.title || 'GH Suɔmɔ — New Message';
  const options = {
    body: data.body || 'Someone sent you a message',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    image: data.image || null,
    tag: data.matchId || 'ghsuomo-message',
    data: {
      url: data.matchId ? `/app/chat/${data.matchId}` : '/app/matches',
      matchId: data.matchId,
    },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click — open app to the right chat
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/app/matches';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes('ghsuomo.com') && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', url });
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
