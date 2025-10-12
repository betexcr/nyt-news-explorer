import fp from 'fastify-plugin'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import sensible from '@fastify/sensible'
import { FastifyInstance } from 'fastify'
import { config } from '@/config/environment.js'

/**
 * Security plugin implementing comprehensive protection
 * - OWASP API Security Top 10 compliance
 * - Security headers (helmet)
 * - CORS configuration
 * - Input validation and sanitization
 */
async function securityPlugin(fastify: FastifyInstance) {
  // Register sensible defaults and utilities
  await fastify.register(sensible)

  // Security headers via helmet
  await fastify.register(helmet as any, {
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    // HTTP Strict Transport Security (force HTTPS)
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    // Prevent MIME sniffing
    noSniff: true,
    // X-Frame-Options (prevent clickjacking)
    frameguard: { action: 'deny' },
    // X-XSS-Protection
    xssFilter: true,
    // Referrer Policy
    referrerPolicy: { policy: 'same-origin' },
    // Hide X-Powered-By header
    hidePoweredBy: true,
    // Permissions Policy (formerly Feature Policy)
    permissionsPolicy: {
      geolocation: ['self'],
      camera: [],
      microphone: [],
      payment: [],
    },
  })

  // CORS configuration
  await fastify.register(cors, {
    origin: (origin, callback) => {
      // Allow requests without origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true)
      
      // Check against allowed origins
      const allowedOrigins = config.cors.origin
      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      
      callback(new Error('Not allowed by CORS'), false)
    },
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'X-Correlation-ID',
      'X-Idempotency-Key',
      'If-None-Match',
      'If-Match',
    ],
    exposedHeaders: [
      'X-Correlation-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'ETag',
      'Last-Modified',
    ],
  })

  // Add security headers to all responses
  fastify.addHook('onSend', async (request, reply, payload) => {
    // Add custom security headers
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Download-Options', 'noopen')
    reply.header('X-Permitted-Cross-Domain-Policies', 'none')
    
    // Add cache control for sensitive endpoints
    if (request.url.includes('/auth') || request.url.includes('/admin')) {
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
      reply.header('Pragma', 'no-cache')
      reply.header('Expires', '0')
    }

    return payload
  })

  // Input sanitization hook
  fastify.addHook('preHandler', async (request) => {
    // Sanitize query parameters
    if (request.query && typeof request.query === 'object') {
      for (const [key, value] of Object.entries(request.query)) {
        if (typeof value === 'string') {
          // Basic XSS prevention
          (request.query as any)[key] = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        }
      }
    }

    // Log security-relevant events
    if (request.headers['x-forwarded-for'] !== request.ip) {
      request.log.info({
        forwardedFor: request.headers['x-forwarded-for'],
        remoteAddress: request.ip,
        userAgent: request.headers['user-agent'],
      }, 'Proxy request detected')
    }
  })

  // Rate limiting bypass detection
  fastify.addHook('onResponse', async (request, reply) => {
    // Log suspicious behavior
    if (reply.statusCode === 429) {
      request.log.warn({
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        url: request.url,
        method: request.method,
      }, 'Rate limit exceeded')
    }
  })
}

const plugin = fp(securityPlugin, {
  name: 'security',
  fastify: '4.x',
})

export default plugin