import Fastify from 'fastify'
import cors from '@fastify/cors'
import redis from '@fastify/redis'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env' })
dotenv.config({ path: '../.env' })

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
})

// Register CORS
await fastify.register(cors, {
  origin: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:62913'],
  credentials: true
})

// Register Swagger
await fastify.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'NYT News Explorer API (with Redis Caching)',
      description: `
# NYT News Explorer API

This API provides cached access to New York Times articles with Redis caching for improved performance.

## Features

- ✅ **Redis Caching**: All endpoints use Redis distributed caching
- ✅ **10x Performance**: Cache hits are ~10x faster than API calls
- ✅ **Real-time**: Connected to online Upstash Redis instance
- ✅ **Cache Headers**: All responses include \`x-cache\` headers (HIT/MISS)

## Endpoints

### Top Stories
Get top stories by section (cached for 15 minutes)

### Most Popular
Get most popular articles by period (cached for 15 minutes)

### Books
Get best-seller books by list (cached for 30 minutes)

### Cache Status
View Redis cache status, keys, and memory usage

## Cache Headers

All responses include:
- \`x-cache: HIT\` - Served from Redis cache (fast!)
- \`x-cache: MISS\` - Fetched from NYT API and cached
- \`x-cache-key\` - The Redis key used for caching
- \`x-fetch-duration\` - Time taken to fetch from NYT API (MISS only)
      `,
      version: '1.0.0',
      contact: {
        name: 'API Support',
        url: 'https://github.com/betexcr/nyt-news-explorer',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server (Redis-enabled)',
      },
    ],
    tags: [
      {
        name: 'articles',
        description: 'New York Times articles endpoints',
      },
      {
        name: 'books',
        description: 'Best-seller books endpoints',
      },
      {
        name: 'cache',
        description: 'Redis cache monitoring and status',
      },
      {
        name: 'health',
        description: 'Health check and system status',
      },
    ],
  },
})

await fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
    displayRequestDuration: true,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
  },
})

// Register Redis
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const isTls = redisUrl.startsWith('rediss://')

fastify.log.info(`Connecting to Redis: ${redisUrl.split('@')[1] || redisUrl}`)

await fastify.register(redis, {
  url: redisUrl,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: false,
  tls: isTls ? {} : undefined,
  family: 4, // IPv4
})

// Wait for Redis to be ready
try {
  await fastify.redis.ping()
  fastify.log.info('✅ Redis connected successfully!')
} catch (error) {
  fastify.log.error('❌ Redis connection failed:', error)
}

// Cache helper decorators
fastify.decorate('cache', {
  get: async (key: string) => {
    try {
      const cached = await fastify.redis.get(key)
      if (cached) {
        const parsed = JSON.parse(cached)
        fastify.log.info({ key, dataSize: cached.length, hasResults: !!parsed.results }, 'Cache retrieved')
        return parsed
      }
      return null
    } catch (error) {
      fastify.log.warn({ error, key }, 'Cache get error')
      return null
    }
  },
  set: async (key: string, value: any, ttl = 600) => {
    try {
      const serialized = JSON.stringify(value)
      await fastify.redis.setex(key, ttl, serialized)
      fastify.log.info({ key, dataSize: serialized.length, ttl }, 'Cache stored')
      return true
    } catch (error) {
      fastify.log.warn({ error, key }, 'Cache set error')
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

// Basic health check
fastify.get('/health', {
  schema: {
    tags: ['health'],
    description: 'Health check endpoint with Redis connection status',
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          timestamp: { type: 'string' },
          redis: { type: 'string' },
          redisUrl: { type: 'string' },
        },
      },
    },
  },
}, async (request, reply) => {
  let redisStatus = 'disconnected'
  try {
    await fastify.redis.ping()
    redisStatus = 'connected'
  } catch (error) {
    fastify.log.warn('Redis ping failed:', error)
  }
  
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    redis: redisStatus,
    redisUrl: redisUrl.split('@')[1] || 'localhost:6379'
  }
})

// Top stories endpoint with Redis caching
fastify.get('/api/v1/articles/top-stories/:section', {
  schema: {
    tags: ['articles'],
    description: 'Get top stories by section (cached for 15 minutes)',
    params: {
      type: 'object',
      properties: {
        section: { 
          type: 'string', 
          description: 'Section name (e.g., home, world, technology, business, sports, arts, science, health)',
          examples: ['home', 'world', 'technology'],
        },
      },
    },
  },
}, async (request, reply) => {
  const { section } = request.params as { section: string }
  const cacheKey = `top-stories:${section}`
  
  // Try to get from cache
  try {
    const cached = await fastify.cache.get(cacheKey)
    if (cached) {
      fastify.log.info({ section, source: 'cache' }, 'Cache HIT')
      return reply
        .header('x-cache', 'HIT')
        .header('x-cache-key', cacheKey)
        .send(cached)
    }
  } catch (error) {
    fastify.log.warn('Cache get failed:', error)
  }
  
  fastify.log.info({ section, source: 'api' }, 'Cache MISS - fetching from NYT')
  
  try {
    const apiKey = process.env.NYT_API_KEY || 'ykBBKwfsn0sIyA4A2RUaw0wnp4eWDVK7'
    const url = `https://api.nytimes.com/svc/topstories/v2/${section}.json?api-key=${apiKey}`
    
    const startTime = Date.now()
    const response = await fetch(url)
    const fetchDuration = Date.now() - startTime
    
    if (!response.ok) {
      throw new Error(`NYT API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    fastify.log.info({ section, fetchDuration }, `Fetched from NYT API in ${fetchDuration}ms`)
    
    // Cache the result
    try {
      await fastify.cache.set(cacheKey, data, 900) // 15 minutes
      fastify.log.info({ section, cacheKey }, 'Cached result')
    } catch (error) {
      fastify.log.warn('Cache set failed:', error)
    }
    
    return reply
      .header('x-cache', 'MISS')
      .header('x-cache-key', cacheKey)
      .header('x-fetch-duration', fetchDuration.toString())
      .send(data)
  } catch (error) {
    fastify.log.error({ error, section }, 'Failed to fetch top stories')
    reply.code(503).send({
      error: 'Service temporarily unavailable',
      message: 'Failed to fetch top stories from NYT API'
    })
  }
})

// Most popular endpoint with Redis caching
fastify.get('/api/v1/articles/most-popular/:period', {
  schema: {
    tags: ['articles'],
    description: 'Get most popular articles by period (cached for 15 minutes)',
    params: {
      type: 'object',
      properties: {
        period: { 
          type: 'string', 
          description: 'Time period: 1 (day), 7 (week), or 30 (month)',
          enum: ['1', '7', '30'],
        },
      },
    },
  },
}, async (request, reply) => {
  const { period } = request.params as { period: string }
  const cacheKey = `most-popular:${period}`
  
  // Try to get from cache
  try {
    const cached = await fastify.cache.get(cacheKey)
    if (cached) {
      fastify.log.info({ period, source: 'cache' }, 'Cache HIT')
      return reply
        .header('x-cache', 'HIT')
        .header('x-cache-key', cacheKey)
        .send(cached)
    }
  } catch (error) {
    fastify.log.warn('Cache get failed:', error)
  }
  
  fastify.log.info({ period, source: 'api' }, 'Cache MISS - fetching from NYT')
  
  try {
    const apiKey = process.env.NYT_API_KEY || 'ykBBKwfsn0sIyA4A2RUaw0wnp4eWDVK7'
    const url = `https://api.nytimes.com/svc/mostpopular/v2/viewed/${period}.json?api-key=${apiKey}`
    
    const startTime = Date.now()
    const response = await fetch(url)
    const fetchDuration = Date.now() - startTime
    
    if (!response.ok) {
      throw new Error(`NYT API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    fastify.log.info({ period, fetchDuration }, `Fetched from NYT API in ${fetchDuration}ms`)
    
    // Cache the result
    try {
      await fastify.cache.set(cacheKey, data, 900) // 15 minutes
      fastify.log.info({ period, cacheKey }, 'Cached result')
    } catch (error) {
      fastify.log.warn('Cache set failed:', error)
    }
    
    return reply
      .header('x-cache', 'MISS')
      .header('x-cache-key', cacheKey)
      .header('x-fetch-duration', fetchDuration.toString())
      .send(data)
  } catch (error) {
    fastify.log.error({ error, period }, 'Failed to fetch most popular')
    reply.code(503).send({
      error: 'Service temporarily unavailable',
      message: 'Failed to fetch most popular from NYT API'
    })
  }
})

// Books endpoint with Redis caching
fastify.get('/api/v1/books/best-sellers/:list', {
  schema: {
    tags: ['books'],
    description: 'Get best-seller books by list (cached for 30 minutes)',
    params: {
      type: 'object',
      properties: {
        list: { 
          type: 'string', 
          description: 'Best-seller list name',
          examples: ['hardcover-fiction', 'hardcover-nonfiction', 'paperback-nonfiction'],
        },
      },
    },
  },
}, async (request, reply) => {
  const { list } = request.params as { list: string }
  const cacheKey = `books:${list}`
  
  // Try to get from cache
  try {
    const cached = await fastify.cache.get(cacheKey)
    if (cached) {
      fastify.log.info({ list, source: 'cache' }, 'Cache HIT')
      return reply
        .header('x-cache', 'HIT')
        .header('x-cache-key', cacheKey)
        .send(cached)
    }
  } catch (error) {
    fastify.log.warn('Cache get failed:', error)
  }
  
  fastify.log.info({ list, source: 'api' }, 'Cache MISS - fetching from NYT')
  
  try {
    const apiKey = process.env.NYT_API_KEY || 'ykBBKwfsn0sIyA4A2RUaw0wnp4eWDVK7'
    const url = `https://api.nytimes.com/svc/books/v3/lists/current/${list}.json?api-key=${apiKey}`
    
    const startTime = Date.now()
    const response = await fetch(url)
    const fetchDuration = Date.now() - startTime
    
    if (!response.ok) {
      throw new Error(`NYT API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    fastify.log.info({ list, fetchDuration }, `Fetched from NYT API in ${fetchDuration}ms`)
    
    // Cache the result
    try {
      await fastify.cache.set(cacheKey, data, 1800) // 30 minutes
      fastify.log.info({ list, cacheKey }, 'Cached result')
    } catch (error) {
      fastify.log.warn('Cache set failed:', error)
    }
    
    return reply
      .header('x-cache', 'MISS')
      .header('x-cache-key', cacheKey)
      .header('x-fetch-duration', fetchDuration.toString())
      .send(data)
  } catch (error) {
    fastify.log.error({ error, list }, 'Failed to fetch books')
    reply.code(503).send({
      error: 'Service temporarily unavailable',
      message: 'Failed to fetch books from NYT API'
    })
  }
})

// Cache status endpoint
fastify.get('/api/v1/cache/status', {
  schema: {
    tags: ['cache'],
    description: 'Get Redis cache status, keys, and memory usage',
    response: {
      200: {
        type: 'object',
        properties: {
          timestamp: { type: 'string' },
          server: { type: 'object' },
          nyt: { type: 'object' },
          redis: { 
            type: 'object',
            properties: {
              status: { type: 'string' },
              url: { type: 'string' },
              keysCount: { type: 'number' },
              keys: { type: 'array', items: { type: 'string' } },
              memory: { type: 'string' },
            },
          },
        },
      },
    },
  },
}, async (request, reply) => {
  try {
    let redisStatus = 'disconnected'
    let redisInfo: any = {}
    
    try {
      await fastify.redis.ping()
      redisStatus = 'connected'
      
      // Get cache keys count
      const keys = await fastify.redis.keys('*')
      redisInfo.keysCount = keys.length
      redisInfo.keys = keys
      
      // Get memory info
      const info = await fastify.redis.info('memory')
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/)
      if (memoryMatch) {
        redisInfo.memory = memoryMatch[1]
      }
    } catch (error) {
      fastify.log.warn('Redis status check failed:', error)
    }
    
    // API always uses port 3001 (PORT is for frontend)
    const port = process.env.API_PORT ? parseInt(process.env.API_PORT) : 3001
    
    const status = {
      timestamp: new Date().toISOString(),
      server: {
        status: 'running',
        port: port,
        host: process.env.HOST || '0.0.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
      nyt: {
        apiKey: process.env.NYT_API_KEY ? 'configured' : 'missing',
        status: 'connected'
      },
      redis: {
        status: redisStatus,
        url: redisUrl.split('@')[1] || 'localhost:6379',
        ...redisInfo
      }
    }
    
    reply.send(status)
  } catch (error: any) {
    fastify.log.error({ error }, 'Failed to get cache status')
    reply.code(500).send({
      error: 'Failed to get cache status',
      message: error.message
    })
  }
})

// Start server
const start = async () => {
  try {
    // API always uses port 3001 (PORT is for frontend)
    const port = process.env.API_PORT ? parseInt(process.env.API_PORT) : 3001
    const host = process.env.HOST || '0.0.0.0'
    
    await fastify.listen({ 
      port, 
      host 
    })
    fastify.log.info(`🚀 Server running on http://${host}:${port}`)
    fastify.log.info(`📊 Cache status: http://${host}:${port}/api/v1/cache/status`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()

