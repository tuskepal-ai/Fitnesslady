/* Fitness Lady PWA Service Worker */
const CACHE = "fl-app-v1";

const ASSETS = [
  "/hu/app/",
  "/hu/app/index.html",
  "/hu/app/style.css",
  "/hu/app/app.js",
  "/hu/app/manifest.webmanifest",
  "/hu/app/icons/icon-192.png",
  "/hu/app/icons/icon-512.png",
  "/hu/app/icons/icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // csak a saját domaineket cache-eljük
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // csak GET és 200-at cache-eljünk
        if (req.method === "GET" && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
