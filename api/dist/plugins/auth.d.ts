import { FastifyInstance } from 'fastify';
/**
 * Authentication and Authorization plugin
 * - Implements OAuth 2.0 Security BCP (RFC 9700)
 * - JWT hardening (RFC 8725)
 * - PKCE support for SPAs
 * - Sender-constrained tokens
 * - JWKS key rotation
 * - Short-lived access tokens with secure refresh
 */
interface User {
    id: string;
    email: string;
    roles: string[];
    iat?: number;
    exp?: number;
    iss?: string;
    aud?: string;
}
interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
declare module 'fastify' {
    interface FastifyRequest {
        user?: User;
    }
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        authorize: (roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        generateTokenPair: (user: Omit<User, 'iat' | 'exp' | 'iss' | 'aud'>) => Promise<TokenPair>;
    }
}
declare function authPlugin(fastify: FastifyInstance): Promise<void>;
declare const plugin: typeof authPlugin;
export default plugin;
