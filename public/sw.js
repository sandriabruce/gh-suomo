// Minimal service worker for PWA installability. No caching to avoid stale content.
// Bump CACHE_VERSION whenever shipped assets need to force-evict on installed PWAs.
const CACHE_VERSION = "v2-spicy-crimson-20260521";

self.addEventListener("install", (e) => self.skipWaiting());

self.addEventListener("activate", (e) =>
  e.waitUntil(
    (async () => {
      // Nuke any caches left behind by previous SW versions so the next
      // navigation pulls a fresh HTML/CSS bundle (fixes stuck brown theme
      // on installed PWAs that cached the pre-spicy build).
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      clients.forEach((c) => {
        try { c.postMessage({ type: "sw-cache-version", version: CACHE_VERSION }); } catch {}
      });
    })(),
  ),
);

self.addEventListener("fetch", () => { /* pass-through */ });