import { GenericContainer, StartedTestContainer } from 'testcontainers'
import { LocalStackContainer } from '@testcontainers/localstack'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { RedisContainer } from '@testcontainers/redis'

/**
 * Global setup for integration tests
 * Starts all required containers before running tests
 */

// Global container references
let localStackContainer: StartedTestContainer
let postgresContainer: StartedTestContainer  
let redisContainer: StartedTestContainer

export default async function globalSetup() {
  console.log('🐳 Starting test containers...')

  try {
    // Start LocalStack for AWS services
    console.log('Starting LocalStack container...')
    localStackContainer = await new LocalStackContainer('localstack/localstack:3.0')
      .withServices('s3', 'sqs', 'sns', 'dynamodb', 'lambda', 'apigateway')
      .withEnvironment({
        SERVICES: 's3,sqs,sns,dynamodb,lambda,apigateway',
        DEBUG: '1',
        LS_LOG: 'trace',
        PERSISTENCE: '1'
      })
      .withExposedPorts(4566)
      .withReuse()
      .start()

    console.log(`✅ LocalStack started on port ${localStackContainer.getMappedPort(4566)}`)
    
    // Start PostgreSQL for database testing
    console.log('Starting PostgreSQL container...')
    postgresContainer = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('testdb')
      .withUsername('testuser') 
      .withPassword('testpass')
      .withReuse()
      .start()

    console.log(`✅ PostgreSQL started on port ${postgresContainer.getMappedPort(5432)}`)

    // Start Redis for caching tests
    console.log('Starting Redis container...')
    redisContainer = await new RedisContainer('redis:7-alpine')
      .withReuse()
      .start()

    console.log(`✅ Redis started on port ${redisContainer.getMappedPort(6379)}`)

    // Set environment variables for tests
    process.env.TEST_LOCALSTACK_ENDPOINT = `http://localhost:${localStackContainer.getMappedPort(4566)}`
    process.env.TEST_POSTGRES_HOST = 'localhost'
    process.env.TEST_POSTGRES_PORT = postgresContainer.getMappedPort(5432).toString()
    process.env.TEST_POSTGRES_DATABASE = 'testdb'
    process.env.TEST_POSTGRES_USERNAME = 'testuser'
    process.env.TEST_POSTGRES_PASSWORD = 'testpass'
    process.env.TEST_REDIS_HOST = 'localhost'
    process.env.TEST_REDIS_PORT = redisContainer.getMappedPort(6379).toString()

    console.log('✅ All test containers started successfully!')
    
    // Give containers a moment to fully initialize
    await new Promise(resolve => setTimeout(resolve, 2000))

  } catch (error) {
    console.error('❌ Failed to start test containers:', error)
    throw error
  }
}

// Cleanup function (called by global teardown)
export async function stopContainers() {
  console.log('🧹 Stopping test containers...')

  try {
    if (redisContainer) {
      await redisContainer.stop()
      console.log('✅ Redis container stopped')
    }

    if (postgresContainer) {
      await postgresContainer.stop()  
      console.log('✅ PostgreSQL container stopped')
    }

    if (localStackContainer) {
      await localStackContainer.stop()
      console.log('✅ LocalStack container stopped')
    }

    console.log('✅ All test containers stopped successfully!')
  } catch (error) {
    console.error('❌ Error stopping test containers:', error)
  }
}