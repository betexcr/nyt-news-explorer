import { FastifyInstance } from 'fastify';
/**
 * Compression plugin implementing modern compression algorithms
 * - Brotli for browsers (best compression)
 * - gzip fallback for older clients
 * - zstd for server-to-server where supported
 * - Dynamic compression based on content type and size
 */
declare function compressionPlugin(fastify: FastifyInstance): Promise<void>;
declare const plugin: typeof compressionPlugin;
export default plugin;
