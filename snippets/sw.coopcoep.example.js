// Service Worker header passthrough for COOP/COEP
// Only needed if your SW intercepts navigation requests

const CACHE_NAME = 'resonai-cache-v1';
const COOP_COEP_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('SW: Installing...');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('SW: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('SW: Serving cached navigation:', request.url);
          
          // Clone the response to add headers
          const response = cachedResponse.clone();
          const newHeaders = new Headers(response.headers);
          
          // Add COOP/COEP headers to cached responses
          Object.entries(COOP_COEP_HEADERS).forEach(([key, value]) => {
            newHeaders.set(key, value);
          });
          
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        }
        
        // If not cached, fetch from network
        return fetch(request).then((networkResponse) => {
          // Clone response to cache
          const responseToCache = networkResponse.clone();
          
          // Add COOP/COEP headers to network response
          const newHeaders = new Headers(networkResponse.headers);
          Object.entries(COOP_COEP_HEADERS).forEach(([key, value]) => {
            newHeaders.set(key, value);
          });
          
          // Cache the response
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          
          return new Response(networkResponse.body, {
            status: networkResponse.status,
            statusText: networkResponse.statusText,
            headers: newHeaders,
          });
        });
      })
    );
  }
  
  // Handle other requests (JS, CSS, images, etc.)
  else {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('SW: Serving cached resource:', request.url);
          return cachedResponse;
        }
        
        return fetch(request).then((networkResponse) => {
          // Cache successful responses
          if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          
          return networkResponse;
        });
      })
    );
  }
});

// Message handling for debug
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('SW: Loaded with COOP/COEP header passthrough');

