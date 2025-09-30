import type { Context } from "https://edge.netlify.com";

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  
  // Only process API requests
  if (!url.pathname.startsWith('/api/')) {
    return;
  }

  // Create cache key based on URL and query params
  const cacheKey = `api-cache:${url.pathname}:${url.search}`;
  
  // Check if we have cached data
  const cached = await context.cache.get(cacheKey);
  
  if (cached) {
    const cacheEntry: CacheEntry = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - cacheEntry.timestamp < cacheEntry.ttl) {
      return new Response(JSON.stringify(cacheEntry.data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300, s-maxage=300',
          'X-Cache': 'HIT',
          'X-Cache-TTL': Math.max(0, Math.floor((cacheEntry.ttl - (now - cacheEntry.timestamp)) / 1000)).toString()
        }
      });
    }
  }

  // Cache miss or expired - fetch from origin
  try {
    const originUrl = new URL(request.url);
    originUrl.hostname = 'api.nytimes.com';
    originUrl.protocol = 'https:';
    
    const originRequest = new Request(originUrl.toString(), {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers),
        'User-Agent': 'NYT-News-Explorer/1.0 (https://nyt.brainvaultdev.com)'
      }
    });

    const response = await fetch(originRequest);
    
    if (!response.ok) {
      return response;
    }

    const data = await response.json();
    
    // Determine cache TTL based on endpoint
    let ttl = 300; // 5 minutes default
    if (url.pathname.includes('/mostpopular')) {
      ttl = 900; // 15 minutes for popular articles
    } else if (url.pathname.includes('/search')) {
      ttl = 600; // 10 minutes for search results
    } else if (url.pathname.includes('/archive')) {
      ttl = 3600; // 1 hour for archive data
    }

    // Cache the response
    const cacheEntry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl * 1000
    };

    await context.cache.set(cacheKey, JSON.stringify(cacheEntry), { ttl });

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${ttl}, s-maxage=${ttl}`,
        'X-Cache': 'MISS',
        'X-Cache-TTL': ttl.toString()
      }
    });

  } catch (error) {
    console.error('API cache error:', error);
    return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }
};

