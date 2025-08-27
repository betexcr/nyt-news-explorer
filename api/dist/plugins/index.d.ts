import { FastifyInstance } from 'fastify';
/**
 * Register all plugins in the correct order
 * Order matters for proper middleware stacking
 */
export declare function registerPlugins(fastify: FastifyInstance): Promise<void>;
