// @ts-nocheck
/* eslint-disable no-undef -- Service Worker runtime provides self/caches globals */
/**
 * NukeHub browser service worker.
 *
 * Caches same-origin static assets and pages so the site keeps working
 * offline after the first visit. HTML pages use a stale-while-revalidate
 * strategy; hashed Astro assets use cache-first.
 */

const CACHE_NAME = "__CACHE_NAME__";
const PAGE_CACHE = `${CACHE_NAME}-pages`;
const STATIC_CACHE = `${CACHE_NAME}-static`;
const OFFLINE_PAGE = "/offline/";

const STATIC_EXTENSIONS =
  /\.(?:js|css|png|svg|webp|avif|jpg|jpeg|gif|woff2?|ttf|otf|ico|json|md)$/;

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(PAGE_CACHE).then((cache) =>
      cache.addAll(["/", "/manifest.json", "/offline/"]).catch(() => {
        // Some hosts may not serve an offline page; ignore if missing.
      }),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter(
                (key) =>
                  key.startsWith(`${CACHE_NAME}-`) &&
                  key !== PAGE_CACHE &&
                  key !== STATIC_CACHE,
              )
              .map((key) => caches.delete(key)),
          ),
        ),
    ]),
  );
});

function isSameOrigin(request) {
  try {
    return new URL(request.url).origin === self.location.origin;
  } catch {
    return false;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

async function networkWithCacheFallback(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;

    // If the request is for an HTML page and we have nothing, show offline.
    if (request.mode === "navigate") {
      const offline = await cache.match(OFFLINE_PAGE);
      if (offline) return offline;
    }

    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;
  if (!isSameOrigin(request)) return;

  const url = new URL(request.url);

  // Hashed Astro build assets and other static files: cache first.
  if (
    url.pathname.startsWith("/_astro/") ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/og/") ||
    STATIC_EXTENSIONS.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML navigations: try network, fall back to cache/offline page.
  if (request.mode === "navigate") {
    event.respondWith(networkWithCacheFallback(request, PAGE_CACHE));
    return;
  }

  // Everything else (HTML pages, manifest, etc.): stale-while-revalidate.
  event.respondWith(staleWhileRevalidate(request, PAGE_CACHE));
});
