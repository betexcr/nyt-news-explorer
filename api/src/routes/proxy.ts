import { FastifyInstance } from 'fastify'
import { createHash } from 'crypto'

/**
 * Image proxy route to handle external images
 * - Caches images in Redis
 * - Handles CORS and rate limiting issues
 * - Supports ETags for client-side caching
 */
export async function proxyRoutes(fastify: FastifyInstance) {
  
  // Image proxy endpoint
  fastify.get('/image', {
    schema: {
      tags: ['Proxy'],
      summary: 'Proxy External Images',
      description: 'Proxies external images with caching to avoid CORS and rate limit issues',
      querystring: {
        type: 'object',
        properties: {
          url: { 
            type: 'string', 
            description: 'URL of the image to proxy',
            pattern: '^https?://',
          },
        },
        required: ['url'],
      },
      response: {
        200: {
          description: 'Image content',
          type: 'string',
          format: 'binary',
        },
        400: { type: 'object', description: 'Bad Request' },
        404: { type: 'object', description: 'Image Not Found' },
        503: { type: 'object', description: 'Service Unavailable' },
      },
    },
  }, async (request, reply) => {
    try {
      const { url } = request.query as { url: string }
      
      // Validate URL
      if (!url || !url.match(/^https?:\/\//)) {
        return reply.code(400).send({
          type: 'https://api.nyt-news-explorer.com/problems/invalid-url',
          title: 'Invalid URL',
          status: 400,
          detail: 'The image URL must be a valid HTTP or HTTPS URL',
          instance: request.url,
        })
      }
      
      // Create cache key for the image
      const cacheKey = `image:${createHash('md5').update(url).digest('hex')}`
      
      // Check cache first
      const cached = await fastify.cache.get(cacheKey)
      if (cached) {
        const etag = `"${createHash('md5').update(cached.buffer).digest('hex')}"`
        
        // Check If-None-Match
        if (request.headers['if-none-match'] === etag) {
          return reply.code(304).header('etag', etag).send()
        }
        
        return reply
          .header('content-type', cached.contentType)
          .header('etag', etag)
          .header('cache-control', 'public, max-age=86400, immutable') // 24 hours
          .header('x-cache', 'HIT')
          .send(Buffer.from(cached.buffer, 'base64'))
      }
      
      // Fetch the image with circuit breaker
      const imageData = await fastify.circuitBreaker.execute(
        'external',
        async () => {
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'NYT-News-Explorer-API/1.0',
              'Accept': 'image/*',
              'Referer': 'https://www.nytimes.com/',
            },
            signal: AbortSignal.timeout(10000), // 10 second timeout
          })
          
          if (!response.ok) {
            if (response.status === 404) {
              throw new Error('IMAGE_NOT_FOUND')
            }
            throw new Error(`Image fetch failed: ${response.status}`)
          }
          
          const contentType = response.headers.get('content-type') || 'image/jpeg'
          const arrayBuffer = await response.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          
          return {
            buffer,
            contentType,
          }
        },
        // Fallback - return a placeholder
        async () => {
          // Return a 1x1 transparent GIF as fallback
          const transparentGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
          return {
            buffer: transparentGif,
            contentType: 'image/gif',
          }
        }
      )
      
      // Cache the image for 24 hours
      await fastify.cache.set(
        cacheKey, 
        {
          buffer: imageData.buffer.toString('base64'),
          contentType: imageData.contentType,
        }, 
        86400
      )
      
      // Generate ETag
      const etag = `"${createHash('md5').update(imageData.buffer).digest('hex')}"`
      
      reply
        .header('content-type', imageData.contentType)
        .header('etag', etag)
        .header('cache-control', 'public, max-age=86400, immutable') // 24 hours
        .header('x-cache', 'MISS')
        .send(imageData.buffer)
      
    } catch (error: any) {
      if (error.message === 'IMAGE_NOT_FOUND') {
        return reply.code(404).send({
          type: 'https://api.nyt-news-explorer.com/problems/image-not-found',
          title: 'Image Not Found',
          status: 404,
          detail: 'The requested image could not be found',
          instance: request.url,
        })
      }
      
      request.log.error({ error, url: (request.query as any).url }, 'Image proxy failed')
      
      reply.code(503).send({
        type: 'https://api.nyt-news-explorer.com/problems/proxy-unavailable',
        title: 'Proxy Service Unavailable',
        status: 503,
        detail: 'The image proxy service is currently unavailable',
        instance: request.url,
        retryAfter: 30,
      })
    }
  })
}

