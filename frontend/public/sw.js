/**
 * NEXBET service worker.
 *
 * Stratégie :
 *   - Static assets (JS/CSS/images/fonts) → cache-first
 *   - Data JSON (history / predictions) → network-first, cache fallback
 *   - HTML (navigation) → network-first, cache fallback
 *
 * Bump CACHE_VERSION pour forcer un refresh complet côté client.
 */
const CACHE_VERSION = "v1";
const STATIC_CACHE = `nexbet-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `nexbet-runtime-${CACHE_VERSION}`;

// Inferré au runtime depuis l'URL du SW pour rester compatible avec
// le basePath GitHub Pages ("/PRONOSTICS") sans hardcoder.
const SCOPE = new URL(self.registration?.scope || self.location.href).pathname;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll([
        SCOPE,
        `${SCOPE}manifest.json`,
        `${SCOPE}favicon.ico`,
      ].filter(Boolean)),
    ),
  );
  // Active immédiatement le nouveau SW (skip-waiting) — le client se
  // mettra à jour au prochain reload.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("nexbet-") && k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

function isDataRequest(url) {
  return url.pathname.includes("/data/") && url.pathname.endsWith(".json");
}

function isStaticAsset(url) {
  return /\.(?:js|css|woff2?|ttf|eot|png|jpg|jpeg|svg|webp|ico)$/i.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Cross-origin (fonts, supabase, stripe) → laisser passer sans cache.
  if (url.origin !== self.location.origin) return;

  // Data JSON → network-first
  if (isDataRequest(url)) {
    event.respondWith(networkFirst(req, RUNTIME_CACHE));
    return;
  }

  // Static assets → cache-first
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // HTML / navigation → network-first
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(networkFirst(req, RUNTIME_CACHE));
    return;
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    return cached || Response.error();
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Fallback ultime : la home (qui sera dans le cache statique).
    if (request.mode === "navigate") {
      const shell = await cache.match(SCOPE);
      if (shell) return shell;
    }
    return Response.error();
  }
}
