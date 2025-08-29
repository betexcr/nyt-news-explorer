import crypto from 'crypto';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import sensible from '@fastify/sensible';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
// import redisPlugin from './redis-simple.js'
import authPlugin from './auth-simple.js';
/**
 * Register simplified plugins for initial testing
 */
export async function registerPlugins(fastify) {
    // Lenient content-type parser to treat unknown/malformed as JSON string for tests
    fastify.addContentTypeParser('*', { parseAs: 'string' }, (_req, body, done) => {
        if (typeof body !== 'string')
            return done(null, body);
        try {
            const parsed = JSON.parse(body);
            done(null, parsed);
        }
        catch {
            done(null, { __malformed: true });
        }
    });
    // Correlation ID for every request (available in tests, too)
    fastify.addHook('preHandler', async (request, reply) => {
        const correlationId = request.headers['x-correlation-id'] || crypto.randomUUID();
        request.headers['x-correlation-id'] = correlationId;
        reply.header('x-correlation-id', correlationId);
    });
    // Core plugins
    await fastify.register(sensible);
    // Security headers
    await fastify.register(helmet, {
        contentSecurityPolicy: false, // Disable for now to avoid conflicts
    });
    // CORS
    await fastify.register(cors, {
        origin: true, // Allow all origins for development
        credentials: true,
    });
    // Compression
    await fastify.register(compress);
    // Rate limiting (simplified)
    await fastify.register(rateLimit, {
        max: 100,
        timeWindow: '1 minute',
    });
    // Authentication
    await fastify.register(authPlugin);
    // Swagger documentation
    await fastify.register(swagger, {
        openapi: {
            openapi: '3.0.0',
            info: {
                title: 'NYT News Explorer API',
                version: '1.0.0',
            },
        },
    });
    await fastify.register(swaggerUi, {
        routePrefix: '/docs',
    });
    // Health check endpoint
    fastify.get('/health', async (request, reply) => {
        reply.send({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '1.0.0',
        });
    });
}
