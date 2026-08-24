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

// পুশ নোটিফিকেশন গ্রহণ করা — সার্ভার (Edge Function) থেকে যা পাঠানো হবে তা
// দেখানোর কাজ এখানেই হয়। title/body/icon না পাঠানো হলে যুক্তিসঙ্গত ডিফল্ট
// ব্যবহার হয়, যাতে খালি নোটিফিকেশন কখনো না দেখায়।
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  const title = data.title || "আমার বাকির খাতা";
  const options = {
    body: data.body || "",
    icon: data.icon || "./icon-192.png",
    badge: "./icon-192.png",
    data: { url: data.url || "./" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// নোটিফিকেশনে ট্যাপ করলে অ্যাপটা খুলে যাবে — আগে থেকে খোলা কোনো ট্যাব
// থাকলে সেটাতেই ফোকাস করবে, নাহলে নতুন একটা খুলবে।
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
