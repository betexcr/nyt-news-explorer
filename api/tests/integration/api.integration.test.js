import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fastify from 'fastify';
import { registerPlugins } from '@/plugins/index-simple.js';
import { registerRoutes } from '@/routes/index-simple.js';
/**
 * Integration tests using real HTTP requests with Supertest
 * Tests complete request/response cycle including middleware
 */
const describeIntegration = process.env.RUN_INTEGRATION === '1' ? describe : describe.skip;
describeIntegration('API Integration Tests', () => {
    let app;
    let server;
    beforeAll(async () => {
        app = fastify({
            logger: {
                level: 'error' // Minimize logs during tests
            }
        });
        await registerPlugins(app);
        await registerRoutes(app);
        // Start server for real HTTP requests
        await app.listen({ port: 0, host: '127.0.0.1' }); // Use random available port
        server = app.server;
    });
    afterAll(async () => {
        await app.close();
    });
    describe('Health Endpoints - HTTP Integration', () => {
        it('should return health status via real HTTP', async () => {
            await request(server)
                .get('/health')
                .expect(200)
                .expect('Content-Type', /json/)
                .then(response => {
                expect(response.body).toMatchObject({
                    status: 'healthy',
                    version: '1.0.0'
                });
                expect(response.body.timestamp).toBeTruthy();
                expect(response.body.uptime).toBeGreaterThan(0);
            });
        });
        it('should handle CORS headers correctly', async () => {
            await request(server)
                .options('/health')
                .expect(204)
                .then(response => {
                expect(response.headers['access-control-allow-origin']).toBeTruthy();
            });
        });
        it('should include security headers', async () => {
            await request(server)
                .get('/health')
                .expect(200)
                .then(response => {
                // Check for security headers from Helmet
                expect(response.headers['x-dns-prefetch-control']).toBeTruthy();
                expect(response.headers['x-frame-options']).toBeTruthy();
                expect(response.headers['x-download-options']).toBeTruthy();
                expect(response.headers['x-content-type-options']).toBeTruthy();
            });
        });
    });
    describe('Authentication Flow - HTTP Integration', () => {
        it('should complete full authentication flow', async () => {
            // 1. Login and get token
            const loginResponse = await request(server)
                .post('/api/v1/auth/login')
                .send({
                email: 'test@example.com',
                password: 'password'
            })
                .expect(200)
                .expect('Content-Type', /json/);
            expect(loginResponse.body).toHaveProperty('accessToken');
            expect(loginResponse.body).toHaveProperty('user');
            const token = loginResponse.body.accessToken;
            // 2. Use token to access protected endpoint
            await request(server)
                .get('/api/v1/protected')
                .set('Authorization', `Bearer ${token}`)
                .expect(200)
                .expect('Content-Type', /json/)
                .then(response => {
                expect(response.body).toMatchObject({
                    message: 'This is a protected endpoint',
                    user: {
                        id: '123',
                        email: 'test@example.com',
                        roles: ['user']
                    }
                });
            });
            // 3. Verify unauthorized access is blocked
            await request(server)
                .get('/api/v1/protected')
                .expect(401)
                .then(response => {
                expect(response.body).toMatchObject({
                    type: 'https://api.nyt-news-explorer.com/problems/invalid-token',
                    title: 'Invalid Token',
                    status: 401
                });
            });
        });
        it('should handle rate limiting', async () => {
            // Make multiple rapid requests to test rate limiting
            const requests = Array.from({ length: 5 }, () => request(server)
                .post('/api/v1/auth/login')
                .send({
                email: 'test@example.com',
                password: 'password'
            }));
            const responses = await Promise.all(requests);
            // All should succeed (rate limit is high for tests)
            responses.forEach(response => {
                expect([200, 429]).toContain(response.status);
            });
        });
    });
    describe('Articles API - HTTP Integration', () => {
        it('should search articles with query parameters', async () => {
            await request(server)
                .get('/api/v1/articles/search')
                .query({ q: 'technology', page: 1 })
                .expect(200)
                .expect('Content-Type', /json/)
                .then(response => {
                expect(response.body).toMatchObject({
                    status: 'OK',
                    response: {
                        docs: expect.any(Array),
                        meta: expect.any(Object)
                    }
                });
            });
        });
        it('should handle URL encoding properly', async () => {
            const query = 'artificial intelligence & machine learning';
            await request(server)
                .get('/api/v1/articles/search')
                .query({ q: query })
                .expect(200)
                .then(response => {
                expect(response.body.response.docs[0].headline.main).toContain(query);
            });
        });
    });
    describe('Error Handling - HTTP Integration', () => {
        it('should return proper error format for 404', async () => {
            await request(server)
                .get('/api/v1/nonexistent')
                .expect(404)
                .expect('Content-Type', /json/)
                .then(response => {
                expect(response.body).toHaveProperty('statusCode', 404);
                expect(response.body).toHaveProperty('error');
                expect(response.body).toHaveProperty('message');
            });
        });
        it('should handle malformed JSON in requests', async () => {
            await request(server)
                .post('/api/v1/auth/login')
                .set('Content-Type', 'application/json')
                .send('{"invalid": json}')
                .expect(400);
        });
        it('should include correlation ID in error responses', async () => {
            const correlationId = 'test-error-123';
            await request(server)
                .get('/api/v1/protected')
                .set('X-Correlation-ID', correlationId)
                .expect(401)
                .then(response => {
                expect(response.headers['x-correlation-id']).toBe(correlationId);
            });
        });
    });
    describe('Compression - HTTP Integration', () => {
        it('should compress responses when requested', async () => {
            await request(server)
                .get('/api/v1/articles/search?q=technology')
                .set('Accept-Encoding', 'gzip')
                .expect(200)
                .then(response => {
                // Response should be compressed if it's large enough
                expect(response.headers['content-encoding']).toBeTruthy();
            });
        });
    });
    describe('API Documentation - HTTP Integration', () => {
        it('should serve Swagger documentation', async () => {
            await request(server)
                .get('/docs')
                .expect(200)
                .expect('Content-Type', /text\/html/)
                .then(response => {
                expect(response.text).toContain('swagger-ui');
            });
        });
        it('should redirect root to documentation', async () => {
            await request(server)
                .get('/')
                .expect(302)
                .then(response => {
                expect(response.headers.location).toBe('/docs');
            });
        });
    });
    describe('Performance - HTTP Integration', () => {
        it('should respond quickly to health checks', async () => {
            const startTime = Date.now();
            await request(server)
                .get('/health')
                .expect(200);
            const responseTime = Date.now() - startTime;
            expect(responseTime).toBeLessThan(500); // Should respond within 500ms
        });
        it('should handle concurrent requests efficiently', async () => {
            const concurrentRequests = 20;
            const requests = Array.from({ length: concurrentRequests }, (_, i) => request(server)
                .get(`/health`)
                .expect(200));
            const startTime = Date.now();
            const responses = await Promise.all(requests);
            const totalTime = Date.now() - startTime;
            // All requests should succeed
            expect(responses).toHaveLength(concurrentRequests);
            // Total time should be reasonable (less than 5 seconds for 20 requests)
            expect(totalTime).toBeLessThan(5000);
        });
    });
});
