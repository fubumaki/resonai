const CACHE = 'resonai-app-v2';
const PRECACHE = [
  '/', '/flow', '/settings',
  '/dev/status', '/dev/pitch', '/dev/selftest',
  '/models/crepe-tiny.onnx',
  '/worklets/pitch-processor.js',
  '/worklets/loudness-processor.js',
  // add any .wasm, .onnx, chunks with content hashes as needed
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(PRECACHE);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

// Add COOP/COEP to navigations served from cache, and serve static assets cache-first
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const isNav = req.mode === 'navigate' || req.destination === 'document';
  const sameOrigin = new URL(req.url).origin === location.origin;

  event.respondWith((async () => {
    // Cache-first for same-origin static assets
    if (!isNav && sameOrigin) {
      const cached = await caches.match(req);
      if (cached) return cached;
      const net = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, net.clone());
      return net;
    }

    // Navigations: ensure COOP/COEP even from cache
    const cached = await caches.match(req);
    let resp = cached || await fetch(req).catch(() => null);
    if (!resp) return new Response('offline', { status: 503 });

    if (isNav) {
      const headers = new Headers(resp.headers);
      headers.set('Cross-Origin-Opener-Policy', 'same-origin');
      headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
      resp = new Response(await resp.arrayBuffer(), {
        status: resp.status, statusText: resp.statusText, headers
      });
    }
    return resp;
  })());
});
