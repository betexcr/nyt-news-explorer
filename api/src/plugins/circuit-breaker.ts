import fp from 'fastify-plugin'
import CircuitBreaker from 'opossum'
import { FastifyInstance } from 'fastify'

/**
 * Circuit breaker plugin for resilience patterns
 * - Prevents cascading failures
 * - Implements bulkhead isolation
 * - Exponential backoff with jitter
 * - Fallback mechanisms
 * - Health check integration
 */
async function circuitBreakerPlugin(fastify: FastifyInstance) {
  
  // Circuit breaker configurations for different services
  const circuitBreakerConfigs = {
    // External API calls (NYT, etc.)
    external: {
      timeout: 5000, // 5 seconds
      errorThresholdPercentage: 50, // Open circuit at 50% error rate
      resetTimeout: 30000, // 30 seconds before half-open
      rollingCountTimeout: 10000, // 10 second rolling window
      rollingCountBuckets: 10, // 10 buckets in rolling window
      name: 'external-api',
    },
    
    // Database operations
    database: {
      timeout: 3000, // 3 seconds
      errorThresholdPercentage: 25, // More sensitive for DB
      resetTimeout: 15000, // 15 seconds
      rollingCountTimeout: 5000, // 5 second window
      rollingCountBuckets: 5,
      name: 'database',
    },
    
    // Redis operations
    redis: {
      timeout: 1000, // 1 second
      errorThresholdPercentage: 30,
      resetTimeout: 5000, // 5 seconds
      rollingCountTimeout: 2000, // 2 second window
      rollingCountBuckets: 4,
      name: 'redis',
    },
  }

  // Create circuit breakers
  const circuitBreakers = new Map<string, CircuitBreaker>()

  for (const [name, config] of Object.entries(circuitBreakerConfigs)) {
    const breaker = new CircuitBreaker(async (operation: () => Promise<any>) => {
      return await operation()
    }, config)

    // Event listeners for monitoring
    breaker.on('open', () => {
      fastify.log.warn({ circuitBreaker: name }, 'Circuit breaker opened')
    })

    breaker.on('halfOpen', () => {
      fastify.log.info({ circuitBreaker: name }, 'Circuit breaker half-open')
    })

    breaker.on('close', () => {
      fastify.log.info({ circuitBreaker: name }, 'Circuit breaker closed')
    })

    breaker.on('failure', (error) => {
      fastify.log.error({ 
        circuitBreaker: name, 
        error: error.message 
      }, 'Circuit breaker failure')
    })

    breaker.on('success', (result) => {
      fastify.log.debug({ 
        circuitBreaker: name 
      }, 'Circuit breaker success')
    })

    breaker.on('timeout', () => {
      fastify.log.warn({ 
        circuitBreaker: name 
      }, 'Circuit breaker timeout')
    })

    breaker.on('reject', () => {
      fastify.log.warn({ 
        circuitBreaker: name 
      }, 'Circuit breaker rejected request')
    })

    circuitBreakers.set(name, breaker)
  }

  // Add circuit breaker decorator
  fastify.decorate('circuitBreaker', {
    // Execute operation with circuit breaker protection
    execute: async <T>(
      breakerName: string, 
      operation: () => Promise<T>,
      fallback?: () => Promise<T> | T
    ): Promise<T> => {
      const breaker = circuitBreakers.get(breakerName)
      
      if (!breaker) {
        throw new Error(`Circuit breaker '${breakerName}' not found`)
      }

      try {
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 100
        await new Promise(resolve => setTimeout(resolve, jitter))
        
        return await breaker.fire(operation)
      } catch (error) {
        // Try fallback if available
        if (fallback) {
          fastify.log.info({ 
            breakerName, 
            error: error.message 
          }, 'Using fallback due to circuit breaker')
          
          return typeof fallback === 'function' ? await fallback() : fallback
        }
        
        // Return circuit breaker error in Problem Details format
        throw {
          type: 'https://api.nyt-news-explorer.com/problems/service-unavailable',
          title: 'Service Temporarily Unavailable',
          status: 503,
          detail: `The ${breakerName} service is currently unavailable. Please try again later.`,
          retryAfter: Math.ceil(circuitBreakerConfigs[breakerName]?.resetTimeout / 1000) || 30,
        }
      }
    },

    // Get circuit breaker status
    getStatus: (breakerName: string) => {
      const breaker = circuitBreakers.get(breakerName)
      if (!breaker) {
        return null
      }

      return {
        name: breakerName,
        state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
        stats: breaker.stats,
        options: breaker.options,
      }
    },

    // Get all circuit breakers status
    getAllStatus: () => {
      const status = {}
      for (const [name, breaker] of circuitBreakers) {
        status[name] = {
          state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
          stats: breaker.stats,
        }
      }
      return status
    },

    // Reset circuit breaker
    reset: (breakerName: string) => {
      const breaker = circuitBreakers.get(breakerName)
      if (breaker) {
        breaker.close()
        return true
      }
      return false
    },

    // Open circuit breaker manually
    open: (breakerName: string) => {
      const breaker = circuitBreakers.get(breakerName)
      if (breaker) {
        breaker.open()
        return true
      }
      return false
    },
  })

  // Health check endpoint for circuit breakers
  fastify.get('/health/circuit-breakers', async (request, reply) => {
    const status = fastify.circuitBreaker.getAllStatus()
    const healthyBreakers = Object.values(status).filter(s => s.state === 'closed').length
    const totalBreakers = Object.keys(status).length
    
    const isHealthy = healthyBreakers === totalBreakers
    
    reply.code(isHealthy ? 200 : 503).send({
      status: isHealthy ? 'healthy' : 'degraded',
      circuitBreakers: status,
      summary: {
        total: totalBreakers,
        healthy: healthyBreakers,
        degraded: totalBreakers - healthyBreakers,
      },
      timestamp: new Date().toISOString(),
    })
  })

  // Bulkhead isolation middleware
  const bulkheadLimits = {
    '/search': { maxConcurrent: 50, timeout: 10000 },
    '/articles': { maxConcurrent: 100, timeout: 15000 },
    '/auth': { maxConcurrent: 20, timeout: 5000 },
    '/admin': { maxConcurrent: 5, timeout: 30000 },
  }

  const activeCalls = new Map<string, number>()

  fastify.addHook('preHandler', async (request, reply) => {
    // Find matching bulkhead
    const bulkhead = Object.entries(bulkheadLimits)
      .find(([path]) => request.url.startsWith(path))

    if (!bulkhead) return

    const [path, limits] = bulkhead
    const current = activeCalls.get(path) || 0

    // Check bulkhead limit
    if (current >= limits.maxConcurrent) {
      reply.code(503).send({
        type: 'https://api.nyt-news-explorer.com/problems/bulkhead-limit',
        title: 'Service Overloaded',
        status: 503,
        detail: `Too many concurrent requests for ${path}. Maximum allowed: ${limits.maxConcurrent}`,
        instance: request.url,
        retryAfter: 5,
        correlationId: request.headers['x-correlation-id'],
      })
      return
    }

    // Increment counter
    activeCalls.set(path, current + 1)
    
    // Set up cleanup
    reply.raw.on('finish', () => {
      const current = activeCalls.get(path) || 0
      activeCalls.set(path, Math.max(0, current - 1))
    })
  })

  // Graceful shutdown handling
  fastify.addHook('onClose', async () => {
    // Close all circuit breakers
    for (const [name, breaker] of circuitBreakers) {
      breaker.shutdown()
      fastify.log.info({ circuitBreaker: name }, 'Circuit breaker shutdown')
    }
  })
}

declare module 'fastify' {
  interface FastifyInstance {
    circuitBreaker: {
      execute: <T>(
        breakerName: string, 
        operation: () => Promise<T>, 
        fallback?: () => Promise<T> | T
      ) => Promise<T>
      getStatus: (breakerName: string) => any
      getAllStatus: () => any
      reset: (breakerName: string) => boolean
      open: (breakerName: string) => boolean
    }
  }
}

export default fp(circuitBreakerPlugin, {
  name: 'circuit-breaker',
  fastify: '4.x',
})