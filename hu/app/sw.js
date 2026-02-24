// FILE: /hu/app/sw.js
// FitnessLady PWA Service Worker (scope: /hu/app/)

const CACHE_VERSION = "fitnesslady-app-v1";

const APP_SHELL = [
  "/hu/app/",
  "/hu/app/index.html",
  "/hu/app/offline.html",
  "/hu/app/manifest.webmanifest",
  "/hu/app/pwa.js",

  // If present in your folder, they will be cached.
  "/hu/app/app.js",
  "/hu/app/style.css",

  // Icons
  "/hu/app/icons/icon-192.png",
  "/hu/app/icons/icon-512.png",
  "/hu/app/icons/icon-512-maskable.png",

  // Shared firebase helper (used by index.html module import)
  "/hu/shared/firebase.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      // addAll will fail if any file is missing -> use a tolerant approach
      await Promise.all(
        APP_SHELL.map(async (url) => {
          try { await cache.add(url); } catch (_) { /* ignore missing */ }
        })
      );
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_VERSION ? caches.delete(k) : null)));
      await self.clients.claim();
    })()
  );
});

// Network-first for navigations, SWR for assets
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only same-origin
  if (url.origin !== self.location.origin) return;

  // HTML navigation
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(CACHE_VERSION);
          cache.put(req, res.clone());
          return res;
        } catch (e) {
          const cached = await caches.match(req);
          return cached || (await caches.match("/hu/app/offline.html"));
        }
      })()
    );
    return;
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      const fetchPromise = (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(CACHE_VERSION);
          cache.put(req, res.clone());
          return res;
        } catch (e) {
          return cached;
        }
      })();

      return cached || fetchPromise;
    })()
  );
});
