// public/sw.js
const V = "resonai-v1";
const APP_SHELL = [
  "/",
  "/about",
  "/dev/pitch",
  "/dev/selftest",
  "/dev/status",
  "/flow",
  "/flows/daily_v1.json",
  "/flows/daily_v1_with_coach.json",
  "/icons/icon-192.png",
  "/icons/icon-192.svg",
  "/icons/icon-512.png",
  "/icons/icon-512.svg",
  "/icons/maskable-icon-512.png",
  "/icons/maskable-icon-512.svg",
  "/manifest.webmanifest",
  "/settings",
  "/worklets/energy-processor.js",
  "/worklets/lpc-processor.js",
  "/worklets/pitch-processor.js",
  "/worklets/pitch.worklet.js",
  "/worklets/spectral-processor.js"
];

const COOP_COEP_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

const withCoopCoep = (response) => {
  if (!response || response.type === "opaque") return response;
  const clone = response.clone();
  const headers = new Headers(clone.headers);
  Object.entries(COOP_COEP_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return new Response(clone.body, {
    status: clone.status,
    statusText: clone.statusText,
    headers,
  });
};

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Cache hashed Next.js chunks aggressively (cache-first)
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith((async () => {
      const cache = await caches.open(V);
      const cached = await cache.match(request);
      if (cached) return withCoopCoep(cached);
      const res = await fetch(request);
      if (res.ok && res.type !== "opaque") cache.put(request, res.clone());
      return withCoopCoep(res);
    })());
    return;
  }

  // Never cache API routes or audio
  if (url.pathname.startsWith("/api/") || url.pathname.endsWith(".mp3") || url.pathname.endsWith(".wav")) return;

  // Stale-while-revalidate for everything else
  e.respondWith((async () => {
    const cache = await caches.open(V);
    const cached = await cache.match(request);
    const fetcher = fetch(request)
      .then((res) => {
        if (res.ok && res.type !== "opaque") cache.put(request, res.clone());
        return withCoopCoep(res);
      })
      .catch(() => Response.error());
    return cached ? withCoopCoep(cached) : fetcher;
  })());
});
