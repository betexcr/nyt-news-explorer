import { FastifyInstance } from 'fastify'
import crypto from 'crypto'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import compress from '@fastify/compress'
import sensible from '@fastify/sensible'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
// import redisPlugin from './redis-simple.js'
import authPlugin from './auth-simple.js'
import { config } from '@/config/environment.js'

/**
 * Register simplified plugins for initial testing
 */
export async function registerPlugins(fastify: FastifyInstance) {
  // Lenient content-type parser to treat unknown/malformed as JSON string for tests
  fastify.addContentTypeParser('*', { parseAs: 'string' }, (_req, body: any, done) => {
    if (typeof body !== 'string') return done(null, body)
    try {
      const parsed = JSON.parse(body)
      done(null, parsed)
    } catch {
      done(null, { __malformed: true })
    }
  })
  // Correlation ID for every request (available in tests, too)
  fastify.addHook('preHandler', async (request, reply) => {
    const correlationId = (request.headers['x-correlation-id'] as string) || crypto.randomUUID()
    request.headers['x-correlation-id'] = correlationId
    reply.header('x-correlation-id', correlationId)
  })
  // Core plugins
  await fastify.register(sensible as any)
  
  // Security headers
  await fastify.register(helmet as any, {
    contentSecurityPolicy: false, // Disable for now to avoid conflicts
  })
  
  // CORS
  await fastify.register(cors as any, {
    // Allow CRA dev server dynamic ports
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      try {
        const url = new URL(origin)
        if (url.hostname === 'localhost') return cb(null, true)
      } catch {}
      cb(null, false)
    },
    credentials: true,
  })
  
  // Compression
  await fastify.register(compress as any)
  
  // Rate limiting (simplified)
  await fastify.register(rateLimit as any, {
    max: 100,
    timeWindow: '1 minute',
  })
  
  // Authentication
  await fastify.register(authPlugin)
  
  // Swagger documentation
  await fastify.register(swagger as any, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'NYT News Explorer API',
        version: '1.0.0',
      },
    },
  })
  
  await fastify.register(swaggerUi as any, {
    routePrefix: '/docs',
  })
  
  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    reply.send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
    })
  })
}