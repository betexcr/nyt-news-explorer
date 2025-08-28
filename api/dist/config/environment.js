import { z } from 'zod';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
/**
 * Environment configuration schema with comprehensive validation
 * Implements security best practices and operational requirements
 */
const configSchema = z.object({
    // Node.js Environment
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
    // Server Configuration
    server: z.object({
        port: z.coerce.number().int().min(1024).max(65535).default(3000),
        host: z.string().default('0.0.0.0'),
    }),
    // Security Configuration (RFC 8725, RFC 9700)
    security: z.object({
        jwt: z.object({
            secret: z.string().min(32), // At least 256 bits
            issuer: z.string().url(),
            audience: z.string(),
            accessTokenTtl: z.coerce.number().int().positive().default(900), // 15 minutes
            refreshTokenTtl: z.coerce.number().int().positive().default(2592000), // 30 days
        }),
        oauth: z.object({
            clientId: z.string(),
            clientSecret: z.string(),
            redirectUri: z.string().url(),
            authorizationUrl: z.string().url(),
            tokenUrl: z.string().url(),
            jwksUrl: z.string().url(),
        }),
        tls: z.object({
            certPath: z.string().optional(),
            keyPath: z.string().optional(),
        }),
        enableHttp3: z.coerce.boolean().default(false),
    }),
    // Rate Limiting Configuration
    rateLimiting: z.object({
        max: z.coerce.number().int().positive().default(100),
        windowMs: z.coerce.number().int().positive().default(900000), // 15 minutes
        skipSuccessHeaders: z.coerce.boolean().default(false),
    }),
    // Redis Configuration
    redis: z.object({
        host: z.string().default('localhost'),
        port: z.coerce.number().int().min(1).max(65535).default(6379),
        password: z.string().optional(),
        db: z.coerce.number().int().min(0).default(0),
    }),
    // Database Configuration
    database: z.object({
        url: z.string().optional(),
    }),
    // External APIs
    externalApis: z.object({
        nytApiKey: z.string(),
    }),
    // Observability Configuration (OpenTelemetry, W3C Trace Context)
    otel: z.object({
        serviceName: z.string().default('nyt-news-api'),
        serviceVersion: z.string().default('1.0.0'),
        jaegerEndpoint: z.string().url().default('http://localhost:14268/api/traces'),
    }),
    // Logging Configuration
    logger: z.object({
        level: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    }),
    // CORS Configuration
    cors: z.object({
        origin: z.string().transform(val => val.split(',')).default('http://localhost:3000'),
        credentials: z.coerce.boolean().default(true),
    }),
});
/**
 * Parse and validate environment configuration
 * Fails fast if required environment variables are missing or invalid
 */
function parseConfig() {
    try {
        const rawConfig = {
            nodeEnv: process.env.NODE_ENV,
            server: {
                port: process.env.PORT,
                host: process.env.HOST,
            },
            security: {
                jwt: {
                    secret: process.env.JWT_SECRET,
                    issuer: process.env.JWT_ISSUER,
                    audience: process.env.JWT_AUDIENCE,
                    accessTokenTtl: process.env.JWT_ACCESS_TOKEN_TTL,
                    refreshTokenTtl: process.env.JWT_REFRESH_TOKEN_TTL,
                },
                oauth: {
                    clientId: process.env.OAUTH_CLIENT_ID,
                    clientSecret: process.env.OAUTH_CLIENT_SECRET,
                    redirectUri: process.env.OAUTH_REDIRECT_URI,
                    authorizationUrl: process.env.OAUTH_AUTHORIZATION_URL,
                    tokenUrl: process.env.OAUTH_TOKEN_URL,
                    jwksUrl: process.env.OAUTH_JWKS_URL,
                },
                tls: {
                    certPath: process.env.TLS_CERT_PATH,
                    keyPath: process.env.TLS_KEY_PATH,
                },
                enableHttp3: process.env.ENABLE_HTTP3,
            },
            rateLimiting: {
                max: process.env.RATE_LIMIT_MAX,
                windowMs: process.env.RATE_LIMIT_WINDOW_MS,
                skipSuccessHeaders: process.env.RATE_LIMIT_SKIP_SUCCESS_HEADERS,
            },
            redis: {
                host: process.env.REDIS_HOST,
                port: process.env.REDIS_PORT,
                password: process.env.REDIS_PASSWORD,
                db: process.env.REDIS_DB,
            },
            database: {
                url: process.env.DATABASE_URL,
            },
            externalApis: {
                nytApiKey: process.env.NYT_API_KEY,
            },
            otel: {
                serviceName: process.env.OTEL_SERVICE_NAME,
                serviceVersion: process.env.OTEL_SERVICE_VERSION,
                jaegerEndpoint: process.env.JAEGER_ENDPOINT,
            },
            logger: {
                level: process.env.LOG_LEVEL,
            },
            cors: {
                origin: process.env.CORS_ORIGIN,
                credentials: process.env.CORS_CREDENTIALS,
            },
        };
        return configSchema.parse(rawConfig);
    }
    catch (error) {
        console.error('❌ Invalid environment configuration:');
        if (error instanceof z.ZodError) {
            error.errors.forEach((err) => {
                console.error(`  - ${err.path.join('.')}: ${err.message}`);
            });
        }
        else {
            console.error(error);
        }
        process.exit(1);
    }
}
const baseConfig = parseConfig();
// Environment helpers
export const isDevelopment = baseConfig.nodeEnv === 'development';
export const isProduction = baseConfig.nodeEnv === 'production';
export const isTest = baseConfig.nodeEnv === 'test';
// Add convenience properties to config
export const config = {
    ...baseConfig,
    isDevelopment,
    isProduction,
    isTest,
};
