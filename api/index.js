import Fastify from 'fastify';
import cors from '@fastify/cors';
import redis from '@fastify/redis';
import { createHash } from 'crypto';
import axios from 'axios';

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

// Decorate fastify with cache methods
fastify.decorate('cache', {
  get: async (key) => {
    const cached = await fastify.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  },
  set: async (key, value, ttl = 60) => {
    await fastify.redis.setex(key, ttl, JSON.stringify(value));
    return true;
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

// Top Stories endpoint
fastify.get('/api/v1/articles/top-stories/:section', async (request, reply) => {
  const { section } = request.params;
  const cacheKey = `top-stories:${section}`;
  
  const cached = await fastify.cache.get(cacheKey);
  if (cached) {
    const etag = `"${createHash('md5').update(JSON.stringify(cached)).digest('hex')}"`;
    if (request.headers['if-none-match'] === etag) {
      return reply.code(304).send();
    }
    return reply
      .header('etag', etag)
      .header('x-cache', 'HIT')
      .send(cached);
  }

  try {
    const url = `${NYT_BASE_URL}/topstories/v2/${section}.json?api-key=${NYT_API_KEY}`;
    const response = await fetchFromNYT(url);
    
    const etag = `"${createHash('md5').update(JSON.stringify(response)).digest('hex')}"`;
    await fastify.cache.set(cacheKey, response, 900); // Cache for 15 minutes
    
    return reply
      .header('etag', etag)
      .header('x-cache', 'MISS')
      .header('Cache-Control', 'public, max-age=900, stale-while-revalidate=1800')
      .send(response);
  } catch (error) {
    return reply.code(500).send({ error: error.message });
  }
});

// Most Popular endpoint
fastify.get('/api/v1/articles/most-popular/:period', async (request, reply) => {
  const { period } = request.params;
  const cacheKey = `most-popular:${period}`;
  
  const cached = await fastify.cache.get(cacheKey);
  if (cached) {
    const etag = `"${createHash('md5').update(JSON.stringify(cached)).digest('hex')}"`;
    if (request.headers['if-none-match'] === etag) {
      return reply.code(304).send();
    }
    return reply
      .header('etag', etag)
      .header('x-cache', 'HIT')
      .send(cached);
  }

  try {
    const url = `${NYT_BASE_URL}/mostpopular/v2/viewed/${period}.json?api-key=${NYT_API_KEY}`;
    const response = await fetchFromNYT(url);
    
    const etag = `"${createHash('md5').update(JSON.stringify(response)).digest('hex')}"`;
    await fastify.cache.set(cacheKey, response, 900); // Cache for 15 minutes
    
    return reply
      .header('etag', etag)
      .header('x-cache', 'MISS')
      .header('Cache-Control', 'public, max-age=900, stale-while-revalidate=1800')
      .send(response);
  } catch (error) {
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
