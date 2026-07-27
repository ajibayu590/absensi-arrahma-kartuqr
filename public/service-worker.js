
self.addEventListener('install', function(event) {
  self.skipWaiting(); // Activate new service worker immediately
  event.waitUntil(
    caches.open('absensi-cache').then(function(cache) {
      return cache.addAll([
        '/',
        '/icon-192.png',
        '/icon-512.png',
        // Add other assets you want to cache
      ]);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    clients.claim() // Take control of all pages
  );
  console.log('Service Worker activated');
});

self.addEventListener('fetch', function(event) {
  // Mode navigasi/redirect sering gagal jika diserahkan ke FetchEvent 
  // Tanpa 'mode: manual' atau penanganan redirect eksplisit.
  // Bypass total cache untuk navigasi untuk fix redirect.
  event.respondWith(fetch(event.request));
});

self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Absensi App Notification';
  const options = {
    body: data.body || 'You have a new notification.',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
