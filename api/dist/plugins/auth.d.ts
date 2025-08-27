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
declare module 'fastify' {
    interface FastifyRequest {
        user?: User;
    }
}
declare function authPlugin(fastify: FastifyInstance): Promise<void>;
declare const _default: typeof authPlugin;
export default _default;
