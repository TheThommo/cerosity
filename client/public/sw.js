/*
 * Minimal service worker: exists so the app is installable, and caches the
 * install-time shell icons. Nothing else.
 *
 * It deliberately does NOT cache index.html, the JS bundle, or any /api
 * response. FLO's coaching is live and personal — a stale cached reply would
 * be worse than no reply — and a cached index.html is the classic way to pin
 * users to a dead build after a deploy. Everything except the handful of
 * precached icons passes straight through to the network.
 */
const CACHE = "cerosity-shell-v1";

// Static, content-stable assets only.
const SHELL = [
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!SHELL.includes(url.pathname)) return; // everything else: untouched network

  event.respondWith(caches.match(request).then((hit) => hit || fetch(request)));
});
