import { FastifyInstance } from 'fastify';
/**
 * Circuit breaker plugin for resilience patterns
 * - Prevents cascading failures
 * - Implements bulkhead isolation
 * - Exponential backoff with jitter
 * - Fallback mechanisms
 * - Health check integration
 */
declare function circuitBreakerPlugin(fastify: FastifyInstance): Promise<void>;
declare module 'fastify' {
    interface FastifyInstance {
        circuitBreaker: {
            execute: <T>(breakerName: string, operation: () => Promise<T>, fallback?: () => Promise<T> | T) => Promise<T>;
            getStatus: (breakerName: string) => any;
            getAllStatus: () => any;
            reset: (breakerName: string) => boolean;
            open: (breakerName: string) => boolean;
        };
    }
}
declare const _default: typeof circuitBreakerPlugin;
export default _default;
