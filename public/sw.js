const CACHE_NAME = 'dini-bismillah-v6';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith('http')) return;

  const url = e.request.url;
  const isBackendRequest =
    e.request.headers.has('authorization') ||
    url.includes('/rest/v1/') ||
    url.includes('/auth/v1/') ||
    url.includes('/functions/v1/');

  const isViteDevRequest =
    url.includes('/node_modules/.vite/') ||
    url.includes('/@vite/') ||
    url.includes('/@fs/') ||
    url.includes('/src/') ||
    /[?&]v=/.test(url);

  const isScriptOrStyleRequest =
    e.request.destination === 'script' ||
    e.request.destination === 'style' ||
    e.request.destination === 'worker';

  if (isBackendRequest || isViteDevRequest || isScriptOrStyleRequest) {
    e.respondWith(fetch(e.request));
    return;
  }

  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/index.html')));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(
      (cached) =>
        cached ||
        fetch(e.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return response;
        })
    )
  );
});

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// Push notification handler (VAPID Web Push)
self.addEventListener('push', function(event) {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Dini Bismillah', body: event.data.text() };
  }

  const title = payload.title || 'Dini Bismillah';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || 'dini-bismillah',
    data: payload.data || {},
    vibrate: payload.vibrate || [200, 100, 200],
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || 'https://diniv2.lovable.app')
  );
});
