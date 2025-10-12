import { FastifyInstance } from 'fastify';
declare function redisPlugin(fastify: FastifyInstance): Promise<void>;
declare const plugin: typeof redisPlugin;
export default plugin;
