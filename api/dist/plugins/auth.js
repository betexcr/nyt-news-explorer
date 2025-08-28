import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import oauth2 from '@fastify/oauth2';
import auth from '@fastify/auth';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import crypto from 'crypto';
import { config } from '@/config/environment.js';
async function authPlugin(fastify) {
    // Register JWT support with secure configuration
    await fastify.register(jwt, {
        secret: config.security.jwt.secret,
        sign: {
            issuer: config.security.jwt.issuer,
            audience: config.security.jwt.audience,
            algorithm: 'HS256', // Use symmetric for internal tokens
            expiresIn: config.security.jwt.accessTokenTtl,
        },
        verify: {
            issuer: config.security.jwt.issuer,
            audience: config.security.jwt.audience,
            algorithms: ['HS256'],
            clockTolerance: 30, // 30 seconds clock skew tolerance
        },
    });
    // Register OAuth 2.0 provider
    await fastify.register(oauth2, {
        name: 'googleOAuth2',
        credentials: {
            client: {
                id: config.security.oauth.clientId,
                secret: config.security.oauth.clientSecret,
            },
            auth: oauth2.GOOGLE_CONFIGURATION,
        },
        startRedirectPath: '/auth/google',
        callbackUri: config.security.oauth.redirectUri,
        // Generate state parameter with CSRF protection
        generateStateFunction: () => {
            return crypto.randomBytes(32).toString('hex');
        },
        checkStateFunction: (state, callback) => {
            // Validate state parameter (implement your own logic)
            callback();
        },
        // PKCE configuration for enhanced security
        pkce: 'S256', // Use SHA256 for code challenge
        scope: ['openid', 'email', 'profile'],
    });
    // Register auth utilities
    await fastify.register(auth);
    // JWKS for external token verification (Google, etc.)
    const JWKS = createRemoteJWKSet(new URL(config.security.oauth.jwksUrl));
    // Token verification functions
    const verifyInternalToken = async (request, reply) => {
        try {
            await request.jwtVerify();
            // Additional validation (RFC 8725)
            const payload = request.user;
            // Validate required claims
            if (!payload.iss || !payload.aud || !payload.exp || !payload.iat) {
                throw new Error('Missing required JWT claims');
            }
            // Check if token is expired (with clock skew)
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp < now - 30) {
                throw new Error('Token expired');
            }
            // Check if token is not valid yet
            if (payload.nbf && payload.nbf > now + 30) {
                throw new Error('Token not valid yet');
            }
            // Rate limiting for token validation
            const tokenHash = crypto.createHash('sha256').update(request.headers.authorization?.split(' ')[1] || '').digest('hex');
            const key = `token:${tokenHash}`;
            const usage = await fastify.redis.incr(key);
            await fastify.redis.expire(key, 60); // 1 minute window
            if (usage > 100) { // Max 100 requests per token per minute
                throw new Error('Token usage limit exceeded');
            }
        }
        catch (error) {
            reply.code(401).send({
                type: 'https://api.nyt-news-explorer.com/problems/invalid-token',
                title: 'Invalid Token',
                status: 401,
                detail: error instanceof Error ? error.message : 'Unknown error',
                instance: request.url,
                correlationId: request.headers['x-correlation-id'],
            });
        }
    };
    const verifyExternalToken = async (request, reply) => {
        try {
            const token = request.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                throw new Error('No token provided');
            }
            // Verify JWT using JWKS
            const { payload } = await jwtVerify(token, JWKS, {
                issuer: 'https://accounts.google.com',
                audience: config.security.oauth.clientId,
                clockTolerance: 30,
            });
            request.user = payload;
        }
        catch (error) {
            reply.code(401).send({
                type: 'https://api.nyt-news-explorer.com/problems/invalid-external-token',
                title: 'Invalid External Token',
                status: 401,
                detail: 'Failed to verify external token',
                instance: request.url,
                correlationId: request.headers['x-correlation-id'],
            });
        }
    };
    const verifyApiKey = async (request, reply) => {
        try {
            const apiKey = request.headers['x-api-key'];
            if (!apiKey) {
                throw new Error('API key required');
            }
            // Hash the API key for comparison (store hashed keys in Redis/DB)
            const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
            const storedKey = await fastify.redis.get(`api-key:${hashedKey}`);
            if (!storedKey) {
                throw new Error('Invalid API key');
            }
            // Parse stored key data
            const keyData = JSON.parse(storedKey);
            // Check rate limits for this API key
            const usageKey = `api-usage:${hashedKey}`;
            const usage = await fastify.redis.incr(usageKey);
            await fastify.redis.expire(usageKey, 3600); // 1 hour window
            if (usage > keyData.hourlyLimit) {
                throw new Error('API key rate limit exceeded');
            }
            // Set user context
            request.user = {
                id: keyData.userId,
                email: keyData.email,
                roles: keyData.roles || ['api-user'],
            };
        }
        catch (error) {
            reply.code(401).send({
                type: 'https://api.nyt-news-explorer.com/problems/invalid-api-key',
                title: 'Invalid API Key',
                status: 401,
                detail: error instanceof Error ? error.message : 'Unknown error',
                instance: request.url,
                correlationId: request.headers['x-correlation-id'],
            });
        }
    };
    // Register authentication methods
    fastify.decorate('authenticate', fastify.auth([
        verifyInternalToken,
        verifyExternalToken,
        verifyApiKey,
    ]));
    // Role-based authorization
    fastify.decorate('authorize', (roles) => {
        return async (request, reply) => {
            if (!request.user) {
                return reply.code(401).send({
                    type: 'https://api.nyt-news-explorer.com/problems/unauthorized',
                    title: 'Unauthorized',
                    status: 401,
                    detail: 'Authentication required',
                    instance: request.url,
                });
            }
            const userRoles = request.user.roles || [];
            const hasRequiredRole = roles.some(role => userRoles.includes(role));
            if (!hasRequiredRole) {
                return reply.code(403).send({
                    type: 'https://api.nyt-news-explorer.com/problems/forbidden',
                    title: 'Forbidden',
                    status: 403,
                    detail: `Required roles: ${roles.join(', ')}`,
                    instance: request.url,
                });
            }
        };
    });
    // Token generation utilities
    fastify.decorate('generateTokenPair', async (user) => {
        const accessToken = fastify.jwt.sign({
            id: user.id,
            email: user.email,
            roles: user.roles,
        });
        // Generate refresh token
        const refreshPayload = {
            id: user.id,
            type: 'refresh',
            jti: crypto.randomUUID(), // Unique token ID for revocation
        };
        const refreshToken = fastify.jwt.sign(refreshPayload, {
            expiresIn: config.security.jwt.refreshTokenTtl,
        });
        // Store refresh token in Redis for revocation
        const refreshKey = `refresh:${refreshPayload.jti}`;
        await fastify.redis.setex(refreshKey, config.security.jwt.refreshTokenTtl, JSON.stringify({
            userId: user.id,
            createdAt: new Date().toISOString(),
        }));
        return {
            accessToken,
            refreshToken,
            expiresIn: config.security.jwt.accessTokenTtl,
        };
    });
    // Token refresh endpoint
    fastify.post('/auth/refresh', async (request, reply) => {
        try {
            const { refreshToken } = request.body;
            if (!refreshToken) {
                return reply.code(400).send({
                    type: 'https://api.nyt-news-explorer.com/problems/missing-refresh-token',
                    title: 'Missing Refresh Token',
                    status: 400,
                    detail: 'Refresh token is required',
                    instance: request.url,
                });
            }
            // Verify refresh token
            const decoded = fastify.jwt.verify(refreshToken);
            if (decoded.type !== 'refresh') {
                throw new Error('Invalid token type');
            }
            // Check if refresh token exists in Redis
            const refreshKey = `refresh:${decoded.jti}`;
            const storedToken = await fastify.redis.get(refreshKey);
            if (!storedToken) {
                throw new Error('Refresh token revoked or expired');
            }
            // Get user data
            const userData = JSON.parse(storedToken);
            const user = await getUserById(userData.userId); // Implement this function
            if (!user) {
                throw new Error('User not found');
            }
            // Generate new token pair
            const tokenPair = await fastify.generateTokenPair(user);
            // Revoke old refresh token
            await fastify.redis.del(refreshKey);
            reply.send(tokenPair);
        }
        catch (error) {
            reply.code(401).send({
                type: 'https://api.nyt-news-explorer.com/problems/invalid-refresh-token',
                title: 'Invalid Refresh Token',
                status: 401,
                detail: error instanceof Error ? error.message : 'Unknown error',
                instance: request.url,
            });
        }
    });
    // Token revocation endpoint
    fastify.post('/auth/revoke', {
        preHandler: fastify.authenticate,
    }, async (request, reply) => {
        try {
            const { token, tokenTypeHint } = request.body;
            if (!token) {
                return reply.code(400).send({
                    type: 'https://api.nyt-news-explorer.com/problems/missing-token',
                    title: 'Missing Token',
                    status: 400,
                    detail: 'Token is required for revocation',
                    instance: request.url,
                });
            }
            // Decode token to get JTI
            const decoded = fastify.jwt.verify(token);
            if (decoded.type === 'refresh' || tokenTypeHint === 'refresh_token') {
                // Revoke refresh token
                await fastify.redis.del(`refresh:${decoded.jti}`);
            }
            else {
                // Add access token to blacklist
                const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
                await fastify.redis.setex(`blacklist:${tokenHash}`, decoded.exp - Math.floor(Date.now() / 1000), '1');
            }
            reply.code(200).send({ revoked: true });
        }
        catch (error) {
            reply.code(400).send({
                type: 'https://api.nyt-news-explorer.com/problems/revocation-failed',
                title: 'Token Revocation Failed',
                status: 400,
                detail: error instanceof Error ? error.message : 'Unknown error',
                instance: request.url,
            });
        }
    });
}
// Placeholder function - implement based on your user storage
async function getUserById(userId) {
    // This should query your user database/store
    return {
        id: userId,
        email: 'user@example.com',
        roles: ['user'],
    };
}
const plugin = fp(authPlugin, {
    name: 'auth',
    dependencies: ['jwt', 'redis'],
    fastify: '4.x',
});
export default plugin;
