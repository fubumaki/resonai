// ECRR-01: Cross-Origin Isolation Service Worker
// Preserves COOP/COEP headers for offline continuity

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const isDoc =
    req.mode === "navigate" ||
    req.destination === "document" ||
    req.destination === "worker";
  
  if (!isDoc) return;

  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        const headers = new Headers(res.headers);
        
        // Preserve COI headers for offline continuity
        headers.set("Cross-Origin-Opener-Policy", "same-origin");
        headers.set("Cross-Origin-Embedder-Policy", "require-corp");
        
        return new Response(res.body, {
          status: res.status,
          statusText: res.statusText,
          headers,
        });
      } catch (error) {
        // Fallback for offline scenarios
        console.warn("SW fetch failed, using cache:", error);
        return caches.match(req);
      }
    })(),
  );
});

// Register service worker after first COI load
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/coi-keepalive-sw.js")
      .then(reg => console.log("COI SW registered:", reg))
      .catch(err => console.warn("COI SW registration failed:", err));
  });
}
