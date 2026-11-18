/* Cache only this application's public shell; personal data stays in browser storage. */
const CACHE = "lfm-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(["/", "/items", "/inquiries", "/handover", "/icon.svg"])));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("lfm-shell-") && key !== CACHE).map((key) => caches.delete(key)))));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin || request.headers.has("RSC")) return;
  event.respondWith(fetch(request).then((response) => {
    if (response.ok && (request.mode === "navigate" || new URL(request.url).pathname.startsWith("/_next/static/"))) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
    }
    return response;
  }).catch(async () => (await caches.match(request)) || (request.mode === "navigate" ? await caches.match("/") : undefined) || Response.error()));
});
