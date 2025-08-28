import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from '@/config/environment.js';
/**
 * Swagger/OpenAPI documentation plugin
 * - Interactive API documentation
 * - OpenAPI 3.0 specification
 * - Security schemes documentation
 * - Problem Details schema definitions
 * - Request/response examples
 */
async function swaggerPlugin(fastify) {
    // Register Swagger documentation generator
    await fastify.register(swagger, {
        openapi: {
            openapi: '3.0.0',
            info: {
                title: 'NYT News Explorer API',
                description: `
High-performance, secure Node.js API following modern best practices.

## Features

- **Security**: OAuth 2.0 (RFC 9700), JWT hardening (RFC 8725), OWASP API Security Top 10 compliance
- **Performance**: HTTP/3, Brotli compression, ETag caching, rate limiting with jitter
- **Reliability**: Circuit breakers, bulkheads, idempotency keys, exponential backoff
- **Observability**: OpenTelemetry integration, W3C Trace Context, structured logging
- **Standards Compliance**: Problem Details (RFC 9457), RESTful design, HTTP semantics

## Authentication

This API supports multiple authentication methods:

1. **OAuth 2.0 with PKCE** - Recommended for web applications
2. **JWT Bearer Tokens** - For API access
3. **API Keys** - For server-to-server communication

All authentication methods implement security best practices including token rotation,
short-lived access tokens, and proper claim validation.

## Rate Limiting

API endpoints are protected by intelligent rate limiting using token bucket + leaky bucket algorithms:

- **Global Limit**: 100 requests per 15 minutes per IP/user
- **Authentication**: 10 requests per 15 minutes per IP
- **Search**: 60 requests per 5 minutes per user
- **Admin**: 20 requests per hour per user

Rate limit headers are included in responses following emerging standards.

## Caching

The API implements comprehensive HTTP caching:

- **ETags** for conditional requests and optimistic concurrency
- **Cache-Control** headers with appropriate TTL values
- **Redis-based** distributed caching for scalability
- **304 Not Modified** responses to reduce bandwidth

## Error Handling

All errors follow RFC 9457 Problem Details format for machine-readable, consistent error responses.
        `,
                version: '1.0.0',
                contact: {
                    name: 'API Support',
                    email: 'api-support@nyt-news-explorer.com',
                    url: 'https://github.com/your-org/nyt-news-explorer',
                },
                license: {
                    name: 'MIT',
                    url: 'https://opensource.org/licenses/MIT',
                },
            },
            servers: [
                {
                    url: 'https://api.nyt-news-explorer.com',
                    description: 'Production server',
                },
                {
                    url: 'https://staging-api.nyt-news-explorer.com',
                    description: 'Staging server',
                },
                {
                    url: 'http://localhost:3000',
                    description: 'Development server',
                },
            ],
            components: {
                securitySchemes: {
                    // OAuth 2.0 with PKCE
                    OAuth2: {
                        type: 'oauth2',
                        description: 'OAuth 2.0 with PKCE (RFC 9700)',
                        flows: {
                            authorizationCode: {
                                authorizationUrl: config.security.oauth.authorizationUrl,
                                tokenUrl: config.security.oauth.tokenUrl,
                                scopes: {
                                    'read:articles': 'Read articles',
                                    'write:favorites': 'Manage favorites',
                                    'read:profile': 'Read user profile',
                                },
                            },
                        },
                    },
                    // JWT Bearer Token
                    BearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                        description: 'JWT Bearer token (RFC 8725 compliant)',
                    },
                    // API Key
                    ApiKeyAuth: {
                        type: 'apiKey',
                        in: 'header',
                        name: 'X-API-Key',
                        description: 'API key for server-to-server authentication',
                    },
                },
                schemas: {
                    // Problem Details (RFC 9457)
                    ProblemDetails: {
                        type: 'object',
                        required: ['type', 'title', 'status'],
                        properties: {
                            type: {
                                type: 'string',
                                format: 'uri',
                                description: 'A URI reference that identifies the problem type',
                                example: 'https://api.nyt-news-explorer.com/problems/rate-limit-exceeded',
                            },
                            title: {
                                type: 'string',
                                description: 'A short, human-readable summary of the problem type',
                                example: 'Rate Limit Exceeded',
                            },
                            status: {
                                type: 'integer',
                                description: 'The HTTP status code',
                                example: 429,
                            },
                            detail: {
                                type: 'string',
                                description: 'A human-readable explanation specific to this occurrence',
                                example: 'Too many requests. You have exceeded the rate limit.',
                            },
                            instance: {
                                type: 'string',
                                format: 'uri',
                                description: 'A URI reference that identifies the specific occurrence',
                                example: '/api/search',
                            },
                            correlationId: {
                                type: 'string',
                                format: 'uuid',
                                description: 'Unique identifier for request tracing',
                                example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                            },
                            timestamp: {
                                type: 'string',
                                format: 'date-time',
                                description: 'ISO 8601 timestamp of the error',
                                example: '2023-12-07T10:30:00Z',
                            },
                        },
                    },
                    // Health Check Response
                    HealthCheck: {
                        type: 'object',
                        properties: {
                            status: {
                                type: 'string',
                                enum: ['healthy', 'degraded', 'unhealthy'],
                                description: 'Overall health status',
                            },
                            timestamp: {
                                type: 'string',
                                format: 'date-time',
                                description: 'Health check timestamp',
                            },
                            uptime: {
                                type: 'number',
                                description: 'Application uptime in seconds',
                            },
                            version: {
                                type: 'string',
                                description: 'Application version',
                            },
                            checks: {
                                type: 'object',
                                description: 'Individual health check results',
                                additionalProperties: {
                                    type: 'object',
                                    properties: {
                                        status: {
                                            type: 'string',
                                            enum: ['up', 'down'],
                                        },
                                        responseTime: {
                                            type: 'number',
                                            description: 'Response time in milliseconds',
                                        },
                                    },
                                },
                            },
                        },
                    },
                    // Rate Limit Headers
                    RateLimitHeaders: {
                        type: 'object',
                        properties: {
                            'X-RateLimit-Limit': {
                                type: 'integer',
                                description: 'Request limit per window',
                            },
                            'X-RateLimit-Remaining': {
                                type: 'integer',
                                description: 'Remaining requests in window',
                            },
                            'X-RateLimit-Reset': {
                                type: 'string',
                                format: 'date-time',
                                description: 'Time when the rate limit window resets',
                            },
                            'Retry-After': {
                                type: 'integer',
                                description: 'Seconds to wait before retrying',
                            },
                        },
                    },
                },
                responses: {
                    '400': {
                        description: 'Bad Request',
                        content: {
                            'application/problem+json': {
                                schema: { $ref: '#/components/schemas/ProblemDetails' },
                            },
                        },
                    },
                    '401': {
                        description: 'Unauthorized',
                        content: {
                            'application/problem+json': {
                                schema: { $ref: '#/components/schemas/ProblemDetails' },
                            },
                        },
                    },
                    '403': {
                        description: 'Forbidden',
                        content: {
                            'application/problem+json': {
                                schema: { $ref: '#/components/schemas/ProblemDetails' },
                            },
                        },
                    },
                    '404': {
                        description: 'Not Found',
                        content: {
                            'application/problem+json': {
                                schema: { $ref: '#/components/schemas/ProblemDetails' },
                            },
                        },
                    },
                    '429': {
                        description: 'Rate Limit Exceeded',
                        headers: {
                            'X-RateLimit-Limit': {
                                schema: { type: 'integer' },
                                description: 'Request limit per window',
                            },
                            'X-RateLimit-Remaining': {
                                schema: { type: 'integer' },
                                description: 'Remaining requests in window',
                            },
                            'X-RateLimit-Reset': {
                                schema: { type: 'string', format: 'date-time' },
                                description: 'Rate limit window reset time',
                            },
                            'Retry-After': {
                                schema: { type: 'integer' },
                                description: 'Seconds to wait before retrying',
                            },
                        },
                        content: {
                            'application/problem+json': {
                                schema: { $ref: '#/components/schemas/ProblemDetails' },
                            },
                        },
                    },
                    '500': {
                        description: 'Internal Server Error',
                        content: {
                            'application/problem+json': {
                                schema: { $ref: '#/components/schemas/ProblemDetails' },
                            },
                        },
                    },
                    '503': {
                        description: 'Service Unavailable',
                        content: {
                            'application/problem+json': {
                                schema: { $ref: '#/components/schemas/ProblemDetails' },
                            },
                        },
                    },
                },
                headers: {
                    'X-Correlation-ID': {
                        description: 'Unique request identifier for tracing',
                        schema: {
                            type: 'string',
                            format: 'uuid',
                        },
                    },
                    'ETag': {
                        description: 'Entity tag for caching and optimistic concurrency',
                        schema: {
                            type: 'string',
                        },
                    },
                },
            },
            tags: [
                { name: 'Authentication', description: 'Authentication and authorization endpoints' },
                { name: 'Articles', description: 'Article search and retrieval' },
                { name: 'Favorites', description: 'User favorites management' },
                { name: 'Health', description: 'Health checks and monitoring' },
                { name: 'Admin', description: 'Administrative endpoints' },
            ],
        },
        hideUntagged: true,
        exposeRoute: true,
    });
    // Register Swagger UI
    await fastify.register(swaggerUi, {
        routePrefix: '/docs',
        uiConfig: {
            docExpansion: 'list',
            deepLinking: true,
            displayRequestDuration: true,
            defaultModelsExpandDepth: 2,
            defaultModelExpandDepth: 2,
            showExtensions: true,
            showCommonExtensions: true,
            useUnsafeMarkdown: false,
        },
        uiHooks: {
            onRequest: function (request, reply, done) {
                // Add security headers for docs
                reply.header('X-Frame-Options', 'SAMEORIGIN');
                reply.header('X-Content-Type-Options', 'nosniff');
                done();
            },
        },
        staticCSP: true,
        transformStaticCSP: (header) => header,
    });
    // Add OpenAPI spec endpoint
    fastify.get('/openapi.json', async (request, reply) => {
        reply.type('application/json');
        return fastify.swagger();
    });
    // Add OpenAPI spec in YAML format
    fastify.get('/openapi.yaml', async (request, reply) => {
        reply.type('application/x-yaml');
        const yaml = await import('js-yaml');
        return yaml.dump(fastify.swagger());
    });
}
const plugin = fp(swaggerPlugin, {
    name: 'swagger',
    fastify: '4.x',
});
export default plugin;
