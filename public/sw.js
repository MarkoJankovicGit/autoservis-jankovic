// Service worker za instalaciju aplikacije na telefon (PWA).
// Podaci radnje se NE keširaju: privatni su i moraju uvek biti sveži.
// Keš drži samo stranu „Nema interneta“ i njen logo.
const CACHE = "jk-shell-v2";
const OFFLINE = "/offline.html";
const SHELL = [OFFLINE, "/brand/logo-on-dark.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate") {
    // strane uvek sa mreže; bez mreže strana „Nema interneta“
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
    return;
  }
  // logo za stranu „Nema interneta“; sve ostalo ide direktno na mrežu
  if (SHELL.includes(new URL(req.url).pathname)) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
  }
});
