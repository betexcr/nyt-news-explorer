import { FastifyInstance } from 'fastify'
import { authRoutes } from './auth.js'
import { articlesRoutes } from './articles.js'
import { favoritesRoutes } from './favorites.js'
import { adminRoutes } from './admin.js'
import { graphqlRoutes } from './graphql.js'

/**
 * Register all API routes with proper prefixes and middleware
 */
export async function registerRoutes(fastify: FastifyInstance) {
  // API version prefix
  await fastify.register(async function (fastify) {
    // Authentication routes (no auth required for login/register)
    await fastify.register(authRoutes, { prefix: '/auth' })
    
    // Public article routes (with optional authentication for personalization)
    await fastify.register(articlesRoutes, { prefix: '/articles' })
    
    // Protected user routes (authentication required)
    await fastify.register(async function (fastify) {
      // Apply authentication to all routes in this context
      await fastify.addHook('preHandler', (fastify as any).authenticate)
      
      // User favorites
      await fastify.register(favoritesRoutes, { prefix: '/favorites' })
      
      // Admin routes (requires admin role)
      await fastify.register(async function (fastify) {
        await fastify.addHook('preHandler', (fastify as any).authorize(['admin']))
        await fastify.register(adminRoutes, { prefix: '/admin' })
      })
    })
    
    // GraphQL endpoint
    await fastify.register(graphqlRoutes, { prefix: '/graphql' })
    
  }, { prefix: '/api/v1' })

  // Root redirect to docs
  fastify.get('/', async (request, reply) => {
    reply.redirect(302, '/docs')
  })
  
  // API info endpoint
  fastify.get('/api', async (request, reply) => {
    reply.send({
      name: 'NYT News Explorer API',
      version: '1.0.0',
      description: 'High-performance, secure Node.js API following modern best practices',
      documentation: '/docs',
      openapi: '/openapi.json',
      health: '/health',
      features: {
        security: [
          'OAuth 2.0 with PKCE (RFC 9700)',
          'JWT hardening (RFC 8725)',
          'OWASP API Security Top 10 compliance',
          'Rate limiting with jitter',
          'Security headers (helmet)',
        ],
        performance: [
          'HTTP/3 and TLS 1.3 support',
          'Brotli compression',
          'ETag caching',
          'Redis distributed caching',
          'Circuit breakers',
        ],
        observability: [
          'OpenTelemetry integration',
          'W3C Trace Context',
          'Structured logging',
          'Health checks',
          'Metrics collection',
        ],
        standards: [
          'Problem Details (RFC 9457)',
          'RESTful design',
          'OpenAPI 3.0',
          'GraphQL support',
        ],
      },
      endpoints: {
        authentication: '/api/v1/auth',
        articles: '/api/v1/articles',
        favorites: '/api/v1/favorites',
        graphql: '/api/v1/graphql',
        admin: '/api/v1/admin',
      },
      timestamp: new Date().toISOString(),
    })
  })
}