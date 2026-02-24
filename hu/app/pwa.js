// FILE: /hu/app/pwa.js
// FitnessLady PWA bootstrap — safe, non-invasive.
(function () {
  const isLocalhost =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.hostname === "[::1]";

  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && !isLocalhost) return;

  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("/hu/app/sw.js", { scope: "/hu/app/" });
    } catch (e) {
      // No-op (kept silent in production)
    }
  });
})();
