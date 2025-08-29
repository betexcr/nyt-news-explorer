import { FastifyInstance } from 'fastify';
interface User {
    id: string;
    email: string;
    roles: string[];
}
declare module 'fastify' {
    interface FastifyRequest {
        user?: User;
    }
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}
declare function authPlugin(fastify: FastifyInstance): Promise<void>;
declare const plugin: typeof authPlugin;
export default plugin;
