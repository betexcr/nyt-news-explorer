import Fastify from 'fastify';
import cors from '@fastify/cors';
import redis from '@fastify/redis';
import { createHash } from 'crypto';
import axios from 'axios';

// Build ID for cache invalidation across deployments
const BUILD_ID = process.env.BUILD_ID || 'vercel-deploy';

// Cache TTL configurations
const CACHE_TTL = {
  SEARCH: 120, // 2 minutes for search results
  TOP_STORIES: 300, // 5 minutes for top stories
  MOST_POPULAR: 300, // 5 minutes for most popular
  ARCHIVE: 3600, // 1 hour for archive data
  DETAIL: 300, // 5 minutes for article details
  REFERENCE: 3600, // 1 hour for reference data
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

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

export default async (req, res) => {
  await fastify.ready();
  fastify.server.emit('request', req, res);
};
