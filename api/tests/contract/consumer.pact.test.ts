import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PactV4, MatchersV3, SpecificationVersion } from '@pact-foundation/pact'
import path from 'path'
import axios from 'axios'

/**
 * Consumer Contract Tests using Pact
 * These tests define the consumer's expectations of the API
 * The generated contract will be verified by the provider
 */

const { like, eachLike, atLeastLike, term, fromProviderState } = MatchersV3

describe('NYT News API Consumer Contract', () => {
  let pact: PactV4

  beforeAll(() => {
    // Initialize Pact for consumer-driven contract testing
    pact = new PactV4({
      consumer: 'nyt-news-frontend',
      provider: 'nyt-news-api',
      spec: SpecificationVersion.SPECIFICATION_VERSION_V4,
      logLevel: 'error',
      dir: path.resolve(process.cwd(), 'tests/contract/pacts')
    })
  })

  afterAll(async () => {
    // Write the contract file after all tests
    await pact.writeFile()
  })

  describe('Health Check Contract', () => {
    it('should return healthy status', async () => {
      // Define the expected interaction
      await pact
        .given('API is healthy')
        .uponReceiving('a request for health status')
        .withRequest({
          method: 'GET',
          path: '/health',
          headers: {
            'Accept': 'application/json'
          }
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: {
            status: 'healthy',
            timestamp: like('2025-08-27T05:53:02.896Z'),
            uptime: like(3.525016153),
            version: '1.0.0'
          }
        })

      // Execute the test
      await pact.executeTest(async (mockService) => {
        const response = await axios.get(`${mockService.url}/health`, {
          headers: { 'Accept': 'application/json' }
        })

        expect(response.status).toBe(200)
        expect(response.data).toMatchObject({
          status: 'healthy',
          version: '1.0.0'
        })
        expect(response.data.timestamp).toBeTruthy()
        expect(response.data.uptime).toBeGreaterThan(0)
      })
    })

    it('should return detailed health status for API endpoint', async () => {
      await pact
        .given('API is healthy with detailed info')
        .uponReceiving('a request for detailed health status')
        .withRequest({
          method: 'GET',
          path: '/api/v1/health'
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: {
            status: 'healthy',
            timestamp: like('2025-08-27T05:53:16.373Z'),
            version: '1.0.0',
            environment: like('development')
          }
        })

      await pact.executeTest(async (mockService) => {
        const response = await axios.get(`${mockService.url}/api/v1/health`)

        expect(response.status).toBe(200)
        expect(response.data).toMatchObject({
          status: 'healthy',
          version: '1.0.0',
          environment: expect.any(String)
        })
      })
    })
  })

  describe('Authentication Contract', () => {
    it('should authenticate user with valid credentials', async () => {
      await pact
        .given('user exists with valid credentials')
        .uponReceiving('a login request with valid credentials')
        .withRequest({
          method: 'POST',
          path: '/api/v1/auth/login',
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            email: 'test@example.com',
            password: 'password'
          }
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: {
            accessToken: term({
              generate: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGVzIjpbInVzZXIiXSwiaWF0IjoxNzU2Mjc0MDA0LCJleHAiOjE3NTYyNzQ5MDR9.i1lhV1PWoAPdMQwNK_mhV0_v20ggSbV0h_yZImIZnwg',
              matcher: '^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$'
            }),
            user: {
              id: like('123'),
              email: 'test@example.com',
              roles: eachLike('user', { min: 1 })
            }
          }
        })

      await pact.executeTest(async (mockService) => {
        const response = await axios.post(`${mockService.url}/api/v1/auth/login`, {
          email: 'test@example.com',
          password: 'password'
        }, {
          headers: { 'Content-Type': 'application/json' }
        })

        expect(response.status).toBe(200)
        expect(response.data.accessToken).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)
        expect(response.data.user).toMatchObject({
          id: expect.any(String),
          email: 'test@example.com',
          roles: expect.arrayContaining(['user'])
        })
      })
    })

    it('should reject invalid credentials', async () => {
      await pact
        .given('user does not exist or password is wrong')
        .uponReceiving('a login request with invalid credentials')
        .withRequest({
          method: 'POST',
          path: '/api/v1/auth/login',
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            email: 'invalid@example.com',
            password: 'wrongpassword'
          }
        })
        .willRespondWith({
          status: 401,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: {
            error: like('Invalid credentials')
          }
        })

      await pact.executeTest(async (mockService) => {
        try {
          await axios.post(`${mockService.url}/api/v1/auth/login`, {
            email: 'invalid@example.com',
            password: 'wrongpassword'
          })
          throw new Error('Should have thrown an error')
        } catch (error: any) {
          expect(error.response.status).toBe(401)
          expect(error.response.data).toHaveProperty('error')
        }
      })
    })
  })

  describe('Protected Resources Contract', () => {
    it('should access protected resource with valid token', async () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGVzIjpbInVzZXIiXSwiaWF0IjoxNzU2Mjc0MDA0LCJleHAiOjE3NTYyNzQ5MDR9.i1lhV1PWoAPdMQwNK_mhV0_v20ggSbV0h_yZImIZnwg'

      await pact
        .given('user is authenticated with valid token')
        .uponReceiving('a request to protected resource with valid token')
        .withRequest({
          method: 'GET',
          path: '/api/v1/protected',
          headers: {
            'Authorization': `Bearer ${validToken}`
          }
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: {
            message: 'This is a protected endpoint',
            user: {
              id: like('123'),
              email: like('test@example.com'),
              roles: eachLike('user', { min: 1 })
            },
            timestamp: like('2025-08-27T05:53:31.366Z')
          }
        })

      await pact.executeTest(async (mockService) => {
        const response = await axios.get(`${mockService.url}/api/v1/protected`, {
          headers: { 'Authorization': `Bearer ${validToken}` }
        })

        expect(response.status).toBe(200)
        expect(response.data).toMatchObject({
          message: 'This is a protected endpoint',
          user: {
            id: expect.any(String),
            email: expect.any(String),
            roles: expect.any(Array)
          }
        })
        expect(response.data.timestamp).toBeTruthy()
      })
    })

    it('should reject request without authentication token', async () => {
      await pact
        .given('user is not authenticated')
        .uponReceiving('a request to protected resource without token')
        .withRequest({
          method: 'GET',
          path: '/api/v1/protected'
        })
        .willRespondWith({
          status: 401,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: {
            type: 'https://api.nyt-news-explorer.com/problems/invalid-token',
            title: 'Invalid Token',
            status: 401,
            detail: 'Authentication required',
            instance: '/api/v1/protected'
          }
        })

      await pact.executeTest(async (mockService) => {
        try {
          await axios.get(`${mockService.url}/api/v1/protected`)
          throw new Error('Should have thrown an error')
        } catch (error: any) {
          expect(error.response.status).toBe(401)
          expect(error.response.data).toMatchObject({
            type: 'https://api.nyt-news-explorer.com/problems/invalid-token',
            title: 'Invalid Token',
            status: 401,
            detail: 'Authentication required'
          })
        }
      })
    })
  })

  describe('Articles Search Contract', () => {
    it('should search articles with query parameter', async () => {
      await pact
        .given('articles exist for search query')
        .uponReceiving('a search request with query parameter')
        .withRequest({
          method: 'GET',
          path: '/api/v1/articles/search',
          query: 'q=technology'
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: {
            status: 'OK',
            response: {
              docs: atLeastLike({
                _id: like('test-1'),
                web_url: like('https://www.nytimes.com/test-1'),
                headline: {
                  main: like('Test article about technology')
                },
                abstract: like('This is a test article about technology'),
                pub_date: like('2025-08-27T05:53:41.613Z')
              }, 1),
              meta: {
                hits: like(1),
                offset: like(0)
              }
            }
          }
        })

      await pact.executeTest(async (mockService) => {
        const response = await axios.get(`${mockService.url}/api/v1/articles/search?q=technology`)

        expect(response.status).toBe(200)
        expect(response.data).toMatchObject({
          status: 'OK',
          response: {
            docs: expect.any(Array),
            meta: {
              hits: expect.any(Number),
              offset: expect.any(Number)
            }
          }
        })

        expect(response.data.response.docs.length).toBeGreaterThan(0)
        
        const article = response.data.response.docs[0]
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
    })

    it('should handle search without query parameter', async () => {
      await pact
        .given('default articles exist')
        .uponReceiving('a search request without query parameter')
        .withRequest({
          method: 'GET',
          path: '/api/v1/articles/search'
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: {
            status: 'OK',
            response: {
              docs: atLeastLike({
                _id: like('test-1'),
                web_url: like('https://www.nytimes.com/test-1'),
                headline: {
                  main: like('Test article about technology')
                },
                abstract: like('This is a test article about technology'),
                pub_date: like('2025-08-27T05:53:41.613Z')
              }, 1),
              meta: {
                hits: like(1),
                offset: like(0)
              }
            }
          }
        })

      await pact.executeTest(async (mockService) => {
        const response = await axios.get(`${mockService.url}/api/v1/articles/search`)

        expect(response.status).toBe(200)
        expect(response.data.status).toBe('OK')
        expect(response.data.response.docs).toBeInstanceOf(Array)
      })
    })
  })

  describe('Error Handling Contract', () => {
    it('should return 404 for non-existent endpoints', async () => {
      await pact
        .given('endpoint does not exist')
        .uponReceiving('a request to non-existent endpoint')
        .withRequest({
          method: 'GET',
          path: '/api/v1/nonexistent'
        })
        .willRespondWith({
          status: 404,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: {
            statusCode: 404,
            error: like('Not Found'),
            message: like('Route GET:/api/v1/nonexistent not found')
          }
        })

      await pact.executeTest(async (mockService) => {
        try {
          await axios.get(`${mockService.url}/api/v1/nonexistent`)
          throw new Error('Should have thrown an error')
        } catch (error: any) {
          expect(error.response.status).toBe(404)
          expect(error.response.data).toMatchObject({
            statusCode: 404,
            error: expect.any(String),
            message: expect.any(String)
          })
        }
      })
    })
  })

  describe('CORS Contract', () => {
    it('should handle CORS preflight requests', async () => {
      await pact
        .given('CORS is enabled')
        .uponReceiving('a CORS preflight request')
        .withRequest({
          method: 'OPTIONS',
          path: '/api/v1/articles/search',
          headers: {
            'Origin': 'https://frontend.example.com',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Authorization, Content-Type'
          }
        })
        .willRespondWith({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': like('*'),
            'Access-Control-Allow-Methods': like('GET,HEAD,PUT,PATCH,POST,DELETE'),
            'Access-Control-Allow-Headers': like('Authorization, Content-Type')
          }
        })

      await pact.executeTest(async (mockService) => {
        const response = await axios.options(`${mockService.url}/api/v1/articles/search`, {
          headers: {
            'Origin': 'https://frontend.example.com',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Authorization, Content-Type'
          }
        })

        expect(response.status).toBe(204)
        expect(response.headers['access-control-allow-origin']).toBeTruthy()
        expect(response.headers['access-control-allow-methods']).toBeTruthy()
      })
    })
  })
})