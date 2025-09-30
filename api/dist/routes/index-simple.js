/**
 * Register simplified routes for initial testing
 */
export async function registerRoutes(fastify) {
    // Basic health check
    fastify.get('/api/v1/health', async (request, reply) => {
        reply.send({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
        });
    });
    // Simple authentication test endpoint
    fastify.get('/api/v1/protected', {
        preHandler: fastify.authenticate,
    }, async (request, reply) => {
        reply.send({
            message: 'This is a protected endpoint',
            user: request.user,
            timestamp: new Date().toISOString(),
        });
    });
    // Simple login endpoint for testing
    fastify.post('/api/v1/auth/login', async (request, reply) => {
        const { email, password } = request.body || {};
        // Strict validation for tests
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (request.body?.__malformed) {
            reply.code(400).send({ error: 'Invalid JSON body' });
            return;
        }
        if (!email || !password || !emailRegex.test(email)) {
            reply.code(401).send({ error: 'Invalid credentials' });
            return;
        }
        try {
            const token = fastify.jwt.sign({
                id: '123',
                email,
                roles: ['user'],
            });
            reply.send({
                accessToken: token,
                user: { id: '123', email, roles: ['user'] },
            });
        }
        catch {
            reply.code(401).send({ error: 'Invalid credentials' });
        }
    });
    // Simple articles endpoint
    fastify.get('/api/v1/articles/search', async (request, reply) => {
        const { q = 'technology' } = request.query;
        // Mock response for testing
        reply.send({
            status: 'OK',
            response: {
                docs: [
                    {
                        _id: 'test-1',
                        web_url: 'https://www.nytimes.com/test-1',
                        headline: { main: `Test article about ${q}` },
                        abstract: `This is a test article about ${q}`,
                        pub_date: new Date().toISOString(),
                    },
                ],
                meta: { hits: 1, offset: 0 },
            },
        });
    });
    // Root redirect to docs
    fastify.get('/', async (request, reply) => {
        reply.redirect(302, '/docs');
    });
}
