import { FastifyInstance } from 'fastify';
/**
 * Security plugin implementing comprehensive protection
 * - OWASP API Security Top 10 compliance
 * - Security headers (helmet)
 * - CORS configuration
 * - Input validation and sanitization
 */
declare function securityPlugin(fastify: FastifyInstance): Promise<void>;
declare const plugin: typeof securityPlugin;
export default plugin;
