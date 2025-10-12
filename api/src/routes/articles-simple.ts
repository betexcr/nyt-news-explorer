import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createHash } from 'crypto'
import { config } from '@/config/environment.js'

const topStoriesParamsSchema = z.object({
  section: z.enum(['home', 'arts', 'automobiles', 'books', 'business', 'fashion', 'food', 'health', 'insider', 'magazine', 'movies', 'nyregion', 'obituaries', 'opinion', 'politics', 'realestate', 'science', 'sports', 'sundayreview', 'technology', 'theater', 't-magazine', 'travel', 'upshot', 'us', 'world']).default('home'),
})

const mostPopularParamsSchema = z.object({
  period: z.enum(['1', '7', '30']).default('7'),
})

export async function articlesRoutes(fastify: FastifyInstance) {
  // Top Stories endpoint
  fastify.get('/top-stories/:section', async (request, reply) => {
    try {
      const params = topStoriesParamsSchema.parse(request.params)
      
      const cacheKey = `top-stories:${params.section}`
      
      const cached = await fastify.cache.get(cacheKey)
      if (cached) {
        const etag = `"${createHash('md5').update(JSON.stringify(cached)).digest('hex')}"`
        
        if (request.headers['if-none-match'] === etag) {
          return reply.code(304).header('etag', etag).send()
        }
        
        return reply
          .header('etag', etag)
          .header('x-cache', 'HIT')
          .send(cached)
      }
      
      const url = `https://api.nytimes.com/svc/topstories/v2/${params.section}.json?api-key=${config.externalApis.nytApiKey}`
      
      const data = await fastify.circuitBreaker?.execute(
        'external',
        async () => {
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'NYT-News-Explorer-API/1.0',
              'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(5000),
          })
          
          if (!response.ok) {
            throw new Error(`NYT API error: ${response.status}`)
          }
          
          return response.json()
        }
      ) || (async () => {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'NYT-News-Explorer-API/1.0',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        })
        
        if (!response.ok) {
          throw new Error(`NYT API error: ${response.status}`)
        }
        
        return response.json()
      })()
      
      // Cache for 15 minutes (top stories change frequently)
      await fastify.cache.set(cacheKey, data, 900)
      
      const etag = `"${createHash('md5').update(JSON.stringify(data)).digest('hex')}"`
      
      reply
        .header('etag', etag)
        .header('cache-control', 'public, max-age=900, stale-while-revalidate=1800')
        .header('x-cache', 'MISS')
        .send(data)
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          type: 'https://api.nyt-news-explorer.com/problems/invalid-section',
          title: 'Invalid Section',
          status: 400,
          detail: 'The specified section is not valid',
          instance: request.url,
          errors: error.errors,
          correlationId: request.headers['x-correlation-id'],
        })
      }
      
      request.log.error({ error, params: request.params }, 'Top stories fetch failed')
      
      reply.code(503).send({
        type: 'https://api.nyt-news-explorer.com/problems/top-stories-unavailable',
        title: 'Top Stories Service Unavailable',
        status: 503,
        detail: 'The top stories service is currently unavailable',
        instance: request.url,
        correlationId: request.headers['x-correlation-id'],
      })
    }
  })

  // Most Popular endpoint
  fastify.get('/most-popular/:period', async (request, reply) => {
    try {
      const params = mostPopularParamsSchema.parse(request.params)
      
      const cacheKey = `most-popular:${params.period}`
      
      const cached = await fastify.cache.get(cacheKey)
      if (cached) {
        const etag = `"${createHash('md5').update(JSON.stringify(cached)).digest('hex')}"`
        
        if (request.headers['if-none-match'] === etag) {
          return reply.code(304).header('etag', etag).send()
        }
        
        return reply
          .header('etag', etag)
          .header('x-cache', 'HIT')
          .send(cached)
      }
      
      const url = `https://api.nytimes.com/svc/mostpopular/v2/viewed/${params.period}.json?api-key=${config.externalApis.nytApiKey}`
      
      const data = await fastify.circuitBreaker?.execute(
        'external',
        async () => {
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'NYT-News-Explorer-API/1.0',
              'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(5000),
          })
          
          if (!response.ok) {
            throw new Error(`NYT API error: ${response.status}`)
          }
          
          return response.json()
        }
      ) || (async () => {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'NYT-News-Explorer-API/1.0',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        })
        
        if (!response.ok) {
          throw new Error(`NYT API error: ${response.status}`)
        }
        
        return response.json()
      })()
      
      // Cache for 15 minutes (most popular changes frequently)
      await fastify.cache.set(cacheKey, data, 900)
      
      const etag = `"${createHash('md5').update(JSON.stringify(data)).digest('hex')}"`
      
      reply
        .header('etag', etag)
        .header('cache-control', 'public, max-age=900, stale-while-revalidate=1800')
        .header('x-cache', 'MISS')
        .send(data)
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          type: 'https://api.nyt-news-explorer.com/problems/invalid-period',
          title: 'Invalid Period',
          status: 400,
          detail: 'The specified period is not valid',
          instance: request.url,
          errors: error.errors,
          correlationId: request.headers['x-correlation-id'],
        })
      }
      
      request.log.error({ error, params: request.params }, 'Most popular fetch failed')
      
      reply.code(503).send({
        type: 'https://api.nyt-news-explorer.com/problems/most-popular-unavailable',
        title: 'Most Popular Service Unavailable',
        status: 503,
        detail: 'The most popular service is currently unavailable',
        instance: request.url,
        correlationId: request.headers['x-correlation-id'],
      })
    }
  })
}
