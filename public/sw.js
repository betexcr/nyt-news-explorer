/**
 * Service Worker for NYT News Explorer
 * Handles static asset caching for better performance
 */

const STATIC_CACHE_NAME = 'nyt-static-v1';

// Static assets to cache (only your domain assets)
const STATIC_ASSETS = [
  '/',
  '/home-hero.jpg',
  '/home-hero-800.jpg',
  '/home-hero-1200.jpg',
  '/home-hero-1600.jpg',
  '/home-hero-2400.jpg',
  '/logo.png',
  '/logo.webp',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle requests from our domain
  if (url.origin !== location.origin) {
    return; // Let browser handle external requests (NYT images, etc.)
  }

  // Handle static assets with cache-first strategy
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // For other requests, use network-first strategy
  event.respondWith(handleNetworkFirst(request));
});


/**
 * Handle static asset requests with cache-first strategy
 */
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    console.log('Serving cached static asset:', request.url);
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const responseClone = response.clone();
      cache.put(request, responseClone);
      console.log('Cached static asset:', request.url);
    }
    
    return response;
  } catch (error) {
    console.error('Failed to fetch static asset:', request.url, error);
    throw error;
  }
}

/**
 * Handle other requests with network-first strategy
 */
async function handleNetworkFirst(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    console.error('Network request failed:', request.url, error);
    
    // Try to serve from cache as fallback
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('Serving cached fallback:', request.url);
      return cachedResponse;
    }
    
    throw error;
  }
}


console.log('Service Worker loaded');
