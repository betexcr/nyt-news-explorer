import fp from 'fastify-plugin'
import redis from '@fastify/redis'
import { FastifyInstance } from 'fastify'
import { config } from '@/config/environment.js'

async function redisPlugin(fastify: FastifyInstance) {
  // Use REDIS_URL if available (Railway), otherwise use individual config
  const redisConfig = config.redis.url 
    ? { url: config.redis.url }
    : {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
      }

  // Register Redis with configuration
  await fastify.register(redis as any, {
    ...redisConfig,
    enableReadyCheck: true,
    lazyConnect: true,
  })
}

const plugin = fp(redisPlugin, {
  name: 'redis-simple',
  fastify: '4.x',
})

export default plugin