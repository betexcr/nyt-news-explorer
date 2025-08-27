import { FastifyInstance } from 'fastify';
/**
 * Caching plugin implementing comprehensive HTTP caching strategies
 * - ETag generation and validation
 * - Conditional requests (If-None-Match, If-Match)
 * - Redis-based distributed caching
 * - Cache-Control headers
 * - Optimistic concurrency control
 */
declare function cachingPlugin(fastify: FastifyInstance): Promise<void>;
declare module 'fastify' {
    interface FastifyInstance {
        cache: {
            get: (key: string) => Promise<any>;
            set: (key: string, value: any, ttl?: number) => Promise<boolean>;
            del: (key: string) => Promise<boolean>;
            invalidate: (pattern: string) => Promise<number>;
        };
        invalidateCache: (patterns: string[]) => Promise<number>;
        warmupCache: (endpoints: string[]) => Promise<number>;
    }
    interface FastifyRequest {
        cacheKey?: string;
    }
}
declare const _default: typeof cachingPlugin;
export default _default;
