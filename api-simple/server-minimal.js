const fastify = require('fastify')({
  logger: true
});

// CORS
fastify.register(require('@fastify/cors'), {
  origin: ['https://nyt.brainvaultdev.com', 'http://localhost:3000'],
  credentials: true
});

// Redis
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isTls = redisUrl.startsWith('rediss://');

fastify.register(require('@fastify/redis'), {
  url: redisUrl,
  tls: isTls ? {} : undefined
});

// Cache decorator
fastify.decorate('cache', {
  get: async (key) => {
    try {
      const cached = await fastify.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  },
  set: async (key, value, ttl = 600) => {
    try {
      await fastify.redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('Cache set error:', error);
      return false;
    }
  }
});

// Routes
fastify.get('/api', async (request, reply) => {
  const cacheKey = 'meta:api-info';
  
  try {
    const cached = await fastify.cache.get(cacheKey);
    if (cached) {
      return reply
        .header('etag', cached.etag)
        .header('x-cache', 'HIT')
        .send(cached.payload);
    }
  } catch (error) {
    console.warn('Cache get failed:', error);
  }

  const payload = {
    name: 'NYT News Explorer API',
    version: '1.0.0',
    description: 'API with Redis caching',
    features: ['Redis cache', 'ETag support', 'TTL-based expiration']
  };

  const etag = `"${Buffer.from(JSON.stringify(payload)).toString('base64').slice(0, 16)}"`;
  
  try {
    await fastify.cache.set(cacheKey, { etag, payload }, 60);
  } catch (error) {
    console.warn('Cache set failed:', error);
  }
  
  return reply
    .header('etag', etag)
    .header('x-cache', 'MISS')
    .header('cache-control', 'public, max-age=60')
    .send(payload);
});

fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

fastify.get('/api/v1/articles/top-stories/:section', async (request, reply) => {
  const params = request.params;
  const cacheKey = `top-stories:${params.section}`;
  
  try {
    const cached = await fastify.cache.get(cacheKey);
    if (cached) {
      return reply
        .header('etag', cached.etag)
        .header('x-cache', 'HIT')
        .send(cached.payload);
    }
  } catch (error) {
    console.warn('Cache get failed:', error);
  }

  const payload = {
    status: 'OK',
    section: params.section,
    num_results: 0,
    results: []
  };

  const etag = `"${Buffer.from(JSON.stringify(payload)).toString('base64').slice(0, 16)}"`;
  
  try {
    await fastify.cache.set(cacheKey, { etag, payload }, 900);
  } catch (error) {
    console.warn('Cache set failed:', error);
  }
  
  return reply
    .header('etag', etag)
    .header('x-cache', 'MISS')
    .header('cache-control', 'public, max-age=900')
    .send(payload);
});

fastify.get('/api/v1/articles/most-popular/:period', async (request, reply) => {
  const params = request.params;
  const cacheKey = `most-popular:${params.period}`;
  
  try {
    const cached = await fastify.cache.get(cacheKey);
    if (cached) {
      return reply
        .header('etag', cached.etag)
        .header('x-cache', 'HIT')
        .send(cached.payload);
    }
  } catch (error) {
    console.warn('Cache get failed:', error);
  }

  const payload = {
    status: 'OK',
    num_results: 0,
    results: []
  };

  const etag = `"${Buffer.from(JSON.stringify(payload)).toString('base64').slice(0, 16)}"`;
  
  try {
    await fastify.cache.set(cacheKey, { etag, payload }, 900);
  } catch (error) {
    console.warn('Cache set failed:', error);
  }
  
  return reply
    .header('etag', etag)
    .header('x-cache', 'MISS')
    .header('cache-control', 'public, max-age=900')
    .send(payload);
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`Server listening on ${host}:${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
