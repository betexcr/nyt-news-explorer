import { FastifyInstance } from 'fastify'
import { articlesRoutes } from './articles-simple.js'

/**
 * Register simplified routes for testing
 */
export async function registerRoutes(fastify: FastifyInstance) {
  // API version prefix
  await fastify.register(async function (fastify) {
    // Public article routes
    await fastify.register(articlesRoutes, { prefix: '/articles' })
    
  }, { prefix: '/api/v1' })

  // Root redirect to docs
  fastify.get('/', async (request, reply) => {
    reply.redirect(302, '/docs')
  })
  
  // API info endpoint
  fastify.get('/api', async (request, reply) => {
    const cacheKey = 'meta:api-info'
    const cached = await fastify.cache.get(cacheKey)
    if (cached) {
      return reply
        .header('etag', cached.etag)
        .header('x-cache', 'HIT')
        .send(cached.payload)
    }

    const payload = {
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
    }

    const bodyString = JSON.stringify(payload)
    const etag = '"' + (await import('crypto')).createHash('md5').update(bodyString).digest('hex') + '"'

    await fastify.cache.set(cacheKey, { etag, payload }, 60)

    return reply
      .header('etag', etag)
      .header('cache-control', 'public, max-age=60, stale-while-revalidate=120')
      .header('x-cache', 'MISS')
      .send(payload)
  })
}