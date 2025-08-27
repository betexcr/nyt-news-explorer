import { FastifyInstance } from 'fastify'
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
  // Core plugins
  await fastify.register(sensible as any)
  
  // Security headers
  await fastify.register(helmet as any, {
    contentSecurityPolicy: false, // Disable for now to avoid conflicts
  })
  
  // CORS
  await fastify.register(cors as any, {
    origin: true, // Allow all origins for development
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