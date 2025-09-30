import fastify from 'fastify'
import crypto from 'crypto'
import { config } from '@/config/environment.js'
import { registerPlugins } from '@/plugins/index-simple.js'
import { registerRoutes } from '@/routes/index-simple.js'

/**
 * Create simplified Fastify server for testing
 */
async function createServer() {
  const server = fastify({
    logger: {
      level: config.logger.level,
      transport: config.isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
    },
    trustProxy: true,
    requestTimeout: 30000,
    bodyLimit: 1048576, // 1MB
  })

  // Add correlation ID middleware
  server.addHook('preHandler', async (request, reply) => {
    const correlationId = request.headers['x-correlation-id'] || crypto.randomUUID()
    request.headers['x-correlation-id'] = correlationId
    reply.header('x-correlation-id', correlationId)
  })

  // Register all plugins
  await registerPlugins(server)

  // Register all routes
  await registerRoutes(server)

  // Global error handler
  server.setErrorHandler(async (error, request, reply) => {
    const correlationId = request.headers['x-correlation-id'] as string
    
    request.log.error({
      error: {
        message: error.message,
        stack: error.stack,
      },
      correlationId,
      url: request.url,
      method: request.method,
    }, 'Request error')

    const statusCode = error.statusCode || 500
    
    reply.code(statusCode).send({
      type: 'https://api.nyt-news-explorer.com/problems/server-error',
      title: statusCode < 500 ? 'Client Error' : 'Server Error',
      status: statusCode,
      detail: config.isDevelopment ? error.message : 'An unexpected error occurred',
      instance: request.url,
      correlationId,
      timestamp: new Date().toISOString(),
    })
  })

  return server
}

/**
 * Start the server
 */
async function start() {
  try {
    const server = await createServer()
    
    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM']
    signals.forEach((signal) => {
      process.on(signal, async () => {
        server.log.info(`Received ${signal}, shutting down gracefully`)
        
        try {
          await server.close()
          server.log.info('Server closed successfully')
          process.exit(0)
        } catch (error) {
          server.log.error(error, 'Error during shutdown')
          process.exit(1)
        }
      })
    })

    // Start listening
    await server.listen({ 
      port: config.server.port, 
      host: config.server.host 
    })
    
    server.log.info({
      port: config.server.port,
      host: config.server.host,
      environment: config.nodeEnv,
      version: '1.0.0',
    }, 'Server started successfully')

  } catch (error) {
    console.error('Failed to start server:', error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error.message)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection:', reason instanceof Error ? reason.message : String(reason))
  process.exit(1)
})

// Start the server
start()