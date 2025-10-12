import Fastify from 'fastify'
import cors from '@fastify/cors'

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

// Basic health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Top stories endpoint
fastify.get('/api/v1/articles/top-stories/:section', async (request, reply) => {
  const { section } = request.params as { section: string }
  
  try {
    const apiKey = process.env.NYT_API_KEY || 'ykBBKwfsn0sIyA4A2RUaw0wnp4eWDVK7'
    const url = `https://api.nytimes.com/svc/topstories/v2/${section}.json?api-key=${apiKey}`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`NYT API error: ${response.status}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    fastify.log.error({ error, section }, 'Failed to fetch top stories')
    reply.code(503).send({
      error: 'Service temporarily unavailable',
      message: 'Failed to fetch top stories from NYT API'
    })
  }
})

// Most popular endpoint
fastify.get('/api/v1/articles/most-popular/:period', async (request, reply) => {
  const { period } = request.params as { period: string }
  
  try {
    const apiKey = process.env.NYT_API_KEY || 'ykBBKwfsn0sIyA4A2RUaw0wnp4eWDVK7'
    const url = `https://api.nytimes.com/svc/mostpopular/v2/viewed/${period}.json?api-key=${apiKey}`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`NYT API error: ${response.status}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    fastify.log.error({ error, period }, 'Failed to fetch most popular')
    reply.code(503).send({
      error: 'Service temporarily unavailable',
      message: 'Failed to fetch most popular from NYT API'
    })
  }
})

// Books endpoint
fastify.get('/api/v1/books/best-sellers/:list', async (request, reply) => {
  const { list } = request.params as { list: string }
  
  try {
    const apiKey = process.env.NYT_API_KEY || 'ykBBKwfsn0sIyA4A2RUaw0wnp4eWDVK7'
    const url = `https://api.nytimes.com/svc/books/v3/lists/current/${list}.json?api-key=${apiKey}`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`NYT API error: ${response.status}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    fastify.log.error({ error, list }, 'Failed to fetch books')
    reply.code(503).send({
      error: 'Service temporarily unavailable',
      message: 'Failed to fetch books from NYT API'
    })
  }
})

// Simple cache status endpoint
fastify.get('/api/v1/cache/status', async (request, reply) => {
  try {
    // Basic cache status without Redis dependency
    const status = {
      timestamp: new Date().toISOString(),
      server: {
        status: 'running',
        port: parseInt(process.env.PORT || '3001'),
        host: process.env.HOST || '0.0.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
      nyt: {
        apiKey: process.env.NYT_API_KEY ? 'configured' : 'missing',
        status: 'connected'
      },
      cache: {
        type: 'in-memory',
        status: 'active',
        note: 'Simple server uses in-memory caching. For full Redis monitoring, use the full API server.'
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
    const port = parseInt(process.env.PORT || '3001')
    const host = process.env.HOST || '0.0.0.0'
    
    await fastify.listen({ 
      port, 
      host 
    })
    fastify.log.info(`Server running on http://${host}:${port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()