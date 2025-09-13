// Service Worker to preserve COOP/COEP headers offline
// Ensures crossOriginIsolated remains true even when serving from cache

self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Only guard top-level navigations and same-origin assets
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      const net = fetch(request).catch(() => null);
      const resp = cached || await net;
      
      if (!resp) {
        return new Response('offline', { status: 503 });
      }
      
      // Clone and ensure COOP/COEP so crossOriginIsolated survives offline
      const headers = new Headers(resp.headers);
      headers.set('Cross-Origin-Opener-Policy', 'same-origin');
      headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
      
      return new Response(await resp.clone().arrayBuffer(), {
        status: resp.status,
        statusText: resp.statusText,
        headers
      });
    })());
  }
});
