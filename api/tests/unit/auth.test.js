import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fastify from 'fastify';
import { registerPlugins } from '@/plugins/index-simple.js';
import { registerRoutes } from '@/routes/index-simple.js';
/**
 * Unit tests for authentication endpoints using Fastify inject
 */
describe('Authentication', () => {
    let app;
    beforeAll(async () => {
        app = fastify({
            logger: false
        });
        await registerPlugins(app);
        await registerRoutes(app);
    });
    afterAll(async () => {
        await app.close();
    });
    describe('POST /api/v1/auth/login', () => {
        it('should successfully authenticate with valid credentials', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/auth/login',
                payload: {
                    email: 'test@example.com',
                    password: 'password'
                }
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body).toHaveProperty('accessToken');
            expect(body).toHaveProperty('user');
            expect(body.user).toMatchObject({
                id: '123',
                email: 'test@example.com',
                roles: ['user']
            });
            // JWT should be properly formatted
            expect(body.accessToken).toMatch(/^eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[\w-]+$/);
        });
        it('should accept alternative valid credentials', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/auth/login',
                payload: {
                    email: 'demo@example.com',
                    password: 'demo123'
                }
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body).toHaveProperty('accessToken');
        });
        it('should reject missing credentials', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/auth/login',
                payload: {}
            });
            expect(response.statusCode).toBe(401);
            const body = JSON.parse(response.body);
            expect(body).toHaveProperty('error');
        });
        it('should reject invalid email format', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/auth/login',
                payload: {
                    email: 'invalid-email',
                    password: 'password'
                }
            });
            expect(response.statusCode).toBe(401);
        });
        it('should reject missing email', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/auth/login',
                payload: {
                    password: 'password'
                }
            });
            expect(response.statusCode).toBe(401);
        });
        it('should reject missing password', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/auth/login',
                payload: {
                    email: 'test@example.com'
                }
            });
            expect(response.statusCode).toBe(401);
        });
        it('should handle malformed JSON gracefully', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/auth/login',
                payload: '{"invalid": json}'
            });
            expect(response.statusCode).toBe(400);
        });
        it('should include correlation ID in response', async () => {
            const correlationId = 'test-auth-123';
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/auth/login',
                headers: {
                    'x-correlation-id': correlationId
                },
                payload: {
                    email: 'test@example.com',
                    password: 'password'
                }
            });
            expect(response.headers['x-correlation-id']).toBe(correlationId);
        });
    });
    describe('JWT Token Validation', () => {
        it('should generate valid JWT tokens', async () => {
            const loginResponse = await app.inject({
                method: 'POST',
                url: '/api/v1/auth/login',
                payload: {
                    email: 'test@example.com',
                    password: 'password'
                }
            });
            const { accessToken } = JSON.parse(loginResponse.body);
            // JWT should have 3 parts separated by dots
            const parts = accessToken.split('.');
            expect(parts).toHaveLength(3);
            // Header should be properly formatted
            const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
            expect(header).toMatchObject({
                alg: 'HS256',
                typ: 'JWT'
            });
            // Payload should contain expected claims
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            expect(payload).toMatchObject({
                id: '123',
                email: 'test@example.com',
                roles: ['user']
            });
            expect(payload).toHaveProperty('iat'); // issued at
            expect(payload).toHaveProperty('exp'); // expiration
        });
    });
    describe('Protected Endpoint', () => {
        let validToken;
        beforeAll(async () => {
            const loginResponse = await app.inject({
                method: 'POST',
                url: '/api/v1/auth/login',
                payload: {
                    email: 'test@example.com',
                    password: 'password'
                }
            });
            const body = JSON.parse(loginResponse.body);
            validToken = body.accessToken;
        });
        it('should allow access with valid token', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/protected',
                headers: {
                    authorization: `Bearer ${validToken}`
                }
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body).toMatchObject({
                message: 'This is a protected endpoint',
                user: {
                    id: '123',
                    email: 'test@example.com',
                    roles: ['user']
                }
            });
            expect(body.timestamp).toBeTruthy();
        });
        it('should reject requests without token', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/protected'
            });
            expect(response.statusCode).toBe(401);
            const body = JSON.parse(response.body);
            expect(body).toMatchObject({
                type: 'https://api.nyt-news-explorer.com/problems/invalid-token',
                title: 'Invalid Token',
                status: 401,
                detail: 'Authentication required'
            });
        });
        it('should reject invalid tokens', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/protected',
                headers: {
                    authorization: 'Bearer invalid-token'
                }
            });
            expect(response.statusCode).toBe(401);
        });
        it('should reject malformed authorization header', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/protected',
                headers: {
                    authorization: 'InvalidFormat'
                }
            });
            expect(response.statusCode).toBe(401);
        });
        it('should handle expired tokens gracefully', async () => {
            // This would need a way to create expired tokens in a real scenario
            // For now, we'll test with a malformed token that simulates expiration
            const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImV4cCI6MX0.invalid';
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/protected',
                headers: {
                    authorization: `Bearer ${expiredToken}`
                }
            });
            expect(response.statusCode).toBe(401);
        });
    });
});
