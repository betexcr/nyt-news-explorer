import fp from 'fastify-plugin';
import redis from '@fastify/redis';
import { config } from '@/config/environment.js';
async function redisPlugin(fastify) {
    // Register Redis with basic configuration
    await fastify.register(redis, {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        enableReadyCheck: true,
        lazyConnect: true,
    });
}
const plugin = fp(redisPlugin, {
    name: 'redis-simple',
    fastify: '4.x',
});
export default plugin;
