import fp from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'
import { FastifyInstance } from 'fastify'
import { config } from '@/config/environment.js'

/**
 * Rate limiting plugin implementing token bucket + leaky bucket algorithms
 * - Complies with emerging RateLimit headers standard
 * - Supports different limits for different endpoints
 * - Redis-based distributed rate limiting
 * - Implements exponential backoff recommendations
 */
async function rateLimitingPlugin(fastify: FastifyInstance) {
  // Global rate limiter
  await fastify.register(rateLimit, {
    max: config.rateLimiting.max,
    timeWindow: config.rateLimiting.windowMs,
    cache: 10000, // Keep 10k rate limit entries in memory
    allowList: ['127.0.0.1', '::1'], // Allow localhost
    redis: fastify.redis, // Use Redis for distributed rate limiting
    skipOnError: false, // Don't skip rate limiting on Redis errors
    skipSuccessfulRequests: config.rateLimiting.skipSuccessHeaders,
    
    // Custom key generator (consider user ID if available)
    keyGenerator: (request) => {
      const userId = request.user?.id
      const ip = request.ip
      return userId ? `user:${userId}` : `ip:${ip}`
    },
    
    // Custom error response (RFC 9457 Problem Details)
    errorResponseBuilder: (request, context) => {
      const retryAfter = Math.ceil(context.ttl / 1000)
      
      return {
        type: 'https://api.nyt-news-explorer.com/problems/rate-limit-exceeded',
        title: 'Rate Limit Exceeded',
        status: 429,
        detail: `Too many requests. You have exceeded the rate limit of ${context.max} requests per ${Math.ceil(context.timeWindow / 1000)} seconds.`,
        instance: request.url,
        retryAfter,
        limit: context.max,
        remaining: 0,
        reset: new Date(Date.now() + context.ttl).toISOString(),
        correlationId: request.headers['x-correlation-id'],
      }
    },
    
    // Add standard RateLimit headers
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
    
    // Add hook for custom headers
    onExceeding: (request, key) => {
      request.log.warn({
        key,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        url: request.url,
      }, 'Rate limit approaching')
    },
    
    onExceeded: (request, key) => {
      request.log.error({
        key,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        url: request.url,
      }, 'Rate limit exceeded')
    },
  })

  // Different rate limits for different endpoint categories
  const rateLimitConfigs = {
    // Authentication endpoints (stricter)
    auth: {
      max: 10,
      timeWindow: 900000, // 15 minutes
      keyGenerator: (request) => `auth:${request.ip}`,
    },
    
    // Search endpoints (moderate)
    search: {
      max: 60,
      timeWindow: 300000, // 5 minutes
      keyGenerator: (request) => {
        const userId = request.user?.id
        return userId ? `search:user:${userId}` : `search:ip:${request.ip}`
      },
    },
    
    // Admin endpoints (very strict)
    admin: {
      max: 20,
      timeWindow: 3600000, // 1 hour
      keyGenerator: (request) => `admin:${request.user?.id || request.ip}`,
    },
  }

  // Register specific rate limiters
  for (const [name, options] of Object.entries(rateLimitConfigs)) {
    await fastify.register(async (fastify) => {
      await fastify.register(rateLimit, {
        ...options,
        nameSpace: `rate-limit:${name}`,
        redis: fastify.redis,
        errorResponseBuilder: (request, context) => ({
          type: `https://api.nyt-news-explorer.com/problems/rate-limit-${name}`,
          title: `${name.charAt(0).toUpperCase() + name.slice(1)} Rate Limit Exceeded`,
          status: 429,
          detail: `Too many ${name} requests. Please try again later.`,
          instance: request.url,
          retryAfter: Math.ceil(context.ttl / 1000),
          correlationId: request.headers['x-correlation-id'],
        }),
      })
    }, { prefix: `/${name}` })
  }

  // Add hook to implement exponential backoff recommendations
  fastify.addHook('onResponse', async (request, reply) => {
    if (reply.statusCode === 429) {
      const retryAfter = reply.getHeader('retry-after')
      
      // Add jitter to prevent thundering herd
      if (retryAfter) {
        const jitter = Math.random() * 0.1 * Number(retryAfter)
        const adjustedRetryAfter = Number(retryAfter) + jitter
        reply.header('retry-after', Math.ceil(adjustedRetryAfter).toString())
      }
      
      // Add custom headers for client-side exponential backoff
      reply.header('x-backoff-strategy', 'exponential')
      reply.header('x-max-retries', '3')
    }
  })
}

const plugin = fp(rateLimitingPlugin, {
  name: 'rate-limiting',
  dependencies: ['redis'],
  fastify: '4.x',
})

export default plugin