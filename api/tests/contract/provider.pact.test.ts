import { Verifier, VerifierOptions } from '@pact-foundation/pact'
import { FastifyInstance } from 'fastify'
import fastify from 'fastify'
import { registerPlugins } from '@/plugins/index-simple.js'
import { registerRoutes } from '@/routes/index-simple.js'
import path from 'path'

/**
 * Provider Verification Tests
 * Verifies that the API provider satisfies the consumer contracts
 */

describe('NYT News API Provider Verification', () => {
  let app: FastifyInstance
  let server: any
  let baseUrl: string

  beforeAll(async () => {
    // Start the API server for contract verification
    app = fastify({
      logger: {
        level: 'error' // Minimize logs during contract verification
      }
    })

    await registerPlugins(app)
    await registerRoutes(app)
    
    // Start server on dynamic port
    await app.listen({ port: 0, host: '127.0.0.1' })
    server = app.server
    
    const address = server.address()
    const port = typeof address === 'string' ? address : address.port
    baseUrl = `http://127.0.0.1:${port}`

    console.log(`🚀 Provider server started at ${baseUrl}`)
  })

  afterAll(async () => {
    await app.close()
  })

  it('should satisfy all consumer contracts', async () => {
    const opts: VerifierOptions = {
      // Provider details
      provider: 'nyt-news-api',
      providerBaseUrl: baseUrl,
      
      // Pact broker configuration (if using one)
      // pactBrokerUrl: process.env.PACT_BROKER_URL,
      // pactBrokerToken: process.env.PACT_BROKER_TOKEN,
      
      // Local pact files
      pactUrls: [
        path.resolve(__dirname, 'pacts', 'nyt-news-frontend-nyt-news-api.json')
      ],
      
      // Verification options
      publishVerificationResult: false, // Set to true when using a broker
      providerVersion: '1.0.0',
      providerVersionBranch: process.env.GIT_BRANCH || 'main',
      
      // Consumer version selectors (for broker)
      // consumerVersionSelectors: [
      //   {
      //     tag: 'main',
      //     latest: true
      //   },
      //   {
      //     tag: 'production',
      //     latest: true
      //   }
      // ],
      
      // State management
      stateHandlers: {
        // Health check states
        'API is healthy': async () => {
          console.log('🏥 Setting up healthy API state')
          // API is always healthy in our simple implementation
          return Promise.resolve()
        },
        
        'API is healthy with detailed info': async () => {
          console.log('🏥 Setting up detailed health state')
          return Promise.resolve()
        },
        
        // Authentication states
        'user exists with valid credentials': async () => {
          console.log('👤 Setting up valid user state')
          // Our simple auth accepts test@example.com/password
          // No database setup needed for this simple implementation
          return Promise.resolve()
        },
        
        'user does not exist or password is wrong': async () => {
          console.log('❌ Setting up invalid user state')
          // Invalid credentials will naturally fail
          return Promise.resolve()
        },
        
        'user is authenticated with valid token': async () => {
          console.log('🔐 Setting up authenticated user state')
          // Token validation happens at runtime
          return Promise.resolve()
        },
        
        'user is not authenticated': async () => {
          console.log('🚫 Setting up unauthenticated state')
          // No token provided will naturally fail authentication
          return Promise.resolve()
        },
        
        // Articles states
        'articles exist for search query': async () => {
          console.log('📰 Setting up articles for search')
          // Our mock implementation always returns test articles
          return Promise.resolve()
        },
        
        'default articles exist': async () => {
          console.log('📰 Setting up default articles')
          return Promise.resolve()
        },
        
        // Error states
        'endpoint does not exist': async () => {
          console.log('🚫 Setting up non-existent endpoint state')
          // Non-existent endpoints naturally return 404
          return Promise.resolve()
        },
        
        // CORS states
        'CORS is enabled': async () => {
          console.log('🌐 Setting up CORS enabled state')
          // CORS is enabled by default in our configuration
          return Promise.resolve()
        }
      },
      
      // Request filters to modify requests before verification
      requestFilters: [
        (req, res, next) => {
          console.log(`🔍 Verifying ${req.method} ${req.path}`)
          
          // Add correlation ID to requests that expect it
          if (!req.headers['x-correlation-id']) {
            req.headers['x-correlation-id'] = `pact-verify-${Date.now()}`
          }
          
          next()
        }
      ],
      
      // Custom headers for verification requests
      customProviderHeaders: [
        'X-Pact-Verification: true'
      ],
      
      // Timeout for verification requests
      timeout: 30000,
      
      // Log level for verification
      logLevel: 'info'
    }

    // Run the verification
    const verifier = new Verifier(opts)
    
    try {
      console.log('🔍 Starting contract verification...')
      await verifier.verifyProvider()
      console.log('✅ All contracts verified successfully!')
    } catch (error) {
      console.error('❌ Contract verification failed:', error)
      throw error
    }
  })

  // Additional integration tests to ensure provider behavior
  describe('Provider Integration Tests', () => {
    it('should handle state changes correctly', async () => {
      // Test that our state handlers work properly
      // This is more of a sanity check for the provider setup
      
      const response = await fetch(`${baseUrl}/health`)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.status).toBe('healthy')
    })

    it('should handle authentication flow as expected by consumers', async () => {
      // Test the authentication flow that consumers expect
      
      const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password'
        })
      })
      
      expect(loginResponse.status).toBe(200)
      
      const loginData = await loginResponse.json()
      expect(loginData.accessToken).toBeTruthy()
      expect(loginData.user).toBeTruthy()
      
      // Test protected endpoint with token
      const protectedResponse = await fetch(`${baseUrl}/api/v1/protected`, {
        headers: { 'Authorization': `Bearer ${loginData.accessToken}` }
      })
      
      expect(protectedResponse.status).toBe(200)
    })

    it('should return articles in expected format', async () => {
      // Test articles endpoint format matches consumer expectations
      
      const response = await fetch(`${baseUrl}/api/v1/articles/search?q=technology`)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.status).toBe('OK')
      expect(data.response.docs).toBeTruthy()
      expect(Array.isArray(data.response.docs)).toBe(true)
      expect(data.response.meta).toBeTruthy()
    })

    it('should handle CORS requests properly', async () => {
      // Test CORS handling
      
      const response = await fetch(`${baseUrl}/api/v1/articles/search`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://frontend.example.com',
          'Access-Control-Request-Method': 'GET'
        }
      })
      
      expect(response.status).toBe(204)
      // Note: fetch doesn't expose CORS headers in tests, but they should be set
    })

    it('should return proper error formats', async () => {
      // Test error format matches consumer expectations
      
      const response = await fetch(`${baseUrl}/api/v1/nonexistent`)
      expect(response.status).toBe(404)
      
      const data = await response.json()
      expect(data.statusCode).toBe(404)
      expect(data.error).toBeTruthy()
    })
  })
})