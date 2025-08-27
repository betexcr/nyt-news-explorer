import fp from 'fastify-plugin';
import redis from '@fastify/redis';
import { createHash } from 'crypto';
import { config } from '@/config/environment.js';
/**
 * Caching plugin implementing comprehensive HTTP caching strategies
 * - ETag generation and validation
 * - Conditional requests (If-None-Match, If-Match)
 * - Redis-based distributed caching
 * - Cache-Control headers
 * - Optimistic concurrency control
 */
async function cachingPlugin(fastify) {
    // Register Redis for distributed caching
    await fastify.register(redis, {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        family: 4, // IPv4
    });
    // ETag generation utility
    const generateETag = (content) => {
        const hash = createHash('sha256')
            .update(typeof content === 'string' ? content : content.toString())
            .digest('hex');
        return `"${hash.substring(0, 16)}"`; // Use first 16 chars for performance
    };
    // Cache key generator
    const generateCacheKey = (request) => {
        const url = request.url;
        const method = request.method;
        const userId = request.user?.id || 'anonymous';
        const acceptHeader = request.headers.accept || '';
        return `cache:${method}:${url}:${userId}:${createHash('md5').update(acceptHeader).digest('hex')}`;
    };
    // Cache control settings for different endpoint types
    const getCacheControl = (request) => {
        const url = request.url;
        // No cache for auth/admin endpoints
        if (url.includes('/auth') || url.includes('/admin')) {
            return 'no-store, no-cache, must-revalidate, private';
        }
        // Short cache for search results
        if (url.includes('/search') || url.includes('/trending')) {
            return 'public, max-age=300, stale-while-revalidate=600'; // 5 min cache, 10 min stale
        }
        // Medium cache for articles
        if (url.includes('/articles')) {
            return 'public, max-age=1800, stale-while-revalidate=3600'; // 30 min cache, 1 hour stale
        }
        // Long cache for static content
        if (url.includes('/static') || url.includes('/assets')) {
            return 'public, max-age=86400, immutable'; // 24 hours, immutable
        }
        // Default cache
        return 'public, max-age=600, stale-while-revalidate=1200'; // 10 min cache, 20 min stale
    };
    // Add caching decorators
    fastify.decorate('cache', {
        // Get from cache
        get: async (key) => {
            try {
                const cached = await fastify.redis.get(key);
                return cached ? JSON.parse(cached) : null;
            }
            catch (error) {
                fastify.log.error({ error, key }, 'Cache get error');
                return null;
            }
        },
        // Set cache with TTL
        set: async (key, value, ttl = 600) => {
            try {
                await fastify.redis.setex(key, ttl, JSON.stringify(value));
                return true;
            }
            catch (error) {
                fastify.log.error({ error, key, ttl }, 'Cache set error');
                return false;
            }
        },
        // Delete from cache
        del: async (key) => {
            try {
                await fastify.redis.del(key);
                return true;
            }
            catch (error) {
                fastify.log.error({ error, key }, 'Cache delete error');
                return false;
            }
        },
        // Invalidate cache by pattern
        invalidate: async (pattern) => {
            try {
                const keys = await fastify.redis.keys(pattern);
                if (keys.length > 0) {
                    await fastify.redis.del(...keys);
                }
                return keys.length;
            }
            catch (error) {
                fastify.log.error({ error, pattern }, 'Cache invalidation error');
                return 0;
            }
        },
    });
    // Pre-handler for cache lookup and ETag validation
    fastify.addHook('preHandler', async (request, reply) => {
        // Only cache GET requests
        if (request.method !== 'GET') {
            return;
        }
        const cacheKey = generateCacheKey(request);
        const ifNoneMatch = request.headers['if-none-match'];
        // Try to get from cache
        const cached = await fastify.cache.get(cacheKey);
        if (cached) {
            const { etag, data, timestamp } = cached;
            // Check If-None-Match header for 304 Not Modified
            if (ifNoneMatch && ifNoneMatch === etag) {
                reply
                    .code(304)
                    .header('etag', etag)
                    .header('cache-control', getCacheControl(request))
                    .send();
                return;
            }
            // Check if cache is still fresh
            const age = Date.now() - timestamp;
            const maxAge = 600000; // 10 minutes default
            if (age < maxAge) {
                reply
                    .header('etag', etag)
                    .header('cache-control', getCacheControl(request))
                    .header('x-cache', 'HIT')
                    .header('age', Math.floor(age / 1000).toString())
                    .send(data);
                return;
            }
        }
        // Mark cache miss for onSend hook
        request.cacheKey = cacheKey;
    });
    // Post-handler for caching responses and ETag generation
    fastify.addHook('onSend', async (request, reply, payload) => {
        // Only process successful GET requests
        if (request.method !== 'GET' || reply.statusCode !== 200) {
            return payload;
        }
        const cacheControl = getCacheControl(request);
        reply.header('cache-control', cacheControl);
        // Don't cache if no-store is set
        if (cacheControl.includes('no-store') || cacheControl.includes('no-cache')) {
            return payload;
        }
        // Generate ETag
        const etag = generateETag(payload);
        reply.header('etag', etag);
        // Handle conditional requests for writes (If-Match)
        const ifMatch = request.headers['if-match'];
        if (ifMatch && request.method !== 'GET') {
            if (ifMatch !== etag) {
                reply.code(412).send({
                    type: 'https://api.nyt-news-explorer.com/problems/precondition-failed',
                    title: 'Precondition Failed',
                    status: 412,
                    detail: 'The If-Match header does not match the current ETag',
                    instance: request.url,
                    correlationId: request.headers['x-correlation-id'],
                });
                return;
            }
        }
        // Cache the response
        if (request.cacheKey) {
            const cacheData = {
                etag,
                data: payload,
                timestamp: Date.now(),
                headers: {
                    'content-type': reply.getHeader('content-type'),
                },
            };
            // Extract max-age from cache-control for TTL
            const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
            const ttl = maxAgeMatch ? parseInt(maxAgeMatch[1]) : 600;
            await fastify.cache.set(request.cacheKey, cacheData, ttl);
            reply.header('x-cache', 'MISS');
        }
        return payload;
    });
    // Cache invalidation helpers
    fastify.decorate('invalidateCache', async (patterns) => {
        let totalInvalidated = 0;
        for (const pattern of patterns) {
            const count = await fastify.cache.invalidate(pattern);
            totalInvalidated += count;
            fastify.log.info({ pattern, count }, 'Cache invalidated');
        }
        return totalInvalidated;
    });
    // Warmup cache utility
    fastify.decorate('warmupCache', async (endpoints) => {
        const promises = endpoints.map(async (endpoint) => {
            try {
                await fastify.inject({
                    method: 'GET',
                    url: endpoint,
                });
                return { endpoint, success: true };
            }
            catch (error) {
                fastify.log.error({ endpoint, error }, 'Cache warmup failed');
                return { endpoint, success: false };
            }
        });
        const results = await Promise.allSettled(promises);
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        fastify.log.info({ total: endpoints.length, successful }, 'Cache warmup completed');
        return successful;
    });
}
export default fp(cachingPlugin, {
    name: 'caching',
    fastify: '4.x',
});
