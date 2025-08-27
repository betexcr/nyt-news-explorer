import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fastify, { FastifyInstance } from 'fastify'
import { registerPlugins } from '@/plugins/index-simple.js'
import { registerRoutes } from '@/routes/index-simple.js'

/**
 * Unit tests for articles endpoints using Fastify inject
 */
describe('Articles API', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = fastify({
      logger: false
    })

    await registerPlugins(app)
    await registerRoutes(app)
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /api/v1/articles/search', () => {
    it('should return search results with default query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/articles/search'
      })

      expect(response.statusCode).toBe(200)
      
      const body = JSON.parse(response.body)
      expect(body).toMatchObject({
        status: 'OK',
        response: {
          docs: expect.any(Array),
          meta: {
            hits: expect.any(Number),
            offset: expect.any(Number)
          }
        }
      })
      
      // Should have at least one mock article
      expect(body.response.docs.length).toBeGreaterThan(0)
      
      // Check article structure
      const article = body.response.docs[0]
      expect(article).toMatchObject({
        _id: expect.any(String),
        web_url: expect.any(String),
        headline: {
          main: expect.any(String)
        },
        abstract: expect.any(String),
        pub_date: expect.any(String)
      })
    })

    it('should handle custom search query', async () => {
      const searchQuery = 'artificial intelligence'
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/articles/search?q=${encodeURIComponent(searchQuery)}`
      })

      expect(response.statusCode).toBe(200)
      
      const body = JSON.parse(response.body)
      const article = body.response.docs[0]
      expect(article.headline.main).toContain(searchQuery)
      expect(article.abstract).toContain(searchQuery)
    })

    it('should handle encoded query parameters', async () => {
      const searchQuery = 'machine learning & AI'
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/articles/search?q=${encodeURIComponent(searchQuery)}`
      })

      expect(response.statusCode).toBe(200)
    })

    it('should handle empty query parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/articles/search?q='
      })

      expect(response.statusCode).toBe(200)
    })

    it('should handle multiple query parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/articles/search?q=technology&page=1&sort=newest'
      })

      expect(response.statusCode).toBe(200)
    })

    it('should return proper content type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/articles/search'
      })

      expect(response.headers['content-type']).toMatch(/application\/json/)
    })

    it('should include correlation ID in response', async () => {
      const correlationId = 'test-articles-123'
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/articles/search',
        headers: {
          'x-correlation-id': correlationId
        }
      })

      expect(response.headers['x-correlation-id']).toBe(correlationId)
    })

    it('should handle special characters in search', async () => {
      const specialQuery = 'test@#$%^&*()'
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/articles/search?q=${encodeURIComponent(specialQuery)}`
      })

      expect(response.statusCode).toBe(200)
    })

    it('should validate response schema structure', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/articles/search?q=technology'
      })

      const body = JSON.parse(response.body)
      
      // Validate top-level structure
      expect(body).toHaveProperty('status')
      expect(body).toHaveProperty('response')
      expect(body.response).toHaveProperty('docs')
      expect(body.response).toHaveProperty('meta')
      
      // Validate meta structure
      expect(body.response.meta).toHaveProperty('hits')
      expect(body.response.meta).toHaveProperty('offset')
      
      // Validate docs array
      expect(Array.isArray(body.response.docs)).toBe(true)
      
      if (body.response.docs.length > 0) {
        const doc = body.response.docs[0]
        expect(doc).toHaveProperty('_id')
        expect(doc).toHaveProperty('web_url')
        expect(doc).toHaveProperty('headline')
        expect(doc).toHaveProperty('abstract')
        expect(doc).toHaveProperty('pub_date')
        
        // Validate headline structure
        expect(doc.headline).toHaveProperty('main')
        
        // Validate URL format
        expect(doc.web_url).toMatch(/^https?:\/\//)
        
        // Validate date format (ISO 8601)
        expect(doc.pub_date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid HTTP methods', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/articles/search'
      })

      expect(response.statusCode).toBe(404)
    })

    it('should handle malformed query parameters gracefully', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/articles/search?invalid[param=value'
      })

      // Should still return 200 as the malformed param is ignored
      expect(response.statusCode).toBe(200)
    })
  })

  describe('Performance Considerations', () => {
    it('should respond quickly for simple queries', async () => {
      const startTime = Date.now()
      
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/articles/search?q=test'
      })
      
      const responseTime = Date.now() - startTime
      
      expect(response.statusCode).toBe(200)
      expect(responseTime).toBeLessThan(100) // Should respond within 100ms
    })

    it('should handle concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        app.inject({
          method: 'GET',
          url: `/api/v1/articles/search?q=test${i}`
        })
      )

      const responses = await Promise.all(requests)
      
      responses.forEach(response => {
        expect(response.statusCode).toBe(200)
      })
    })
  })
})