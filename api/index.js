import Fastify from 'fastify';
import cors from '@fastify/cors';
import redis from '@fastify/redis';
import { createHash } from 'crypto';

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

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

export default async (req, res) => {
  await fastify.ready();
  fastify.server.emit('request', req, res);
};
