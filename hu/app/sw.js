/* FitnessLady PWA service worker */
const CACHE = "fl-app-v2";

const ASSETS = [
  "/hu/app/",
  "/hu/app/index.html",
  "/hu/app/style.css",
  "/hu/app/app.js",
  "/hu/app/manifest.webmanifest",
  "/hu/app/offline.html",
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
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          if (req.method === "GET" && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          if (req.mode === "navigate") {
            return caches.match("/hu/app/offline.html");
          }
          return Response.error();
        });
    })
  );
});
