import pino from 'pino'
import { config } from '@/config/environment.js'

/**
 * Structured logger with OpenTelemetry integration
 * - Correlation ID support
 * - JSON structured logging for production
 * - Pretty printing for development
 * - PII protection
 * - Performance optimized
 */
export const logger = pino({
  level: config.logger.level,
  
  // Pretty print in development
  transport: config.isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
          messageFormat: '[{correlationId}] {msg}',
        },
      }
    : undefined,

  // Production configuration
  ...(!config.isDevelopment && {
    formatters: {
      level: (label) => {
        return { level: label }
      },
    },
  }),

  // Base fields for all logs
  base: {
    service: config.otel.serviceName,
    version: config.otel.serviceVersion,
    environment: config.nodeEnv,
  },

  // Redact sensitive information
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'password',
      'secret',
      'token',
      'key',
      'ssn',
      'creditCard',
      'email', // Redact email in logs for privacy
    ],
    censor: '[REDACTED]',
  },

  // Serializers for common objects
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-correlation-id': req.headers['x-correlation-id'],
      },
      remoteAddress: req.remoteAddress,
      remotePort: req.remotePort,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: {
        'content-type': res.headers['content-type'],
        'content-length': res.headers['content-length'],
        'x-correlation-id': res.headers['x-correlation-id'],
      },
    }),
    err: pino.stdSerializers.err,
  },
})

/**
 * Create a child logger with correlation ID
 */
export function createCorrelatedLogger(correlationId: string) {
  return logger.child({ correlationId })
}

/**
 * Create a child logger for specific module/component
 */
export function createModuleLogger(module: string) {
  return logger.child({ module })
}

/**
 * Performance timer utility
 */
export function createTimer(logger: pino.Logger) {
  const start = process.hrtime.bigint()
  
  return (message: string, meta?: object) => {
    const end = process.hrtime.bigint()
    const duration = Number(end - start) / 1000000 // Convert to milliseconds
    
    logger.info({
      ...meta,
      duration,
    }, message)
  }
}

/**
 * Audit logger for security events
 */
export const auditLogger = logger.child({
  audit: true,
  component: 'security',
})

/**
 * Performance logger for monitoring
 */
export const performanceLogger = logger.child({
  performance: true,
  component: 'monitoring',
})

/**
 * Business logic logger
 */
export const businessLogger = logger.child({
  business: true,
  component: 'application',
})