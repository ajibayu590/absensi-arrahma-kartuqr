const CACHE_NAME = "absensi-smk-cache-v1";
const OFFLINE_URL = "/offline.html";

const ASSETS_TO_PRECACHE = [
  "/",
  "/manifest.json",
  "/logo.webp",
  "/icon-192.png",
  "/icon-512.png",
  OFFLINE_URL
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_PRECACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Hanya intercept request GET dari origin yang sama dan bukan untuk API
  if (
    event.request.method === "GET" &&
    event.request.url.startsWith(self.location.origin) &&
    !event.request.url.includes("/api/") &&
    !event.request.url.includes("/_next/")
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Jika respon valid, klon dan simpan ke cache
          if (response && response.status === 200 && response.type === "basic") {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Jika gagal terkoneksi internet (offline), coba ambil dari cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Jika tidak ada di cache, arahkan ke offline fallback page
            return caches.match(OFFLINE_URL);
          });
        })
    );
  }
});
