import Fastify from 'fastify'

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss UTC',
        ignore: 'pid,hostname'
      }
    }
  }
})

// Register plugins
async function registerPlugins() {
  // CORS
  await fastify.register(import('@fastify/cors'), {
    origin: ['https://nyt.brainvaultdev.com', 'http://localhost:3000'],
    credentials: true
  })

  // Redis caching
  await fastify.register(import('@fastify/redis'), {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined
  })

  // Add caching decorators
  fastify.decorate('cache', {
    get: async (key: string) => {
      try {
        const cached = await fastify.redis.get(key)
        return cached ? JSON.parse(cached) : null
      } catch (error) {
        fastify.log.warn('Cache get error:', error)
        return null
      }
    },
    set: async (key: string, value: any, ttl = 600) => {
      try {
        await fastify.redis.setex(key, ttl, JSON.stringify(value))
        return true
      } catch (error) {
        fastify.log.warn('Cache set error:', error)
        return false
      }
    },
    del: async (key: string) => { 
      try {
        await fastify.redis.del(key)
        return true
      } catch (error) {
        fastify.log.warn('Cache del error:', error)
        return false
      }
    }
  })
}

// Register routes
async function registerRoutes() {
  // API info endpoint with caching
  fastify.get('/api', async (request, reply) => {
    const cacheKey = 'meta:api-info'
    
    try {
      const cached = await fastify.cache.get(cacheKey)
      if (cached) {
        return reply
          .header('etag', cached.etag)
          .header('x-cache', 'HIT')
          .send(cached.payload)
      }
    } catch (error) {
      fastify.log.warn('Cache get failed:', error)
    }

    const payload = {
      name: 'NYT News Explorer API',
      version: '1.0.0',
      description: 'High-performance, secure Node.js API with Redis caching',
      documentation: '/docs',
      health: '/health',
      features: {
        caching: ['Redis distributed cache', 'ETag support', 'TTL-based expiration'],
        performance: ['HTTP/2 support', 'Brotli compression', 'Response caching']
      }
    }

    const etag = `"${Buffer.from(JSON.stringify(payload)).toString('base64').slice(0, 16)}"`
    
    try {
      await fastify.cache.set(cacheKey, { etag, payload }, 60)
    } catch (error) {
      fastify.log.warn('Cache set failed:', error)
    }
    
    return reply
      .header('etag', etag)
      .header('x-cache', 'MISS')
      .header('cache-control', 'public, max-age=60, stale-while-revalidate=120')
      .send(payload)
  })

  // Health check
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  // Top Stories endpoint with caching
  fastify.get('/api/v1/articles/top-stories/:section', async (request, reply) => {
    const params = request.params as { section: string }
    const cacheKey = `top-stories:${params.section}`
    
    try {
      const cached = await fastify.cache.get(cacheKey)
      if (cached) {
        return reply
          .header('etag', cached.etag)
          .header('x-cache', 'HIT')
          .send(cached.payload)
      }
    } catch (error) {
      fastify.log.warn('Cache get failed:', error)
    }

    // Mock response for testing
    const payload = {
      status: 'OK',
      copyright: 'Copyright (c) 2025 The New York Times Company',
      section: params.section,
      num_results: 0,
      results: []
    }

    const etag = `"${Buffer.from(JSON.stringify(payload)).toString('base64').slice(0, 16)}"`
    
    try {
      await fastify.cache.set(cacheKey, { etag, payload }, 900) // 15 minutes
    } catch (error) {
      fastify.log.warn('Cache set failed:', error)
    }
    
    return reply
      .header('etag', etag)
      .header('x-cache', 'MISS')
      .header('cache-control', 'public, max-age=900, stale-while-revalidate=1800')
      .send(payload)
  })

  // Most Popular endpoint with caching
  fastify.get('/api/v1/articles/most-popular/:period', async (request, reply) => {
    const params = request.params as { period: string }
    const cacheKey = `most-popular:${params.period}`
    
    try {
      const cached = await fastify.cache.get(cacheKey)
      if (cached) {
        return reply
          .header('etag', cached.etag)
          .header('x-cache', 'HIT')
          .send(cached.payload)
      }
    } catch (error) {
      fastify.log.warn('Cache get failed:', error)
    }

    // Mock response for testing
    const payload = {
      status: 'OK',
      copyright: 'Copyright (c) 2025 The New York Times Company',
      num_results: 0,
      results: []
    }

    const etag = `"${Buffer.from(JSON.stringify(payload)).toString('base64').slice(0, 16)}"`
    
    try {
      await fastify.cache.set(cacheKey, { etag, payload }, 900) // 15 minutes
    } catch (error) {
      fastify.log.warn('Cache set failed:', error)
    }
    
    return reply
      .header('etag', etag)
      .header('x-cache', 'MISS')
      .header('cache-control', 'public, max-age=900, stale-while-revalidate=1800')
      .send(payload)
  })
}

// Start server
async function start() {
  try {
    await registerPlugins()
    await registerRoutes()
    
    const port = parseInt(process.env.PORT || '3000')
    const host = process.env.HOST || '0.0.0.0'
    
    await fastify.listen({ port, host })
    
    fastify.log.info('Server started successfully')
    fastify.log.info({ port, host, environment: process.env.NODE_ENV })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
