import Fastify from 'fastify';
import cors from '@fastify/cors';
import redis from '@fastify/redis';
import { createHash } from 'crypto';
import axios from 'axios';

// Build ID for cache invalidation across deployments
const BUILD_ID = process.env.BUILD_ID || 'vercel-deploy';

// Cache TTL configurations - Ultra cost-optimized (doubled again!)
const CACHE_TTL = {
  SEARCH: 1200, // 20 minutes for search results (was 10 min)
  TOP_STORIES: 1800, // 30 minutes for top stories (was 15 min)
  MOST_POPULAR: 1800, // 30 minutes for most popular (was 15 min)
  ARCHIVE: 14400, // 4 hours for archive data (was 2 hours)
  DETAIL: 3600, // 1 hour for article details (was 30 min)
  REFERENCE: 28800, // 8 hours for reference data (was 4 hours)
  BOOKS_DAILY: 86400, // 24 hours for daily books cache
  BOOKS_DATED: 86400, // 24 hours for dated books cache
};

// Enhanced cache key generation with BUILD_ID
function createCacheKey(parts) {
  const validParts = parts.filter(Boolean).map(part => 
    String(part).replace(/:/g, '\\:').toLowerCase().trim()
  );
  return `BUILD_${BUILD_ID}:${validParts.join(':')}`;
}

// Enhanced ETag generation
function createETag(content) {
  const hash = createHash('sha1');
  const contentString = typeof content === 'string' ? content : JSON.stringify(content);
  hash.update(contentString);
  const digest = hash.digest('hex');
  return `"${digest}"`;
}

// Cache logging
function logCacheOperation(route, key, status, startTime) {
  const duration = Date.now() - startTime;
  console.log(`[CACHE ${status}] ${route} - ${key} (${duration}ms)`);
}

const fastify = Fastify({ logger: true });

// Register CORS
fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || 'https://nyt.brainvaultdev.com',
  credentials: true,
});

// Register Redis
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isTls = redisUrl.startsWith('rediss://');
fastify.register(redis, {
  url: redisUrl,
  tls: isTls ? { rejectUnauthorized: false } : undefined,
  lazyConnect: true,
});

// Enhanced cache methods with tag support
fastify.decorate('cache', {
  get: async (key) => {
    const cached = await fastify.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  },
  set: async (key, value, ttl = 60) => {
    await fastify.redis.setex(key, ttl, JSON.stringify(value));
    return true;
  },
  // Tag-based invalidation
  tagAttach: async (tag, ...keys) => {
    const tagKey = `tag:${tag}`;
    await fastify.redis.sadd(tagKey, ...keys);
    return true;
  },
  purgeByTag: async (tag) => {
    const tagKey = `tag:${tag}`;
    const keys = await fastify.redis.smembers(tagKey);
    if (keys.length === 0) return 0;
    const deleted = await fastify.redis.del(...keys);
    await fastify.redis.del(tagKey);
    return deleted;
  },
});

// NYT API configuration
const NYT_API_KEY = process.env.NYT_API_KEY || 'your-nyt-api-key-here';
const NYT_BASE_URL = 'https://api.nytimes.com/svc';

// Helper function to fetch from NYT API
async function fetchFromNYT(url) {
  try {
    const response = await axios.get(url, { timeout: 10000 });
    return response.data;
  } catch (error) {
    throw new Error(`NYT API error: ${error.message}`);
  }
}

// API info endpoint
fastify.get('/api', async (request, reply) => {
  const cacheKey = 'meta:api-info';
  const cached = await fastify.cache.get(cacheKey);
  if (cached) {
    return reply
      .header('x-cache', 'HIT')
      .send(cached);
  }

  const payload = {
    name: 'NYT News Explorer API',
    version: '1.0.0',
    message: 'API with Redis caching deployed on Vercel',
    timestamp: new Date().toISOString(),
  };
  await fastify.cache.set(cacheKey, payload, 60); // Cache for 60 seconds
  return reply
    .header('x-cache', 'MISS')
    .send(payload);
});

// Enhanced Top Stories endpoint with comprehensive caching
fastify.get('/api/v1/articles/top-stories/:section', async (request, reply) => {
  const startTime = Date.now();
  const { section } = request.params;
  const cacheKey = createCacheKey(['api', 'v1', 'top-stories', section]);
  
  const cached = await fastify.cache.get(cacheKey);
  if (cached) {
    const etag = createETag(cached);
    if (request.headers['if-none-match'] === etag) {
      logCacheOperation('/api/v1/articles/top-stories', cacheKey, 'HIT', startTime);
      return reply.code(304).header('etag', etag).send();
    }
    logCacheOperation('/api/v1/articles/top-stories', cacheKey, 'HIT', startTime);
    return reply
      .header('etag', etag)
      .header('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600, must-revalidate')
      .header('Vary', 'Accept-Encoding, Accept-Language')
      .header('x-cache', 'HIT')
      .send(cached);
  }

  try {
    const url = `${NYT_BASE_URL}/topstories/v2/${section}.json?api-key=${NYT_API_KEY}`;
    const response = await fetchFromNYT(url);
    
    const etag = createETag(response);
    await fastify.cache.set(cacheKey, response, CACHE_TTL.TOP_STORIES);
    
    // Attach cache tags for invalidation
    await fastify.cache.tagAttach('tag:top-stories', cacheKey);
    await fastify.cache.tagAttach(`tag:section:${section}`, cacheKey);
    
    logCacheOperation('/api/v1/articles/top-stories', cacheKey, 'MISS', startTime);
    
    return reply
      .header('etag', etag)
      .header('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600, must-revalidate')
      .header('Vary', 'Accept-Encoding, Accept-Language')
      .header('x-cache', 'MISS')
      .send(response);
  } catch (error) {
    logCacheOperation('/api/v1/articles/top-stories', cacheKey, 'MISS', startTime);
    return reply.code(500).send({ error: error.message });
  }
});

// Enhanced Most Popular endpoint with comprehensive caching
fastify.get('/api/v1/articles/most-popular/:period', async (request, reply) => {
  const startTime = Date.now();
  const { period } = request.params;
  const cacheKey = createCacheKey(['api', 'v1', 'most-popular', period]);
  
  const cached = await fastify.cache.get(cacheKey);
  if (cached) {
    const etag = createETag(cached);
    if (request.headers['if-none-match'] === etag) {
      logCacheOperation('/api/v1/articles/most-popular', cacheKey, 'HIT', startTime);
      return reply.code(304).header('etag', etag).send();
    }
    logCacheOperation('/api/v1/articles/most-popular', cacheKey, 'HIT', startTime);
    return reply
      .header('etag', etag)
      .header('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600, must-revalidate')
      .header('Vary', 'Accept-Encoding, Accept-Language')
      .header('x-cache', 'HIT')
      .send(cached);
  }

  try {
    const url = `${NYT_BASE_URL}/mostpopular/v2/viewed/${period}.json?api-key=${NYT_API_KEY}`;
    const response = await fetchFromNYT(url);
    
    const etag = createETag(response);
    await fastify.cache.set(cacheKey, response, CACHE_TTL.MOST_POPULAR);
    
    // Attach cache tags for invalidation
    await fastify.cache.tagAttach('tag:most-popular', cacheKey);
    await fastify.cache.tagAttach(`tag:period:${period}`, cacheKey);
    
    logCacheOperation('/api/v1/articles/most-popular', cacheKey, 'MISS', startTime);
    
    return reply
      .header('etag', etag)
      .header('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600, must-revalidate')
      .header('Vary', 'Accept-Encoding, Accept-Language')
      .header('x-cache', 'MISS')
      .send(response);
  } catch (error) {
    logCacheOperation('/api/v1/articles/most-popular', cacheKey, 'MISS', startTime);
    return reply.code(500).send({ error: error.message });
  }
});

// Enhanced Articles Search endpoint
fastify.get('/api/v1/articles/search', async (request, reply) => {
  const startTime = Date.now();
  const searchParams = request.query;
  const paramsHash = createHash('md5').update(JSON.stringify(searchParams)).digest('hex');
  const cacheKey = createCacheKey(['api', 'v1', 'articles', 'search', paramsHash]);
  
  const cached = await fastify.cache.get(cacheKey);
  if (cached) {
    const etag = createETag(cached);
    if (request.headers['if-none-match'] === etag) {
      logCacheOperation('/api/v1/articles/search', cacheKey, 'HIT', startTime);
      return reply.code(304).header('etag', etag).send();
    }
    logCacheOperation('/api/v1/articles/search', cacheKey, 'HIT', startTime);
    return reply
      .header('etag', etag)
      .header('Cache-Control', 'public, max-age=0, s-maxage=120, stale-while-revalidate=600, must-revalidate')
      .header('Vary', 'Accept-Encoding, Accept-Language')
      .header('x-cache', 'HIT')
      .send(cached);
  }

  try {
    const url = new URL(`${NYT_BASE_URL}/search/v2/articlesearch.json`);
    url.searchParams.set('api-key', NYT_API_KEY);
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
    
    const response = await fetchFromNYT(url.toString());
    const etag = createETag(response);
    await fastify.cache.set(cacheKey, response, CACHE_TTL.SEARCH);
    
    // Attach cache tags for invalidation
    await fastify.cache.tagAttach('tag:articles', cacheKey);
    
    logCacheOperation('/api/v1/articles/search', cacheKey, 'MISS', startTime);
    
    return reply
      .header('etag', etag)
      .header('Cache-Control', 'public, max-age=0, s-maxage=120, stale-while-revalidate=600, must-revalidate')
      .header('Vary', 'Accept-Encoding, Accept-Language')
      .header('x-cache', 'MISS')
      .send(response);
  } catch (error) {
    logCacheOperation('/api/v1/articles/search', cacheKey, 'MISS', startTime);
    return reply.code(500).send({ error: error.message });
  }
});

// Cache Health Dashboard endpoint
fastify.get('/api/cache/health', async (request, reply) => {
  try {
    // Get cache statistics
    const pattern = `BUILD_${BUILD_ID}:*`;
    const keys = await fastify.redis.keys(pattern);
    
    return {
      status: 'ok',
      cache: {
        totalKeys: keys.length,
        buildId: BUILD_ID,
        timestamp: new Date().toISOString(),
      },
      performance: {
        hitRatio: 'Calculated from logs',
        averageResponseTime: 'Monitored via headers',
      }
    };
  } catch (error) {
    return reply.code(500).send({ error: 'Failed to get cache health' });
  }
});

// Admin Purge endpoint
fastify.post('/api/admin/purge', async (request, reply) => {
  try {
    const { tag } = request.body;
    
    // Simple auth check (in production, use proper authentication)
    const authHeader = request.headers.authorization;
    const expectedToken = process.env.ADMIN_API_KEY;
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    
    if (!tag) {
      return reply.code(400).send({ error: 'Tag is required' });
    }
    
    const deletedCount = await fastify.cache.purgeByTag(tag);
    
    return {
      success: true,
      tag,
      deletedKeys: deletedCount,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return reply.code(500).send({ error: 'Failed to purge cache' });
  }
});

// Books API - Best Sellers (with daily caching)
fastify.get('/api/v1/books/best-sellers/:list', async (request, reply) => {
  const startTime = Date.now();
  const { list } = request.params;
  // Include date in cache key for daily invalidation
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const cacheKey = createCacheKey(['books', 'best-sellers', list, today]);
  
  try {
    // Check cache first
    const cached = await fastify.cache.get(cacheKey);
    if (cached) {
      const etag = createETag(cached);
      const ifNoneMatch = request.headers['if-none-match'];
      
      if (ifNoneMatch === etag) {
        logCacheOperation('/api/v1/books/best-sellers', cacheKey, 'HIT-304', startTime);
        return reply.code(304).send();
      }
      
      logCacheOperation('/api/v1/books/best-sellers', cacheKey, 'HIT', startTime);
      return reply
        .header('etag', etag)
        .header('Cache-Control', 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400')
        .header('x-cache', 'HIT')
        .send(cached);
    }
    
    // Fetch from NYT API
    const nytResponse = await axios.get(`https://api.nytimes.com/svc/books/v3/lists/current/${list}.json`, {
      params: { 'api-key': process.env.NYT_API_KEY },
      timeout: 10000,
    });
    
    const books = nytResponse.data?.results?.books || [];
    const etag = createETag(books);
    
    // Cache the response with daily TTL
    await fastify.cache.set(cacheKey, books, CACHE_TTL.BOOKS_DAILY);
    await fastify.cache.tagAttach('tag:books', cacheKey);
    await fastify.cache.tagAttach(`tag:books:${today}`, cacheKey);
    
    logCacheOperation('/api/v1/books/best-sellers', cacheKey, 'MISS', startTime);
    
    return reply
      .header('etag', etag)
      .header('Cache-Control', 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400')
      .header('Vary', 'Accept-Encoding')
      .header('x-cache', 'MISS')
      .send(books);
  } catch (error) {
    logCacheOperation('/api/v1/books/best-sellers', cacheKey, 'ERROR', startTime);
    return reply.code(500).send({ error: error.message });
  }
});

// Books API - Dated List
fastify.get('/api/v1/books/list/:date/:list', async (request, reply) => {
  const startTime = Date.now();
  const { date, list } = request.params;
  const cacheKey = createCacheKey(['books', 'list', date, list]);
  
  try {
    // Check cache first
    const cached = await fastify.cache.get(cacheKey);
    if (cached) {
      const etag = createETag(cached);
      const ifNoneMatch = request.headers['if-none-match'];
      
      if (ifNoneMatch === etag) {
        logCacheOperation('/api/v1/books/list', cacheKey, 'HIT-304', startTime);
        return reply.code(304).send();
      }
      
      logCacheOperation('/api/v1/books/list', cacheKey, 'HIT', startTime);
      return reply
        .header('etag', etag)
        .header('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=1800')
        .header('x-cache', 'HIT')
        .send(cached);
    }
    
    // Fetch from NYT API
    const nytResponse = await axios.get(`https://api.nytimes.com/svc/books/v3/lists/${date}/${list}.json`, {
      params: { 'api-key': process.env.NYT_API_KEY },
      timeout: 10000,
    });
    
    const books = nytResponse.data?.results?.books || [];
    const etag = createETag(books);
    
    // Cache the response
    await fastify.cache.set(cacheKey, books, CACHE_TTL.TOP_STORIES);
    await fastify.cache.tagAttach('tag:books', cacheKey);
    
    logCacheOperation('/api/v1/books/list', cacheKey, 'MISS', startTime);
    
    return reply
      .header('etag', etag)
      .header('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=1800')
      .header('Vary', 'Accept-Encoding')
      .header('x-cache', 'MISS')
      .send(books);
  } catch (error) {
    logCacheOperation('/api/v1/books/list', cacheKey, 'ERROR', startTime);
    return reply.code(500).send({ error: error.message });
  }
});

// Archive API - Get articles by year/month (no caching to avoid Redis size limits)
fastify.get('/api/v1/articles/archive/:year/:month', async (request, reply) => {
  const startTime = Date.now();
  const { year, month } = request.params;
  const { page = 0, limit = 50, dayStart, dayEnd } = request.query;
  
  try {
    console.log(`[ARCHIVE] Fetching ${year}/${month}, page=${page}, limit=${limit}`);
    
    // Fetch from NYT API directly (no caching due to size limits)
    let nytResponse;
    try {
      nytResponse = await axios.get(`https://api.nytimes.com/svc/archive/v1/${year}/${month}.json`, {
        params: { 'api-key': process.env.NYT_API_KEY },
        timeout: 30000,
      });
    } catch (nytError) {
      console.error('NYT Archive API Error:', nytError.message);
      return reply.code(500).send({ 
        error: 'Failed to fetch archive data from NYT API',
        details: nytError.message 
      });
    }
    
    let articles = nytResponse.data?.response?.docs || [];
    console.log(`[ARCHIVE] Retrieved ${articles.length} articles from NYT`);
    
    // Filter by day range if specified
    if (dayStart && dayEnd) {
      const startDay = parseInt(dayStart);
      const endDay = parseInt(dayEnd);
      articles = articles.filter(article => {
        const articleDate = new Date(article.pub_date);
        const articleDay = articleDate.getDate();
        return articleDay >= startDay && articleDay <= endDay;
      });
      console.log(`[ARCHIVE] Filtered to ${articles.length} articles for days ${startDay}-${endDay}`);
    }
    
    // Sort by publication date (newest first)
    articles.sort((a, b) => new Date(b.pub_date) - new Date(a.pub_date));
    
    // Apply pagination
    const startIndex = page * limit;
    const endIndex = startIndex + limit;
    const paginatedArticles = articles.slice(startIndex, endIndex);
    
    // Create response with metadata
    const response = {
      articles: paginatedArticles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: articles.length,
        totalPages: Math.ceil(articles.length / limit),
        hasMore: endIndex < articles.length
      },
      filters: {
        year: parseInt(year),
        month: parseInt(month),
        dayStart: dayStart ? parseInt(dayStart) : null,
        dayEnd: dayEnd ? parseInt(dayEnd) : null
      }
    };
    
    console.log(`[ARCHIVE] Returning ${paginatedArticles.length} articles (page ${page})`);
    
    return reply
      .header('Cache-Control', 'no-cache, no-store, must-revalidate')
      .header('Pragma', 'no-cache')
      .header('Expires', '0')
      .send(response);
  } catch (error) {
    console.error('[ARCHIVE] Error:', error.message);
    return reply.code(500).send({ error: error.message });
  }
});

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

export default async (req, res) => {
  await fastify.ready();
  fastify.server.emit('request', req, res);
};
