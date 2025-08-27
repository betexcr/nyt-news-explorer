import { FastifyInstance } from 'fastify'
import securityPlugin from './security.js'
import rateLimitingPlugin from './rate-limiting.js'
import compressionPlugin from './compression.js'
import cachingPlugin from './caching.js'
import authPlugin from './auth.js'
import swaggerPlugin from './swagger.js'
import healthCheckPlugin from './health-check.js'
import circuitBreakerPlugin from './circuit-breaker.js'

/**
 * Register all plugins in the correct order
 * Order matters for proper middleware stacking
 */
export async function registerPlugins(fastify: FastifyInstance) {
  // 1. Core infrastructure plugins first
  await fastify.register(securityPlugin)
  await fastify.register(compressionPlugin)
  
  // 2. Caching and performance
  await fastify.register(cachingPlugin)
  
  // 3. Rate limiting and traffic control
  await fastify.register(rateLimitingPlugin)
  
  // 4. Circuit breaker for resilience
  await fastify.register(circuitBreakerPlugin)
  
  // 5. Authentication and authorization
  await fastify.register(authPlugin)
  
  // 6. API documentation
  await fastify.register(swaggerPlugin)
  
  // 7. Health checks (last to ensure all dependencies are loaded)
  await fastify.register(healthCheckPlugin)
}