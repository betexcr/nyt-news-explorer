export declare const isDevelopment: boolean;
export declare const isProduction: boolean;
export declare const isTest: boolean;
export declare const config: {
    isDevelopment: boolean;
    isProduction: boolean;
    isTest: boolean;
    nodeEnv: "development" | "production" | "test";
    server: {
        port: number;
        host: string;
    };
    security: {
        jwt: {
            secret: string;
            issuer: string;
            audience: string;
            accessTokenTtl: number;
            refreshTokenTtl: number;
        };
        oauth: {
            clientId: string;
            clientSecret: string;
            redirectUri: string;
            authorizationUrl: string;
            tokenUrl: string;
            jwksUrl: string;
        };
        tls: {
            certPath?: string | undefined;
            keyPath?: string | undefined;
        };
        enableHttp3: boolean;
    };
    rateLimiting: {
        max: number;
        windowMs: number;
        skipSuccessHeaders: boolean;
    };
    redis: {
        port: number;
        host: string;
        db: number;
        password?: string | undefined;
    };
    database: {
        url?: string | undefined;
    };
    externalApis: {
        nytApiKey: string;
    };
    otel: {
        serviceName: string;
        serviceVersion: string;
        jaegerEndpoint: string;
    };
    logger: {
        level: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
    };
    cors: {
        origin: string[];
        credentials: boolean;
    };
};
