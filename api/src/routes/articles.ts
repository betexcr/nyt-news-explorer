import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createHash } from 'crypto'
import { config } from '@/config/environment.js'

/**
 * Articles routes with comprehensive caching, search, and performance optimizations
 * - NYT API integration with circuit breaker
 * - ETag-based caching
 * - Search with debouncing on client side
 * - Idempotency support
 * - Rate limiting applied via plugin
 */

// Search parameters schema
const searchParamsSchema = z.object({
  q: z.string().min(1, 'Query is required').max(500, 'Query too long'),
  page: z.coerce.number().int().min(0).max(200).default(0),
  sort: z.enum(['newest', 'oldest', 'relevance']).default('relevance'),
  begin_date: z.string().regex(/^\d{8}$/).optional(),
  end_date: z.string().regex(/^\d{8}$/).optional(),
  fq: z.string().optional(), // Filtered query
  facet_field: z.string().optional(),
  facet_filter: z.boolean().optional(),
})

const archiveParamsSchema = z.object({
  year: z.coerce.number().int().min(1851).max(new Date().getFullYear()),
  month: z.coerce.number().int().min(1).max(12),
})

const topStoriesParamsSchema = z.object({
  section: z.enum(['home', 'arts', 'automobiles', 'books', 'business', 'fashion', 'food', 'health', 'insider', 'magazine', 'movies', 'nyregion', 'obituaries', 'opinion', 'politics', 'realestate', 'science', 'sports', 'sundayreview', 'technology', 'theater', 't-magazine', 'travel', 'upshot', 'us', 'world']).default('home'),
})

export async function articlesRoutes(fastify: FastifyInstance) {

  // Article search endpoint
  fastify.get('/search', {
    schema: {
      tags: ['Articles'],
      summary: 'Search Articles',
      description: 'Search New York Times articles with advanced filtering',
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Search query', minLength: 1, maxLength: 500 },
          page: { type: 'integer', description: 'Page number (0-based)', minimum: 0, maximum: 200, default: 0 },
          sort: { type: 'string', enum: ['newest', 'oldest', 'relevance'], default: 'relevance' },
          begin_date: { type: 'string', pattern: '^\\d{8}$', description: 'Begin date (YYYYMMDD)' },
          end_date: { type: 'string', pattern: '^\\d{8}$', description: 'End date (YYYYMMDD)' },
          fq: { type: 'string', description: 'Filtered query (e.g., section_name:"Sports")' },
        },
        required: ['q'],
      },
      headers: {
        type: 'object',
        properties: {
          'if-none-match': { type: 'string', description: 'ETag for conditional request' },
          'x-idempotency-key': { type: 'string', description: 'Idempotency key for safe retries' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            copyright: { type: 'string' },
            response: {
              type: 'object',
              properties: {
                docs: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      web_url: { type: 'string' },
                      snippet: { type: 'string' },
                      lead_paragraph: { type: 'string' },
                      abstract: { type: 'string' },
                      print_page: { type: 'string' },
                      blog: {}, // Complex object
                      source: { type: 'string' },
                      multimedia: { type: 'array' },
                      headline: {
                        type: 'object',
                        properties: {
                          main: { type: 'string' },
                          kicker: { type: 'string' },
                          content_kicker: { type: 'string' },
                          print_headline: { type: 'string' },
                          name: { type: 'string' },
                          seo: { type: 'string' },
                          sub: { type: 'string' },
                        },
                      },
                      keywords: { type: 'array' },
                      pub_date: { type: 'string', format: 'date-time' },
                      document_type: { type: 'string' },
                      news_desk: { type: 'string' },
                      section_name: { type: 'string' },
                      subsection_name: { type: 'string' },
                      byline: {
                        type: 'object',
                        properties: {
                          original: { type: 'string' },
                          person: { type: 'array' },
                          organization: { type: 'string' },
                        },
                      },
                      type_of_material: { type: 'string' },
                    },
                  },
                },
                meta: {
                  type: 'object',
                  properties: {
                    hits: { type: 'integer' },
                    offset: { type: 'integer' },
                    time: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
        304: { description: 'Not Modified (cached response)' },
        400: { $ref: '#/components/responses/400' },
        429: { $ref: '#/components/responses/429' },
        503: { $ref: '#/components/responses/503' },
      },
    },
  }, async (request, reply) => {
    try {
      const params = searchParamsSchema.parse(request.query)
      
      // Create cache key based on search parameters
      const cacheKey = `search:${createHash('md5').update(JSON.stringify(params)).digest('hex')}`
      
      // Check for cached response first
      const cached = await fastify.cache.get(cacheKey)
      if (cached) {
        const etag = `"${createHash('md5').update(JSON.stringify(cached)).digest('hex')}"`
        
        // Check If-None-Match header
        if (request.headers['if-none-match'] === etag) {
          return reply.code(304).header('etag', etag).send()
        }
        
        return reply
          .header('etag', etag)
          .header('x-cache', 'HIT')
          .send(cached)
      }
      
      // Build NYT API URL
      const url = new URL('https://api.nytimes.com/svc/search/v2/articlesearch.json')
      url.searchParams.set('api-key', config.externalApis.nytApiKey)
      url.searchParams.set('q', params.q)
      url.searchParams.set('page', params.page.toString())
      url.searchParams.set('sort', params.sort)
      
      if (params.begin_date) url.searchParams.set('begin_date', params.begin_date)
      if (params.end_date) url.searchParams.set('end_date', params.end_date)
      if (params.fq) url.searchParams.set('fq', params.fq)
      
      // Call NYT API with circuit breaker protection
      const data = await fastify.circuitBreaker.execute(
        'external',
        async () => {
          const response = await fetch(url.toString(), {
            headers: {
              'User-Agent': 'NYT-News-Explorer-API/1.0',
              'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(5000), // 5 second timeout
          })
          
          if (!response.ok) {
            throw new Error(`NYT API error: ${response.status}`)
          }
          
          return response.json()
        },
        // Fallback for when circuit is open
        async () => {
          return {
            status: 'OK',
            copyright: 'Copyright (c) 2023 The New York Times Company. All Rights Reserved.',
            response: {
              docs: [],
              meta: { hits: 0, offset: 0, time: 0 },
            },
            fallback: true,
            message: 'Search service temporarily unavailable',
          }
        }
      )
      
      // Cache the response (5 minutes for search results)
      await fastify.cache.set(cacheKey, data, 300)
      
      // Generate ETag
      const etag = `"${createHash('md5').update(JSON.stringify(data)).digest('hex')}"`
      
      reply
        .header('etag', etag)
        .header('cache-control', 'public, max-age=300, stale-while-revalidate=600')
        .header('x-cache', 'MISS')
        .send(data)
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          type: 'https://api.nyt-news-explorer.com/problems/invalid-search-params',
          title: 'Invalid Search Parameters',
          status: 400,
          detail: 'One or more search parameters are invalid',
          instance: request.url,
          errors: error.errors,
          correlationId: request.headers['x-correlation-id'],
        })
      }
      
      request.log.error({ error, params: request.query }, 'Article search failed')
      
      reply.code(503).send({
        type: 'https://api.nyt-news-explorer.com/problems/search-unavailable',
        title: 'Search Service Unavailable',
        status: 503,
        detail: 'The search service is currently unavailable',
        instance: request.url,
        retryAfter: 30,
        correlationId: request.headers['x-correlation-id'],
      })
    }
  })

  // Archive endpoint
  fastify.get('/archive/:year/:month', {
    schema: {
      tags: ['Articles'],
      summary: 'Get Archive',
      description: 'Get articles from NYT archive for specific year/month',
      params: {
        type: 'object',
        properties: {
          year: { type: 'integer', minimum: 1851, maximum: new Date().getFullYear() },
          month: { type: 'integer', minimum: 1, maximum: 12 },
        },
        required: ['year', 'month'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            copyright: { type: 'string' },
            response: {
              type: 'object',
              properties: {
                docs: { type: 'array' },
                meta: { type: 'object' },
              },
            },
          },
        },
        400: { $ref: '#/components/responses/400' },
        429: { $ref: '#/components/responses/429' },
      },
    },
  }, async (request, reply) => {
    try {
      const params = archiveParamsSchema.parse(request.params)
      
      const cacheKey = `archive:${params.year}:${params.month}`
      
      // Archive data changes rarely, so longer cache
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
      
      const url = `https://api.nytimes.com/svc/archive/v1/${params.year}/${params.month}.json?api-key=${config.externalApis.nytApiKey}`
      
      const data = await fastify.circuitBreaker.execute(
        'external',
        async () => {
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'NYT-News-Explorer-API/1.0',
              'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(10000), // 10 second timeout for archive
          })
          
          if (!response.ok) {
            throw new Error(`NYT API error: ${response.status}`)
          }
          
          return response.json()
        }
      )
      
      // Cache archive data for longer (1 hour)
      await fastify.cache.set(cacheKey, data, 3600)
      
      const etag = `"${createHash('md5').update(JSON.stringify(data)).digest('hex')}"`
      
      reply
        .header('etag', etag)
        .header('cache-control', 'public, max-age=3600, stale-while-revalidate=7200')
        .header('x-cache', 'MISS')
        .send(data)
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          type: 'https://api.nyt-news-explorer.com/problems/invalid-archive-params',
          title: 'Invalid Archive Parameters',
          status: 400,
          detail: 'Year and month must be valid',
          instance: request.url,
          errors: error.errors,
          correlationId: request.headers['x-correlation-id'],
        })
      }
      
      request.log.error({ error, params: request.params }, 'Archive fetch failed')
      
      reply.code(503).send({
        type: 'https://api.nyt-news-explorer.com/problems/archive-unavailable',
        title: 'Archive Service Unavailable',
        status: 503,
        detail: 'The archive service is currently unavailable',
        instance: request.url,
        correlationId: request.headers['x-correlation-id'],
      })
    }
  })

  // Archive-by-day random endpoint
  fastify.get('/archive/:year/:month/:day/random', {
    schema: {
      tags: ['Articles'],
      summary: 'Get one random article for a specific day',
      description: 'Fetches articles for a given YYYY-MM-DD and returns one random normalized article',
      params: {
        type: 'object',
        properties: {
          year: { type: 'integer', minimum: 1851, maximum: new Date().getFullYear() },
          month: { type: 'integer', minimum: 1, maximum: 12 },
          day: { type: 'integer', minimum: 1, maximum: 31 },
        },
        required: ['year', 'month', 'day'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            url: { type: 'string' },
            title: { type: 'string' },
            abstract: { type: 'string' },
            snippet: { type: 'string' },
            leadParagraph: { type: 'string' },
            source: { type: 'string' },
            publishedDate: { type: 'string' },
            author: { type: 'string' },
            section: { type: 'string' },
            subsection: { type: 'string' },
          },
        },
        204: { description: 'No content for that day' },
        400: { $ref: '#/components/responses/400' },
        429: { $ref: '#/components/responses/429' },
      },
    },
  }, async (request, reply) => {
    try {
      const { year, month, day } = request.params as any
      // Validate year/month with existing schema, and day range
      archiveParamsSchema.parse({ year, month })
      const d = Number(day)
      if (!Number.isInteger(d) || d < 1 || d > 31) {
        return reply.code(400).send({
          type: 'https://api.nyt-news-explorer.com/problems/invalid-archive-params',
          title: 'Invalid Archive Parameters',
          status: 400,
          detail: 'Day must be an integer between 1 and 31',
          instance: request.url,
          correlationId: request.headers['x-correlation-id'],
        })
      }

      const begin = `${year}${String(month).padStart(2, '0')}${String(d).padStart(2, '0')}`
      const url = new URL('https://api.nytimes.com/svc/search/v2/articlesearch.json')
      url.searchParams.set('begin_date', begin)
      url.searchParams.set('end_date', begin)
      url.searchParams.set('sort', 'newest')
      url.searchParams.set('page', '0')
      url.searchParams.set('api-key', config.externalApis.nytApiKey)

      const data = await fastify.circuitBreaker.execute('external', async () => {
        const response = await fetch(url.toString(), {
          headers: {
            'User-Agent': 'NYT-News-Explorer-API/1.0',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(8000),
        })
        if (!response.ok) {
          throw new Error(`NYT API error: ${response.status}`)
        }
        return response.json()
      })

      const docs = (data?.response?.docs || []) as any[]
      if (!docs.length) {
        return reply.code(204).send()
      }

      const pick = docs[Math.floor(Math.random() * docs.length)]
      const article = {
        id: pick._id,
        url: pick.web_url,
        title: pick.headline?.main || '',
        abstract: pick.abstract,
        snippet: pick.snippet,
        leadParagraph: pick.lead_paragraph,
        source: pick.source,
        publishedDate: pick.pub_date,
        author: pick.byline?.original,
        section: pick.section_name,
        subsection: pick.subsection_name,
      }

      // Short cache since this is randomized from a fixed set for a day
      reply
        .header('cache-control', 'public, max-age=120, stale-while-revalidate=300')
        .send(article)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          type: 'https://api.nyt-news-explorer.com/problems/invalid-archive-params',
          title: 'Invalid Archive Parameters',
          status: 400,
          detail: 'Year, month, or day are invalid',
          instance: request.url,
          errors: error.errors,
          correlationId: request.headers['x-correlation-id'],
        })
      }
      request.log.error({ error, params: request.params }, 'Archive-by-day random fetch failed')
      reply.code(503).send({
        type: 'https://api.nyt-news-explorer.com/problems/archive-unavailable',
        title: 'Archive Service Unavailable',
        status: 503,
        detail: 'The archive service is currently unavailable',
        instance: request.url,
        correlationId: request.headers['x-correlation-id'],
      })
    }
  })

  // Top Stories endpoint
  fastify.get('/top-stories/:section', {
    schema: {
      tags: ['Articles'],
      summary: 'Get Top Stories',
      description: 'Get top stories from NYT for specific section',
      params: {
        type: 'object',
        properties: {
          section: {
            type: 'string',
            enum: ['home', 'arts', 'automobiles', 'books', 'business', 'fashion', 'food', 'health', 'insider', 'magazine', 'movies', 'nyregion', 'obituaries', 'opinion', 'politics', 'realestate', 'science', 'sports', 'sundayreview', 'technology', 'theater', 't-magazine', 'travel', 'upshot', 'us', 'world'],
          },
        },
        required: ['section'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            copyright: { type: 'string' },
            section: { type: 'string' },
            last_updated: { type: 'string' },
            num_results: { type: 'integer' },
            results: { type: 'array' },
          },
        },
        400: { $ref: '#/components/responses/400' },
        429: { $ref: '#/components/responses/429' },
      },
    },
  }, async (request, reply) => {
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
      
      const data = await fastify.circuitBreaker.execute(
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
      )
      
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

  // Article detail endpoint (for individual articles)
  fastify.get('/:id', {
    schema: {
      tags: ['Articles'],
      summary: 'Get Article Details',
      description: 'Get details for a specific article',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Article ID or URL' },
        },
        required: ['id'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            url: { type: 'string' },
            title: { type: 'string' },
            abstract: { type: 'string' },
            content: { type: 'string' },
            publishedDate: { type: 'string' },
            author: { type: 'string' },
            section: { type: 'string' },
            cached: { type: 'boolean' },
          },
        },
        404: { $ref: '#/components/responses/404' },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      
      // For demonstration - in a real app, you'd extract article content
      // or have a separate content service
      const article = {
        id,
        url: `https://www.nytimes.com/article/${id}`,
        title: 'Sample Article Title',
        abstract: 'This is a sample article abstract...',
        content: 'Article content would be here...',
        publishedDate: new Date().toISOString(),
        author: 'Sample Author',
        section: 'Technology',
        cached: false,
      }
      
      reply.send(article)
      
    } catch (error) {
      reply.code(404).send({
        type: 'https://api.nyt-news-explorer.com/problems/article-not-found',
        title: 'Article Not Found',
        status: 404,
        detail: 'The requested article could not be found',
        instance: request.url,
        correlationId: request.headers['x-correlation-id'],
      })
    }
  })
}