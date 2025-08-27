import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { config } from '@/config/environment.js'

interface User {
  id: string
  email: string
  roles: string[]
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: User
  }
  
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

async function authPlugin(fastify: FastifyInstance) {
  // Register JWT support with secure configuration
  await fastify.register(jwt as any, {
    secret: config.security.jwt.secret,
    sign: {
      issuer: config.security.jwt.issuer,
      audience: config.security.jwt.audience,
      expiresIn: config.security.jwt.accessTokenTtl,
    },
    verify: {
      issuer: config.security.jwt.issuer,
      audience: config.security.jwt.audience,
    },
  })

  // Simple authentication function
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
      // Basic type assertion for now
      const payload = request.user as any
      request.user = {
        id: payload.id || payload.sub,
        email: payload.email,
        roles: payload.roles || ['user'],
      }
    } catch (error) {
      reply.code(401).send({
        type: 'https://api.nyt-news-explorer.com/problems/invalid-token',
        title: 'Invalid Token',
        status: 401,
        detail: 'Authentication required',
        instance: request.url,
      })
    }
  }

  fastify.decorate('authenticate', authenticate)
}

const plugin = fp(authPlugin, {
  name: 'auth-simple',
  fastify: '4.x',
})

export default plugin