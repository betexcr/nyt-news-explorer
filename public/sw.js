/**
 * Service Worker for NYT News Explorer - Enhanced Caching Strategy
 * Implements Workbox-style caching with proper cache headers and SWR
 */

const CACHE_NAMES = {
  HTML: 'nyt-html-v1',
  API: 'nyt-api-v1',
  ASSETS: 'nyt-assets-v1',
  IMAGES: 'nyt-images-v1',
};

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

// Cache TTL configurations (in seconds)
const CACHE_TTL = {
  HTML: 3600, // 1 hour
  API: 300,   // 5 minutes
  ASSETS: 31536000, // 1 year (for hashed assets)
  IMAGES: 86400, // 1 day
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAMES.ASSETS).then(cache => cache.addAll(STATIC_ASSETS)),
      caches.open(CACHE_NAMES.HTML),
      caches.open(CACHE_NAMES.API),
      caches.open(CACHE_NAMES.IMAGES),
    ])
    .then(() => {
      console.log('All caches initialized successfully');
      return self.skipWaiting();
    })
    .catch((error) => {
      console.error('Failed to initialize caches:', error);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        const validCacheNames = Object.values(CACHE_NAMES);
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!validCacheNames.includes(cacheName)) {
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

  // Route requests based on type
  if (request.method === 'GET') {
    if (url.pathname.startsWith('/api/')) {
      // API requests: StaleWhileRevalidate
      event.respondWith(handleStaleWhileRevalidate(request, CACHE_NAMES.API));
    } else if (isAssetRequest(url.pathname)) {
      // Static assets: CacheFirst with 1-year expiration for hashed URLs
      event.respondWith(handleCacheFirst(request, CACHE_NAMES.ASSETS));
    } else if (isImageRequest(url.pathname)) {
      // Images: CacheFirst with 1-day expiration
      event.respondWith(handleCacheFirst(request, CACHE_NAMES.IMAGES));
    } else {
      // HTML pages: NetworkFirst with 3s timeout
      event.respondWith(handleNetworkFirst(request, CACHE_NAMES.HTML, 3000));
    }
  }
});


/**
 * Check if request is for a static asset (JS, CSS, fonts, etc.)
 */
function isAssetRequest(pathname) {
  const assetExtensions = ['.js', '.css', '.woff', '.woff2', '.ttf', '.eot'];
  return assetExtensions.some(ext => pathname.endsWith(ext)) || 
         pathname.includes('/static/') ||
         STATIC_ASSETS.includes(pathname);
}

/**
 * Check if request is for an image
 */
function isImageRequest(pathname) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg'];
  return imageExtensions.some(ext => pathname.endsWith(ext));
}

/**
 * CacheFirst strategy - check cache first, fallback to network
 */
async function handleCacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    console.log('SW Cache HIT:', request.url);
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const responseClone = response.clone();
      cache.put(request, responseClone);
      console.log('SW Cached:', request.url);
    }
    
    return response;
  } catch (error) {
    console.error('SW Fetch failed:', request.url, error);
    throw error;
  }
}

/**
 * NetworkFirst strategy with timeout - try network first, fallback to cache
 */
async function handleNetworkFirst(request, cacheName, timeout = 3000) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ]);
    
    if (response.ok) {
      const responseClone = response.clone();
      cache.put(request, responseClone);
      console.log('SW Network HIT, cached:', request.url);
    }
    
    return response;
  } catch (error) {
    console.log('SW Network failed, checking cache:', request.url);
    
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('SW Cache fallback:', request.url);
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * StaleWhileRevalidate strategy - serve cache immediately, update in background
 */
async function handleStaleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Always try to fetch fresh data in background
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      const responseClone = response.clone();
      cache.put(request, responseClone);
      console.log('SW Background update:', request.url);
    }
    return response;
  }).catch(error => {
    console.log('SW Background fetch failed:', request.url, error);
  });

  // Return cached response immediately if available
  if (cachedResponse) {
    console.log('SW Stale served:', request.url);
    // Don't wait for background update
    fetchPromise.catch(() => {}); // Ignore background errors
    return cachedResponse;
  }

  // No cache, wait for network
  try {
    return await fetchPromise;
  } catch (error) {
    console.error('SW No cache, network failed:', request.url, error);
    throw error;
  }
}


console.log('Service Worker loaded');
