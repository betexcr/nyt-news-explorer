import { FastifyInstance } from 'fastify';
/**
 * Health check plugin with comprehensive monitoring
 * - Application health endpoints
 * - Dependency health checks (Redis, external APIs)
 * - Resource monitoring (memory, CPU)
 * - Kubernetes readiness/liveness probes
 * - Circuit breaker integration
 */
declare function healthCheckPlugin(fastify: FastifyInstance): Promise<void>;
declare const _default: typeof healthCheckPlugin;
export default _default;
