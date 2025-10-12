import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fastify from 'fastify';
import { registerPlugins } from '@/plugins/index-simple.js';
import { registerRoutes } from '@/routes/index-simple.js';
/**
 * Unit tests for health endpoints using Fastify inject
 * These tests are fast and don't require network calls
 */
describe('Health Endpoints', () => {
    let app;
    beforeAll(async () => {
        app = fastify({
            logger: false // Disable logging for tests
        });
        await registerPlugins(app);
        await registerRoutes(app);
    });
    afterAll(async () => {
        await app.close();
    });
    describe('GET /health', () => {
        it('should return healthy status', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/health'
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body).toMatchObject({
                status: 'healthy',
                version: '1.0.0'
            });
            expect(body.timestamp).toBeTruthy();
            expect(body.uptime).toBeGreaterThan(0);
        });
        it('should have correct content type', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/health'
            });
            expect(response.headers['content-type']).toMatch(/application\/json/);
        });
        it('should include correlation id in headers', async () => {
            const correlationId = 'test-correlation-123';
            const response = await app.inject({
                method: 'GET',
                url: '/health',
                headers: {
                    'x-correlation-id': correlationId
                }
            });
            expect(response.headers['x-correlation-id']).toBe(correlationId);
        });
    });
    describe('GET /api/v1/health', () => {
        it('should return detailed health status', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/health'
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body).toMatchObject({
                status: 'healthy',
                version: '1.0.0',
                environment: 'development'
            });
            expect(body.timestamp).toBeTruthy();
        });
        it('should not require authentication', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/health'
            });
            expect(response.statusCode).toBe(200);
        });
    });
    describe('Error handling', () => {
        it('should handle invalid methods gracefully', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/health'
            });
            expect(response.statusCode).toBe(404);
        });
        it('should return 404 for non-existent endpoints', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/non-existent'
            });
            expect(response.statusCode).toBe(404);
        });
    });
});
