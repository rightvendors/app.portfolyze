const CACHE_NAME = 'portfolio-cache-v1';
const DATA_CACHE_NAME = 'portfolio-data-v1';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/static/js/bundle.js',
        '/static/css/main.css'
      ]);
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  // Handle API requests for cached data
  if (event.request.url.includes('/api/cache/')) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            // Return cached data
            return response;
          }
          
          // Fetch from network and cache
          return fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // Handle static assets
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Background sync for data updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-data-sync') {
    event.waitUntil(syncData());
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-data-sync') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  try {
    // This would typically make API calls to update cached data
    // For now, we'll just log the sync attempt
    console.log('Background data sync initiated');
    
    // You can add actual data fetching logic here
    // const response = await fetch('/api/update-cache');
    // const data = await response.json();
    
    // Update cache with new data
    // await updateCache(data);
    
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function updateCache(data) {
  const cache = await caches.open(DATA_CACHE_NAME);
  
  // Update cached data
  const response = new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  await cache.put('/api/cache/data', response);
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    event.ports[0].postMessage({
      type: 'CACHE_STATUS',
      data: { cacheName: CACHE_NAME, dataCacheName: DATA_CACHE_NAME }
    });
  }
}); 