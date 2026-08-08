const CACHE_NAME = "dokankhata-v2";
const CORE_ASSETS = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // cache:"reload" bypasses the browser's own HTTP cache while precaching,
      // so this always grabs the truly latest files, not a stale copy of them.
      cache.addAll(CORE_ASSETS.map((url) => new Request(url, { cache: "reload" })))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first: every request tries the network first, so a fresh GitHub
// deploy shows up immediately without clearing the browser. Only when the
// network request fails (genuinely offline) does it fall back to whatever
// was last cached, which is what keeps the app usable without internet.
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
