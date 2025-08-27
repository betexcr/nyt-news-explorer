import { FastifyInstance } from 'fastify';
/**
 * Security plugin implementing comprehensive protection
 * - OWASP API Security Top 10 compliance
 * - Security headers (helmet)
 * - CORS configuration
 * - Input validation and sanitization
 */
declare function securityPlugin(fastify: FastifyInstance): Promise<void>;
declare const _default: typeof securityPlugin;
export default _default;
