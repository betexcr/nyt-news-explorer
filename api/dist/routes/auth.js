import { z } from 'zod';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { createHash } from 'crypto';
/**
 * Authentication routes implementing OAuth 2.0 Security BCP (RFC 9700)
 * - Authorization Code Flow with PKCE
 * - JWT token generation and refresh
 * - Secure token handling
 * - Rate limiting applied via plugin
 */
// Request/Response schemas
const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});
const registerSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'Password must contain uppercase, lowercase, number, and special character'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
});
const refreshTokenSchema = z.object({
    refreshToken: z.string(),
});
const pkceSchema = z.object({
    codeChallenge: z.string(),
    codeChallengeMethod: z.enum(['S256']),
    state: z.string(),
    redirectUri: z.string().url(),
});
export async function authRoutes(fastify) {
    // OAuth 2.0 Authorization Endpoint
    fastify.get('/authorize', {
        schema: {
            tags: ['Authentication'],
            summary: 'OAuth 2.0 Authorization',
            description: 'Initiates OAuth 2.0 authorization flow with PKCE',
            querystring: {
                type: 'object',
                properties: {
                    response_type: { type: 'string', enum: ['code'] },
                    client_id: { type: 'string' },
                    redirect_uri: { type: 'string', format: 'uri' },
                    scope: { type: 'string' },
                    state: { type: 'string' },
                    code_challenge: { type: 'string' },
                    code_challenge_method: { type: 'string', enum: ['S256'] },
                },
                required: ['response_type', 'client_id', 'redirect_uri', 'code_challenge', 'code_challenge_method'],
            },
            response: {
                302: {
                    description: 'Redirect to authorization server',
                },
                400: { $ref: '#/components/responses/400' },
            },
        },
    }, async (request, reply) => {
        const query = request.query;
        try {
            // Validate PKCE parameters
            const pkce = pkceSchema.parse({
                codeChallenge: query.code_challenge,
                codeChallengeMethod: query.code_challenge_method,
                state: query.state,
                redirectUri: query.redirect_uri,
            });
            // Store PKCE challenge for later verification
            const challengeKey = `pkce:${query.state}`;
            await fastify.redis.setex(challengeKey, 600, JSON.stringify({
                codeChallenge: pkce.codeChallenge,
                codeChallengeMethod: pkce.codeChallengeMethod,
                redirectUri: pkce.redirectUri,
                clientId: query.client_id,
                createdAt: Date.now(),
            }));
            // Generate authorization code
            const authCode = crypto.randomBytes(32).toString('base64url');
            const codeKey = `auth_code:${authCode}`;
            await fastify.redis.setex(codeKey, 600, JSON.stringify({
                state: query.state,
                scope: query.scope || 'read:articles write:favorites',
                userId: null, // Will be set after user authentication
                createdAt: Date.now(),
            }));
            // Redirect to consent page (or directly return code for demo)
            const redirectUrl = new URL(query.redirect_uri);
            redirectUrl.searchParams.set('code', authCode);
            redirectUrl.searchParams.set('state', query.state);
            reply.redirect(302, redirectUrl.toString());
        }
        catch (error) {
            reply.code(400).send({
                type: 'https://api.nyt-news-explorer.com/problems/invalid-authorization-request',
                title: 'Invalid Authorization Request',
                status: 400,
                detail: error.message,
                instance: request.url,
                correlationId: request.headers['x-correlation-id'],
            });
        }
    });
    // OAuth 2.0 Token Endpoint
    fastify.post('/token', {
        schema: {
            tags: ['Authentication'],
            summary: 'OAuth 2.0 Token Exchange',
            description: 'Exchanges authorization code for access token using PKCE',
            body: {
                type: 'object',
                properties: {
                    grant_type: { type: 'string', enum: ['authorization_code'] },
                    code: { type: 'string' },
                    redirect_uri: { type: 'string', format: 'uri' },
                    client_id: { type: 'string' },
                    code_verifier: { type: 'string' },
                },
                required: ['grant_type', 'code', 'redirect_uri', 'client_id', 'code_verifier'],
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        access_token: { type: 'string' },
                        token_type: { type: 'string', enum: ['Bearer'] },
                        expires_in: { type: 'number' },
                        refresh_token: { type: 'string' },
                        scope: { type: 'string' },
                    },
                },
                400: { $ref: '#/components/responses/400' },
                401: { $ref: '#/components/responses/401' },
            },
        },
    }, async (request, reply) => {
        const body = request.body;
        try {
            // Retrieve authorization code
            const codeKey = `auth_code:${body.code}`;
            const codeData = await fastify.redis.get(codeKey);
            if (!codeData) {
                throw new Error('Invalid or expired authorization code');
            }
            const authCodeInfo = JSON.parse(codeData);
            // Retrieve PKCE challenge
            const challengeKey = `pkce:${authCodeInfo.state}`;
            const challengeData = await fastify.redis.get(challengeKey);
            if (!challengeData) {
                throw new Error('Invalid or expired PKCE challenge');
            }
            const pkceInfo = JSON.parse(challengeData);
            // Verify PKCE code verifier
            const codeChallenge = createHash('sha256')
                .update(body.code_verifier)
                .digest('base64url');
            if (codeChallenge !== pkceInfo.codeChallenge) {
                throw new Error('Invalid code verifier');
            }
            // Verify redirect URI matches
            if (body.redirect_uri !== pkceInfo.redirectUri) {
                throw new Error('Redirect URI mismatch');
            }
            // For demo, create a user (in real app, this would be from the authorization flow)
            const user = {
                id: crypto.randomUUID(),
                email: 'demo@example.com',
                name: 'Demo User',
                roles: ['user'],
            };
            // Generate token pair
            const tokenPair = await fastify.generateTokenPair(user);
            // Clean up used codes
            await fastify.redis.del(codeKey, challengeKey);
            reply.send({
                access_token: tokenPair.accessToken,
                token_type: 'Bearer',
                expires_in: tokenPair.expiresIn,
                refresh_token: tokenPair.refreshToken,
                scope: authCodeInfo.scope,
            });
        }
        catch (error) {
            reply.code(400).send({
                type: 'https://api.nyt-news-explorer.com/problems/invalid-token-request',
                title: 'Invalid Token Request',
                status: 400,
                detail: error.message,
                instance: request.url,
                correlationId: request.headers['x-correlation-id'],
            });
        }
    });
    // Traditional login endpoint
    fastify.post('/login', {
        schema: {
            tags: ['Authentication'],
            summary: 'User Login',
            description: 'Authenticate user with email and password',
            body: {
                type: 'object',
                properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                },
                required: ['email', 'password'],
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                        expiresIn: { type: 'number' },
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                email: { type: 'string' },
                                name: { type: 'string' },
                                roles: { type: 'array', items: { type: 'string' } },
                            },
                        },
                    },
                },
                400: { $ref: '#/components/responses/400' },
                401: { $ref: '#/components/responses/401' },
                429: { $ref: '#/components/responses/429' },
            },
        },
    }, async (request, reply) => {
        try {
            const { email, password } = loginSchema.parse(request.body);
            // Rate limiting - additional protection for login attempts
            const loginAttemptKey = `login_attempts:${request.ip}`;
            const attempts = await fastify.redis.incr(loginAttemptKey);
            await fastify.redis.expire(loginAttemptKey, 900); // 15 minutes
            if (attempts > 5) {
                return reply.code(429).send({
                    type: 'https://api.nyt-news-explorer.com/problems/too-many-login-attempts',
                    title: 'Too Many Login Attempts',
                    status: 429,
                    detail: 'Too many failed login attempts. Please try again later.',
                    instance: request.url,
                    retryAfter: 900,
                    correlationId: request.headers['x-correlation-id'],
                });
            }
            // Retrieve user (placeholder - implement with your user storage)
            const user = await getUserByEmail(email);
            if (!user) {
                // Still hash password to prevent timing attacks
                await bcrypt.hash(password, 12);
                throw new Error('Invalid credentials');
            }
            // Verify password
            const passwordValid = await bcrypt.compare(password, user.passwordHash);
            if (!passwordValid) {
                throw new Error('Invalid credentials');
            }
            // Clear login attempts on successful login
            await fastify.redis.del(loginAttemptKey);
            // Generate tokens
            const tokenPair = await fastify.generateTokenPair({
                id: user.id,
                email: user.email,
                roles: user.roles,
            });
            // Log successful authentication
            request.log.info({
                userId: user.id,
                email: user.email,
                userAgent: request.headers['user-agent'],
            }, 'User authenticated successfully');
            reply.send({
                accessToken: tokenPair.accessToken,
                refreshToken: tokenPair.refreshToken,
                expiresIn: tokenPair.expiresIn,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    roles: user.roles,
                },
            });
        }
        catch (error) {
            reply.code(401).send({
                type: 'https://api.nyt-news-explorer.com/problems/authentication-failed',
                title: 'Authentication Failed',
                status: 401,
                detail: 'Invalid email or password',
                instance: request.url,
                correlationId: request.headers['x-correlation-id'],
            });
        }
    });
    // User registration
    fastify.post('/register', {
        schema: {
            tags: ['Authentication'],
            summary: 'User Registration',
            description: 'Register a new user account',
            body: {
                type: 'object',
                properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                    name: { type: 'string', minLength: 2 },
                },
                required: ['email', 'password', 'name'],
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                        expiresIn: { type: 'number' },
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                email: { type: 'string' },
                                name: { type: 'string' },
                                roles: { type: 'array', items: { type: 'string' } },
                            },
                        },
                    },
                },
                400: { $ref: '#/components/responses/400' },
                409: {
                    description: 'User already exists',
                    content: {
                        'application/problem+json': {
                            schema: { $ref: '#/components/schemas/ProblemDetails' },
                        },
                    },
                },
                429: { $ref: '#/components/responses/429' },
            },
        },
    }, async (request, reply) => {
        try {
            const { email, password, name } = registerSchema.parse(request.body);
            // Check if user already exists
            const existingUser = await getUserByEmail(email);
            if (existingUser) {
                return reply.code(409).send({
                    type: 'https://api.nyt-news-explorer.com/problems/user-already-exists',
                    title: 'User Already Exists',
                    status: 409,
                    detail: 'A user with this email address already exists',
                    instance: request.url,
                    correlationId: request.headers['x-correlation-id'],
                });
            }
            // Hash password
            const passwordHash = await bcrypt.hash(password, 12);
            // Create user
            const user = {
                id: crypto.randomUUID(),
                email,
                name,
                passwordHash,
                roles: ['user'],
                createdAt: new Date().toISOString(),
                emailVerified: false,
            };
            // Save user (placeholder - implement with your user storage)
            await saveUser(user);
            // Generate tokens
            const tokenPair = await fastify.generateTokenPair({
                id: user.id,
                email: user.email,
                roles: user.roles,
            });
            // Log user registration
            request.log.info({
                userId: user.id,
                email: user.email,
                userAgent: request.headers['user-agent'],
            }, 'User registered successfully');
            reply.code(201).send({
                accessToken: tokenPair.accessToken,
                refreshToken: tokenPair.refreshToken,
                expiresIn: tokenPair.expiresIn,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    roles: user.roles,
                },
            });
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({
                    type: 'https://api.nyt-news-explorer.com/problems/validation-failed',
                    title: 'Validation Failed',
                    status: 400,
                    detail: 'Invalid registration data',
                    instance: request.url,
                    errors: error.errors,
                    correlationId: request.headers['x-correlation-id'],
                });
            }
            reply.code(500).send({
                type: 'https://api.nyt-news-explorer.com/problems/registration-failed',
                title: 'Registration Failed',
                status: 500,
                detail: 'Failed to create user account',
                instance: request.url,
                correlationId: request.headers['x-correlation-id'],
            });
        }
    });
    // Logout endpoint
    fastify.post('/logout', {
        preHandler: [fastify.authenticate],
        schema: {
            tags: ['Authentication'],
            summary: 'User Logout',
            description: 'Logout user and revoke tokens',
            security: [{ BearerAuth: [] }],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                    },
                },
                401: { $ref: '#/components/responses/401' },
            },
        },
    }, async (request, reply) => {
        try {
            // Get token from header
            const token = request.headers.authorization?.replace('Bearer ', '');
            if (token) {
                // Add token to blacklist
                const tokenHash = createHash('sha256').update(token).digest('hex');
                const decoded = fastify.jwt.verify(token);
                const ttl = decoded.exp - Math.floor(Date.now() / 1000);
                if (ttl > 0) {
                    await fastify.redis.setex(`blacklist:${tokenHash}`, ttl, '1');
                }
            }
            // Log logout
            request.log.info({
                userId: request.user?.id,
                userAgent: request.headers['user-agent'],
            }, 'User logged out');
            reply.send({ message: 'Logged out successfully' });
        }
        catch (error) {
            reply.code(500).send({
                type: 'https://api.nyt-news-explorer.com/problems/logout-failed',
                title: 'Logout Failed',
                status: 500,
                detail: 'Failed to logout user',
                instance: request.url,
                correlationId: request.headers['x-correlation-id'],
            });
        }
    });
}
// Placeholder functions - implement with your user storage system
async function getUserByEmail(email) {
    // This should query your user database
    return null;
}
async function saveUser(user) {
    // This should save user to your database
}
