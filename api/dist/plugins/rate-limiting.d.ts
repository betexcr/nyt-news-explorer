import { FastifyInstance } from 'fastify';
/**
 * Rate limiting plugin implementing token bucket + leaky bucket algorithms
 * - Complies with emerging RateLimit headers standard
 * - Supports different limits for different endpoints
 * - Redis-based distributed rate limiting
 * - Implements exponential backoff recommendations
 */
declare function rateLimitingPlugin(fastify: FastifyInstance): Promise<void>;
declare const plugin: typeof rateLimitingPlugin;
export default plugin;
