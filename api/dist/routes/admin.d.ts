import { FastifyInstance } from 'fastify';
/**
 * Admin routes for system management and monitoring
 * - Requires admin role authorization
 * - Cache management
 * - System metrics
 * - Configuration management
 */
export declare function adminRoutes(fastify: FastifyInstance): Promise<void>;
