import { FastifyInstance } from 'fastify'

/**
 * Admin routes for system management and monitoring
 * - Requires admin role authorization
 * - Cache management
 * - System metrics
 * - Configuration management
 */
export async function adminRoutes(fastify: FastifyInstance) {
  
  // System metrics endpoint
  fastify.get('/metrics', {
    schema: {
      tags: ['Admin'],
      summary: 'System Metrics',
      description: 'Get comprehensive system metrics and performance data',
      security: [{ BearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            system: {
              type: 'object',
              properties: {
                uptime: { type: 'number' },
                memory: { type: 'object' },
                cpu: { type: 'object' },
                load: { type: 'array' },
              },
            },
            application: {
              type: 'object',
              properties: {
                version: { type: 'string' },
                environment: { type: 'string' },
                requests: { type: 'object' },
                errors: { type: 'object' },
                cache: { type: 'object' },
              },
            },
            dependencies: {
              type: 'object',
              properties: {
                redis: { type: 'object' },
                externalApis: { type: 'object' },
                circuitBreakers: { type: 'object' },
              },
            },
          },
        },
        403: { type: 'object', description: 'Forbidden' },
      },
    },
  }, async (request, reply) => {
    try {
      // System metrics
      const memoryUsage = process.memoryUsage()
      const cpuUsage = process.cpuUsage()
      
      // Application metrics (would typically come from metrics collection)
      const applicationMetrics = {
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        requests: {
          total: 0, // Implement request counter
          ratePerSecond: 0,
          averageResponseTime: 0,
        },
        errors: {
          total: 0,
          ratePerSecond: 0,
          byType: {},
        },
        cache: {
          hitRate: 0.85, // Example
          size: 0,
          evictions: 0,
        },
      }
      
      // Dependency health
      const circuitBreakerStatus = fastify.circuitBreaker.getAllStatus()
      
      reply.send({
        timestamp: new Date().toISOString(),
        system: {
          uptime: process.uptime(),
          memory: {
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external,
            arrayBuffers: memoryUsage.arrayBuffers,
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system,
          },
        },
        application: applicationMetrics,
        dependencies: {
          circuitBreakers: circuitBreakerStatus,
        },
      })
      
    } catch (error) {
      request.log.error({ error }, 'Failed to get system metrics')
      
      reply.code(500).send({
        type: 'https://api.nyt-news-explorer.com/problems/metrics-unavailable',
        title: 'Metrics Unavailable',
        status: 500,
        detail: 'Unable to retrieve system metrics',
        instance: request.url,
        correlationId: request.headers['x-correlation-id'],
      })
    }
  })

  // Cache management endpoints
  fastify.delete('/cache', {
    schema: {
      tags: ['Admin'],
      summary: 'Clear Cache',
      description: 'Clear application cache (all or by pattern)',
      security: [{ BearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Cache key pattern to clear (e.g., "search:*")' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            cleared: { type: 'integer' },
            pattern: { type: 'string' },
          },
        },
        403: { type: 'object', description: 'Forbidden' },
      },
    },
  }, async (request, reply) => {
    try {
      const { pattern } = request.query as { pattern?: string }
      
      let cleared = 0
      let clearPattern = pattern || '*'
      
      if (pattern) {
        cleared = await fastify.invalidateCache([pattern])
      } else {
        // Clear all cache
        cleared = await fastify.invalidateCache(['*'])
      }
      
      request.log.info({ 
        pattern: clearPattern, 
        cleared,
        adminUser: (request.user as any)?.id 
      }, 'Cache cleared by admin')
      
      reply.send({
        message: 'Cache cleared successfully',
        cleared,
        pattern: clearPattern,
      })
      
    } catch (error) {
      request.log.error({ error }, 'Failed to clear cache')
      
      reply.code(500).send({
        type: 'https://api.nyt-news-explorer.com/problems/cache-clear-failed',
        title: 'Cache Clear Failed',
        status: 500,
        detail: 'Unable to clear cache',
        instance: request.url,
        correlationId: request.headers['x-correlation-id'],
      })
    }
  })

  // Circuit breaker management
  fastify.post('/circuit-breakers/:name/:action', {
    schema: {
      tags: ['Admin'],
      summary: 'Manage Circuit Breakers',
      description: 'Open, close, or reset circuit breakers',
      security: [{ BearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          name: { type: 'string', enum: ['external', 'database', 'redis'] },
          action: { type: 'string', enum: ['open', 'close', 'reset'] },
        },
        required: ['name', 'action'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            circuitBreaker: { type: 'string' },
            action: { type: 'string' },
            status: { type: 'object' },
          },
        },
        400: { type: 'object', description: 'Bad Request' },
        403: { type: 'object', description: 'Forbidden' },
      },
    },
  }, async (request, reply) => {
    try {
      const { name, action } = request.params as { name: string; action: string }
      
      let result = false
      
      switch (action) {
        case 'open':
          result = fastify.circuitBreaker.open(name)
          break
        case 'close':
        case 'reset':
          result = fastify.circuitBreaker.reset(name)
          break
        default:
          return reply.code(400).send({
            type: 'https://api.nyt-news-explorer.com/problems/invalid-circuit-breaker-action',
            title: 'Invalid Circuit Breaker Action',
            status: 400,
            detail: `Action '${action}' is not supported`,
            instance: request.url,
            correlationId: request.headers['x-correlation-id'],
          })
      }
      
      if (!result) {
        return reply.code(404).send({
          type: 'https://api.nyt-news-explorer.com/problems/circuit-breaker-not-found',
          title: 'Circuit Breaker Not Found',
          status: 404,
          detail: `Circuit breaker '${name}' not found`,
          instance: request.url,
          correlationId: request.headers['x-correlation-id'],
        })
      }
      
      const status = fastify.circuitBreaker.getStatus(name)
      
      request.log.info({
        circuitBreaker: name,
        action,
        newStatus: status?.state,
        adminUser: (request.user as any)?.id,
      }, 'Circuit breaker modified by admin')
      
      reply.send({
        circuitBreaker: name,
        action,
        status,
      })
      
    } catch (error) {
      request.log.error({ error }, 'Failed to manage circuit breaker')
      
      reply.code(500).send({
        type: 'https://api.nyt-news-explorer.com/problems/circuit-breaker-management-failed',
        title: 'Circuit Breaker Management Failed',
        status: 500,
        detail: 'Unable to manage circuit breaker',
        instance: request.url,
        correlationId: request.headers['x-correlation-id'],
      })
    }
  })

  // Configuration endpoint
  fastify.get('/config', {
    schema: {
      tags: ['Admin'],
      summary: 'Get Configuration',
      description: 'Get current application configuration (sanitized)',
      security: [{ BearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            environment: { type: 'string' },
            version: { type: 'string' },
            features: { type: 'object' },
            limits: { type: 'object' },
            external: { type: 'object' },
          },
        },
        403: { type: 'object', description: 'Forbidden' },
      },
    },
  }, async (request, reply) => {
    // Return sanitized configuration (no secrets)
    reply.send({
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      features: {
        compression: true,
        caching: true,
        circuitBreakers: true,
        rateLimiting: true,
        authentication: true,
        swagger: true,
      },
      limits: {
        rateLimitMax: 100,
        rateLimitWindow: 900000,
        requestTimeout: 30000,
        bodyLimit: 1048576,
      },
      external: {
        redis: {
          host: 'configured',
          port: 6379,
        },
        nytApi: {
          configured: !!process.env.NYT_API_KEY,
        },
      },
    })
  })

  // Warm up cache endpoint
  fastify.post('/cache/warmup', {
    schema: {
      tags: ['Admin'],
      summary: 'Warm Up Cache',
      description: 'Pre-populate cache with frequently requested data',
      security: [{ BearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            endpoints: { type: 'array', items: { type: 'string' } },
            successful: { type: 'integer' },
            failed: { type: 'integer' },
          },
        },
        403: { type: 'object', description: 'Forbidden' },
      },
    },
  }, async (request, reply) => {
    try {
      const warmupEndpoints = [
        '/api/v1/articles/top-stories/home',
        '/api/v1/articles/top-stories/technology',
        '/api/v1/articles/top-stories/business',
        '/api/v1/articles/search?q=technology&sort=newest',
        '/api/v1/articles/search?q=business&sort=newest',
      ]
      
      const successful = await fastify.warmupCache(warmupEndpoints)
      const failed = warmupEndpoints.length - successful
      
      request.log.info({
        endpoints: warmupEndpoints,
        successful,
        failed,
        adminUser: (request.user as any)?.id,
      }, 'Cache warmup initiated by admin')
      
      reply.send({
        message: 'Cache warmup completed',
        endpoints: warmupEndpoints,
        successful,
        failed,
      })
      
    } catch (error) {
      request.log.error({ error }, 'Cache warmup failed')
      
      reply.code(500).send({
        type: 'https://api.nyt-news-explorer.com/problems/cache-warmup-failed',
        title: 'Cache Warmup Failed',
        status: 500,
        detail: 'Unable to warm up cache',
        instance: request.url,
        correlationId: request.headers['x-correlation-id'],
      })
    }
  })
}