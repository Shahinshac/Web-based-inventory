// Service Worker for 26:07 Electronics Inventory App
const CACHE_NAME = '2607-inventory-v2.0.1';
const OFFLINE_URL = '/offline.html';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker installed');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass Service Worker for health checks and specific routes
  if (url.pathname === '/health') {
    return; // Let browser handle it natively
  }

  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    // Bypass SW for critical authentication requests
    if (url.pathname.includes('/auth') || url.pathname.includes('/users/login') || url.pathname.includes('/users/send-otp') || url.pathname.includes('/users/verify-otp')) {
      return; // Natively let browser handle this so CORS and fetches process cleanly
    }
    
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle health check requests (for offline detection)
  if (url.pathname === '/health') {
    event.respondWith(handleHealthCheck(request));
    return;
  }

  // Handle navigation requests (pages)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle static assets
  event.respondWith(handleStaticAssetRequest(request));
});

// API request handler - Network first, then cache
async function handleApiRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful GET requests
    if (request.method === 'GET' && networkResponse.ok) {
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
      console.log('📡 Cached API response:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🔌 Network failed, trying cache:', request.url);
    
    // ONLY return offline response for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        console.log('📦 Serving from cache:', request.url);
        return cachedResponse;
      }

      return new Response(
        JSON.stringify({ 
          error: 'Offline', 
          message: 'This feature requires an internet connection',
          status: 503,
          offline: true 
        }), 
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // For POST/PUT/DELETE, throw error to let UI handle it
    throw error;
  }
}

// Health check handler - Network only (no cache)
async function handleHealthCheck(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Return offline response if health check fails
    console.log('🔌 Health check failed - offline');
    return new Response(
      JSON.stringify({
        error: 'Offline',
        offline: true
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Navigation request handler - Cache first for SPA
async function handleNavigationRequest(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // If network fails, serve cached index.html for SPA routing
    console.log('🔌 Navigation offline, serving cached app');
    
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match('/');
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to offline page
    return cache.match(OFFLINE_URL);
  }
}

// Static asset handler - Cache first
async function handleStaticAssetRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Try network and cache
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
    }
    return networkResponse;
  } catch (error) {
    console.log('❌ Failed to fetch asset:', request.url);

    // Return a fallback for images
    if (request.destination === 'image') {
      return new Response('', { status: 204 });
    }

    // For other assets, return 503 instead of throwing
    return new Response('Asset not available', { status: 503 });
  }
}

// Background sync for offline transactions
self.addEventListener('sync', (event) => {
  if (event.tag === 'offline-transactions') {
    console.log('🔄 Background sync: Processing offline transactions');
    event.waitUntil(syncOfflineTransactions());
  }
});

// Sync offline transactions when back online
async function syncOfflineTransactions() {
  try {
    console.log('🔄 Syncing offline transactions...');
    // Implementation for syncing offline data would go here
    // This is a placeholder for future offline functionality
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'general',
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/icon-192.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } else {
    const options = {
      body: 'New notification from 26:07 Electronics',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'inventory-notification',
      requireInteraction: false
    };

    event.waitUntil(
      self.registration.showNotification('26:07 Inventory', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('🔧 Service Worker loaded successfully');