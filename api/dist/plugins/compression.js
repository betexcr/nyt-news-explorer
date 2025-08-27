import fp from 'fastify-plugin';
import compress from '@fastify/compress';
/**
 * Compression plugin implementing modern compression algorithms
 * - Brotli for browsers (best compression)
 * - gzip fallback for older clients
 * - zstd for server-to-server where supported
 * - Dynamic compression based on content type and size
 */
async function compressionPlugin(fastify) {
    await fastify.register(compress, {
        // Compression algorithms in order of preference
        encodings: ['br', 'gzip', 'deflate'],
        // Brotli configuration (modern browsers)
        brotliOptions: {
            level: 4, // Balance between compression ratio and speed
            windowBits: 22, // Large window for better compression
        },
        // gzip configuration (fallback)
        zlibOptions: {
            level: 6, // Good balance of compression/speed
            windowBits: 15,
            memLevel: 8,
            strategy: 0, // Default strategy
        },
        // Only compress responses above this threshold
        threshold: 1024, // 1KB
        // Compress these content types
        mimeTypes: new Set([
            'application/json',
            'application/javascript',
            'application/xml',
            'text/css',
            'text/html',
            'text/javascript',
            'text/plain',
            'text/xml',
            'image/svg+xml',
            'application/problem+json', // RFC 9457 Problem Details
            'application/graphql',
            'application/x-yaml',
        ]),
        // Don't compress already compressed content
        customTypes: /^(image|video|audio)\//,
        // Request/response filtering
        requestEncodings: ['br', 'gzip', 'deflate'],
        onUnsupportedEncoding: (encoding, request, reply) => {
            reply.code(406).send({
                type: 'https://api.nyt-news-explorer.com/problems/unsupported-encoding',
                title: 'Unsupported Content Encoding',
                status: 406,
                detail: `Encoding '${encoding}' is not supported. Supported encodings: br, gzip, deflate`,
                instance: request.url,
                correlationId: request.headers['x-correlation-id'],
            });
        },
    });
    // Add compression headers and metrics
    fastify.addHook('onSend', async (request, reply, payload) => {
        // Add compression info header for debugging (development only)
        if (process.env.NODE_ENV === 'development') {
            const encoding = reply.getHeader('content-encoding');
            if (encoding) {
                reply.header('x-compression-algorithm', encoding);
            }
        }
        // Log compression metrics
        const contentLength = reply.getHeader('content-length');
        const contentEncoding = reply.getHeader('content-encoding');
        if (contentEncoding && contentLength) {
            request.log.debug({
                url: request.url,
                method: request.method,
                contentLength: Number(contentLength),
                encoding: contentEncoding,
                userAgent: request.headers['user-agent'],
            }, 'Response compressed');
        }
        return payload;
    });
}
export default fp(compressionPlugin, {
    name: 'compression',
    fastify: '4.x',
});
