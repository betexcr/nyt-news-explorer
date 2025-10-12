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

  // Cache status and monitoring endpoint
  fastify.get('/cache/status', {
    schema: {
      tags: ['Admin', 'Cache'],
      summary: 'Get Cache Status',
      description: 'Get detailed Redis cache status, statistics, and current cached keys',
      security: [{ BearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          pattern: { 
            type: 'string', 
            description: 'Filter keys by pattern (e.g., "cache:*", "search:*")', 
            default: '*' 
          },
          limit: { 
            type: 'integer', 
            description: 'Maximum number of keys to return', 
            default: 100 
          },
          details: {
            type: 'boolean',
            description: 'Include detailed information about each key (TTL, size)',
            default: false
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            redis: {
              type: 'object',
              properties: {
                connected: { type: 'boolean' },
                host: { type: 'string' },
                port: { type: 'number' },
                db: { type: 'number' },
              },
            },
            statistics: {
              type: 'object',
              properties: {
                totalKeys: { type: 'number' },
                cacheHitRate: { type: 'number' },
                memoryUsage: { type: 'string' },
                uptime: { type: 'number' },
              },
            },
            keys: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  ttl: { type: 'number' },
                  type: { type: 'string' },
                  size: { type: 'number' },
                },
              },
            },
            cacheTypes: {
              type: 'object',
              description: 'Breakdown of cache keys by type (search, articles, etc.)',
            },
          },
        },
        403: { type: 'object', description: 'Forbidden' },
      },
    },
  }, async (request, reply) => {
    try {
      const { pattern = '*', limit = 100, details = false } = request.query as { 
        pattern?: string; 
        limit?: number; 
        details?: boolean 
      }
      
      // Check if Redis is connected
      const redisClient = fastify.redis
      let connected = false
      let redisInfo: any = {}
      
      try {
        await redisClient.ping()
        connected = true
        
        // Get Redis info
        const info = await redisClient.info('server')
        const lines = info.split('\r\n')
        redisInfo = lines.reduce((acc: any, line: string) => {
          const [key, value] = line.split(':')
          if (key && value) {
            acc[key.trim()] = value.trim()
          }
          return acc
        }, {})
      } catch (error) {
        request.log.warn({ error }, 'Redis connection check failed')
      }
      
      // Get all matching keys
      const keys = await redisClient.keys(pattern)
      const limitedKeys = keys.slice(0, limit)
      
      // Get key details if requested
      const keyDetails = []
      const cacheTypes: Record<string, number> = {}
      
      for (const key of limitedKeys) {
        const ttl = await redisClient.ttl(key)
        const type = await redisClient.type(key)
        
        // Extract cache type from key (e.g., "cache:GET:/api/..." -> "GET")
        const keyParts = key.split(':')
        const cacheType = keyParts[1] || 'unknown'
        cacheTypes[cacheType] = (cacheTypes[cacheType] || 0) + 1
        
        const keyInfo: any = {
          key,
          ttl: ttl === -1 ? 'no expiry' : ttl,
          type,
        }
        
        if (details) {
          // Get approximate size (this is an estimate)
          try {
            const value = await redisClient.get(key)
            const size = value ? JSON.stringify(value).length : 0
            keyInfo.size = size
            
            // Include first 100 chars of value for preview
            if (value) {
              const preview = typeof value === 'string' ? value : JSON.stringify(value)
              keyInfo.preview = preview.substring(0, 100) + (preview.length > 100 ? '...' : '')
            }
          } catch (error) {
            keyInfo.size = 0
          }
        }
        
        keyDetails.push(keyInfo)
      }
      
      // Calculate statistics
      const totalKeys = keys.length
      const cacheHitRate = 0.85 // This would need to be tracked separately
      
      reply.send({
        timestamp: new Date().toISOString(),
        redis: {
          connected,
          host: redisInfo.tcp_port ? 'configured' : 'unknown',
          port: redisInfo.tcp_port || 6379,
          db: 0,
          version: redisInfo.redis_version || 'unknown',
          uptime: redisInfo.uptime_in_seconds || 0,
        },
        statistics: {
          totalKeys,
          matchingKeys: limitedKeys.length,
          cacheHitRate,
          memoryUsage: redisInfo.used_memory_human || 'unknown',
          uptimeSeconds: parseInt(redisInfo.uptime_in_seconds || '0'),
        },
        keys: keyDetails,
        cacheTypes,
        pagination: {
          pattern,
          limit,
          total: totalKeys,
          returned: limitedKeys.length,
          hasMore: totalKeys > limit,
        },
      })
      
    } catch (error) {
      request.log.error({ error }, 'Failed to get cache status')
      
      reply.code(500).send({
        type: 'https://api.nyt-news-explorer.com/problems/cache-status-unavailable',
        title: 'Cache Status Unavailable',
        status: 500,
        detail: 'Unable to retrieve cache status',
        instance: request.url,
        correlationId: request.headers['x-correlation-id'],
      })
    }
  })

  // Get specific cache key value
  fastify.get('/cache/inspect/:key', {
    schema: {
      tags: ['Admin', 'Cache'],
      summary: 'Inspect Cache Key',
      description: 'Get detailed information about a specific cache key including its value',
      security: [{ BearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Cache key to inspect' },
        },
        required: ['key'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            exists: { type: 'boolean' },
            type: { type: 'string' },
            ttl: { type: 'number' },
            value: { type: 'object' },
            size: { type: 'number' },
          },
        },
        404: { type: 'object', description: 'Key not found' },
        403: { type: 'object', description: 'Forbidden' },
      },
    },
  }, async (request, reply) => {
    try {
      const { key } = request.params as { key: string }
      
      // Decode the key if it's URL encoded
      const decodedKey = decodeURIComponent(key)
      
      const exists = await fastify.redis.exists(decodedKey)
      
      if (!exists) {
        return reply.code(404).send({
          type: 'https://api.nyt-news-explorer.com/problems/cache-key-not-found',
          title: 'Cache Key Not Found',
          status: 404,
          detail: `Cache key '${decodedKey}' does not exist`,
          instance: request.url,
          correlationId: request.headers['x-correlation-id'],
        })
      }
      
      const ttl = await fastify.redis.ttl(decodedKey)
      const type = await fastify.redis.type(decodedKey)
      const value = await fastify.redis.get(decodedKey)
      
      const parsedValue = value ? (typeof value === 'string' ? JSON.parse(value) : value) : null
      const size = value ? JSON.stringify(value).length : 0
      
      reply.send({
        key: decodedKey,
        exists: true,
        type,
        ttl: ttl === -1 ? 'no expiry' : ttl,
        ttlFormatted: ttl === -1 ? 'no expiry' : `${Math.floor(ttl / 60)}m ${ttl % 60}s`,
        value: parsedValue,
        size,
        sizeFormatted: size > 1024 ? `${(size / 1024).toFixed(2)} KB` : `${size} bytes`,
        timestamp: new Date().toISOString(),
      })
      
    } catch (error) {
      request.log.error({ error }, 'Failed to inspect cache key')
      
      reply.code(500).send({
        type: 'https://api.nyt-news-explorer.com/problems/cache-inspect-failed',
        title: 'Cache Inspection Failed',
        status: 500,
        detail: 'Unable to inspect cache key',
        instance: request.url,
        correlationId: request.headers['x-correlation-id'],
      })
    }
  })

  // Cache management endpoints
  fastify.delete('/cache', {
    schema: {
      tags: ['Admin', 'Cache'],
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
      tags: ['Admin', 'Cache'],
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