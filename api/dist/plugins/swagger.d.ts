import { FastifyInstance } from 'fastify';
/**
 * Swagger/OpenAPI documentation plugin
 * - Interactive API documentation
 * - OpenAPI 3.0 specification
 * - Security schemes documentation
 * - Problem Details schema definitions
 * - Request/response examples
 */
declare function swaggerPlugin(fastify: FastifyInstance): Promise<void>;
declare const plugin: typeof swaggerPlugin;
export default plugin;
