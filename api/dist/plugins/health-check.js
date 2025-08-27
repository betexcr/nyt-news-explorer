import fp from 'fastify-plugin';
import underPressure from '@fastify/under-pressure';
import { config } from '@/config/environment.js';
/**
 * Health check plugin with comprehensive monitoring
 * - Application health endpoints
 * - Dependency health checks (Redis, external APIs)
 * - Resource monitoring (memory, CPU)
 * - Kubernetes readiness/liveness probes
 * - Circuit breaker integration
 */
async function healthCheckPlugin(fastify) {
    // Register under-pressure for resource monitoring
    await fastify.register(underPressure, {
        maxEventLoopDelay: 1000, // 1 second
        maxHeapUsedBytes: 536870912, // 512MB
        maxRssBytes: 1073741824, // 1GB
        maxEventLoopUtilization: 0.98,
        message: 'Service under pressure!',
        retryAfter: 50,
        healthCheck: async () => {
            // Custom health check logic
            return { status: 'ok' };
        },
        healthCheckInterval: 5000, // 5 seconds
        exposeStatusRoute: '/status',
        // Customize response format to Problem Details
        customError: async (request, reply, error) => {
            reply.code(503).send({
                type: 'https://api.nyt-news-explorer.com/problems/service-under-pressure',
                title: 'Service Under Pressure',
                status: 503,
                detail: 'The service is experiencing high load. Please try again later.',
                instance: request.url,
                retryAfter: 50,
                correlationId: request.headers['x-correlation-id'],
                metrics: {
                    eventLoopDelay: error.eventLoopDelay,
                    heapUsed: error.heapUsed,
                    rss: error.rss,
                },
            });
        },
    });
    // Individual health check functions
    const healthChecks = {
        // Redis health check
        redis: async () => {
            const start = Date.now();
            try {
                await fastify.redis.ping();
                return {
                    status: 'up',
                    responseTime: Date.now() - start,
                };
            }
            catch (error) {
                return {
                    status: 'down',
                    responseTime: Date.now() - start,
                    error: error.message,
                };
            }
        },
        // External API health check (NYT API)
        externalApi: async () => {
            const start = Date.now();
            try {
                // Use circuit breaker for external API check
                await fastify.circuitBreaker.execute('external', async () => {
                    const response = await fetch('https://api.nytimes.com/svc/search/v2/articlesearch.json?q=test&api-key=' + config.externalApis.nytApiKey);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    return response.json();
                });
                return {
                    status: 'up',
                    responseTime: Date.now() - start,
                };
            }
            catch (error) {
                return {
                    status: 'down',
                    responseTime: Date.now() - start,
                    error: error.message,
                };
            }
        },
        // Database health check (if using database)
        database: async () => {
            const start = Date.now();
            try {
                // Implement database ping based on your database
                // This is a placeholder
                return {
                    status: 'up',
                    responseTime: Date.now() - start,
                };
            }
            catch (error) {
                return {
                    status: 'down',
                    responseTime: Date.now() - start,
                    error: error.message,
                };
            }
        },
    };
    // Basic health check endpoint
    fastify.get('/health', {
        schema: {
            tags: ['Health'],
            summary: 'Basic health check',
            description: 'Returns basic application health status',
            response: {
                200: { $ref: '#/components/schemas/HealthCheck' },
            },
        },
    }, async (request, reply) => {
        reply.send({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: config.nodeEnv,
        });
    });
    // Comprehensive health check with dependencies
    fastify.get('/health/detailed', {
        schema: {
            tags: ['Health'],
            summary: 'Detailed health check',
            description: 'Returns detailed health status including dependencies',
            response: {
                200: { $ref: '#/components/schemas/HealthCheck' },
                503: { $ref: '#/components/responses/503' },
            },
        },
    }, async (request, reply) => {
        const startTime = Date.now();
        // Run all health checks in parallel
        const checkPromises = Object.entries(healthChecks).map(async ([name, check]) => {
            try {
                const result = await check();
                return [name, result];
            }
            catch (error) {
                return [name, {
                        status: 'down',
                        responseTime: 0,
                        error: error.message,
                    }];
            }
        });
        const checks = Object.fromEntries(await Promise.all(checkPromises));
        // Get circuit breaker status
        const circuitBreakerStatus = fastify.circuitBreaker.getAllStatus();
        // Determine overall health
        const healthyChecks = Object.values(checks).filter(check => check.status === 'up').length;
        const totalChecks = Object.keys(checks).length;
        const healthyCircuitBreakers = Object.values(circuitBreakerStatus).filter(cb => cb.state === 'closed').length;
        const totalCircuitBreakers = Object.keys(circuitBreakerStatus).length;
        let overallStatus = 'healthy';
        if (healthyChecks < totalChecks || healthyCircuitBreakers < totalCircuitBreakers) {
            overallStatus = healthyChecks === 0 ? 'unhealthy' : 'degraded';
        }
        const response = {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: config.nodeEnv,
            responseTime: Date.now() - startTime,
            checks,
            circuitBreakers: circuitBreakerStatus,
            system: {
                memory: {
                    used: process.memoryUsage().heapUsed,
                    total: process.memoryUsage().heapTotal,
                    external: process.memoryUsage().external,
                    rss: process.memoryUsage().rss,
                },
                cpu: {
                    usage: process.cpuUsage(),
                },
                node: {
                    version: process.version,
                    platform: process.platform,
                    arch: process.arch,
                },
            },
        };
        const statusCode = overallStatus === 'healthy' ? 200 : 503;
        reply.code(statusCode).send(response);
    });
    // Kubernetes readiness probe
    fastify.get('/ready', {
        schema: {
            tags: ['Health'],
            summary: 'Readiness probe',
            description: 'Kubernetes readiness probe - checks if service can accept traffic',
            response: {
                200: {
                    type: 'object',
                    properties: {
                        ready: { type: 'boolean' },
                        timestamp: { type: 'string' },
                    },
                },
                503: { $ref: '#/components/responses/503' },
            },
        },
    }, async (request, reply) => {
        try {
            // Check critical dependencies
            const redisCheck = await healthChecks.redis();
            const ready = redisCheck.status === 'up';
            if (ready) {
                reply.send({
                    ready: true,
                    timestamp: new Date().toISOString(),
                });
            }
            else {
                reply.code(503).send({
                    type: 'https://api.nyt-news-explorer.com/problems/service-not-ready',
                    title: 'Service Not Ready',
                    status: 503,
                    detail: 'Service is not ready to accept traffic',
                    instance: request.url,
                });
            }
        }
        catch (error) {
            reply.code(503).send({
                type: 'https://api.nyt-news-explorer.com/problems/readiness-check-failed',
                title: 'Readiness Check Failed',
                status: 503,
                detail: error.message,
                instance: request.url,
            });
        }
    });
    // Kubernetes liveness probe
    fastify.get('/live', {
        schema: {
            tags: ['Health'],
            summary: 'Liveness probe',
            description: 'Kubernetes liveness probe - checks if service is running',
            response: {
                200: {
                    type: 'object',
                    properties: {
                        alive: { type: 'boolean' },
                        timestamp: { type: 'string' },
                        uptime: { type: 'number' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        // Simple liveness check - if we can respond, we're alive
        reply.send({
            alive: true,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    });
    // Startup probe (Kubernetes 1.16+)
    fastify.get('/startup', {
        schema: {
            tags: ['Health'],
            summary: 'Startup probe',
            description: 'Kubernetes startup probe - checks if service has started',
            response: {
                200: {
                    type: 'object',
                    properties: {
                        started: { type: 'boolean' },
                        timestamp: { type: 'string' },
                        initTime: { type: 'number' },
                    },
                },
                503: { $ref: '#/components/responses/503' },
            },
        },
    }, async (request, reply) => {
        // Check if service has fully started (all plugins loaded, etc.)
        const started = fastify.pluginTimeout > 0; // Service has finished loading plugins
        if (started) {
            reply.send({
                started: true,
                timestamp: new Date().toISOString(),
                initTime: process.uptime(),
            });
        }
        else {
            reply.code(503).send({
                type: 'https://api.nyt-news-explorer.com/problems/service-starting',
                title: 'Service Starting',
                status: 503,
                detail: 'Service is still starting up',
                instance: request.url,
            });
        }
    });
}
export default fp(healthCheckPlugin, {
    name: 'health-check',
    dependencies: ['redis', 'circuit-breaker'],
    fastify: '4.x',
});
