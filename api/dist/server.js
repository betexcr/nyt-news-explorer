import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import fastify from 'fastify';
import { readFileSync } from 'fs';
import { config } from '@/config/environment.js';
import { registerPlugins } from '@/plugins/index.js';
import { registerRoutes } from '@/routes/index.js';
import { logger } from '@/utils/logger.js';
// Initialize OpenTelemetry SDK (RFC-compliant observability)
const sdk = new NodeSDK({
    serviceName: config.otel.serviceName,
    serviceVersion: config.otel.serviceVersion,
    traceExporter: new JaegerExporter({
        endpoint: config.otel.jaegerEndpoint,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
});
// Start telemetry before anything else
sdk.start();
// Graceful shutdown handling for OpenTelemetry
process.on('SIGTERM', () => {
    sdk.shutdown()
        .then(() => logger.info('OpenTelemetry terminated'))
        .catch((error) => logger.error('Error terminating OpenTelemetry', error))
        .finally(() => process.exit(0));
});
/**
 * Create Fastify server with comprehensive security and performance configuration
 * Implements:
 * - TLS 1.3 support (RFC 8446)
 * - HTTP/3 over QUIC where supported
 * - Structured logging with correlation IDs
 * - Security headers and OWASP compliance
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
        keepAliveTimeout: 72000, // 72 seconds (AWS ALB timeout is 60s)
        requestTimeout: 30000, // 30 seconds
        pluginTimeout: 30000,
        bodyLimit: 1048576, // 1MB
        // TLS Configuration for production (TLS 1.3)
        ...(config.isProduction &&
            config.security.tls.certPath &&
            config.security.tls.keyPath && {
            https: {
                cert: readFileSync(config.security.tls.certPath),
                key: readFileSync(config.security.tls.keyPath),
                // Enforce TLS 1.3
                secureProtocol: 'TLSv1_3_method',
                ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256',
            },
            http2: true, // Enable HTTP/2
            // HTTP/3 support (experimental)
            ...(config.security.enableHttp3 && {
                http3: true,
            }),
        }),
    });
    // Add request context and correlation ID
    server.addHook('preHandler', async (request, reply) => {
        const correlationId = request.headers['x-correlation-id'] || crypto.randomUUID();
        request.headers['x-correlation-id'] = correlationId;
        reply.header('x-correlation-id', correlationId);
        // Add to request context for logging
        request.log = request.log.child({ correlationId });
    });
    // Register all plugins (security, rate limiting, compression, etc.)
    await registerPlugins(server);
    // Register all routes
    await registerRoutes(server);
    // Global error handler with Problem Details (RFC 9457)
    server.setErrorHandler(async (error, request, reply) => {
        const correlationId = request.headers['x-correlation-id'];
        request.log.error({
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code,
            },
            correlationId,
            url: request.url,
            method: request.method,
        }, 'Request error');
        // Return Problem Details format (RFC 9457)
        const problemDetail = {
            type: 'https://api.nyt-news-explorer.com/problems/server-error',
            title: 'Internal Server Error',
            status: 500,
            detail: config.isDevelopment ? error.message : 'An unexpected error occurred',
            instance: request.url,
            correlationId,
            timestamp: new Date().toISOString(),
        };
        // Handle specific error types
        if (error.statusCode) {
            problemDetail.status = error.statusCode;
            problemDetail.title = error.name || 'Request Error';
            if (error.statusCode < 500) {
                problemDetail.detail = error.message;
            }
        }
        // Set appropriate Content-Type for Problem Details
        reply
            .type('application/problem+json')
            .code(problemDetail.status)
            .send(problemDetail);
    });
    return server;
}
/**
 * Start the server with graceful shutdown handling
 */
async function start() {
    try {
        const server = await createServer();
        // Graceful shutdown
        const signals = ['SIGINT', 'SIGTERM'];
        signals.forEach((signal) => {
            process.on(signal, async () => {
                server.log.info(`Received ${signal}, shutting down gracefully`);
                try {
                    await server.close();
                    server.log.info('Server closed successfully');
                    process.exit(0);
                }
                catch (error) {
                    server.log.error('Error during shutdown', error);
                    process.exit(1);
                }
            });
        });
        // Start listening
        await server.listen({
            port: config.server.port,
            host: config.server.host
        });
        server.log.info({
            port: config.server.port,
            host: config.server.host,
            environment: config.nodeEnv,
            version: process.env.npm_package_version || '1.0.0',
        }, 'Server started successfully');
    }
    catch (error) {
        logger.error('Failed to start server', error);
        process.exit(1);
    }
}
// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise });
    process.exit(1);
});
// Start the server
start();
