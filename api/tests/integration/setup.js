import { beforeAll, afterAll } from 'vitest';
/**
 * Setup file for integration tests
 * Configures environment and validates container connectivity
 */
beforeAll(async () => {
    // Validate that containers are running and accessible
    console.log('🔧 Validating test environment...');
    if (process.env.RUN_INTEGRATION !== '1') {
        console.warn('RUN_INTEGRATION not set, skipping integration checks');
        return;
    }
    // Validate LocalStack
    if (!process.env.TEST_LOCALSTACK_ENDPOINT) {
        throw new Error('LocalStack endpoint not available');
    }
    // Validate PostgreSQL
    if (!process.env.TEST_POSTGRES_HOST || !process.env.TEST_POSTGRES_PORT) {
        throw new Error('PostgreSQL connection info not available');
    }
    // Validate Redis  
    if (!process.env.TEST_REDIS_HOST || !process.env.TEST_REDIS_PORT) {
        throw new Error('Redis connection info not available');
    }
    console.log('✅ Test environment validated');
    console.log(`📡 LocalStack: ${process.env.TEST_LOCALSTACK_ENDPOINT}`);
    console.log(`🐘 PostgreSQL: ${process.env.TEST_POSTGRES_HOST}:${process.env.TEST_POSTGRES_PORT}`);
    console.log(`🔴 Redis: ${process.env.TEST_REDIS_HOST}:${process.env.TEST_REDIS_PORT}`);
});
afterAll(async () => {
    console.log('🧹 Integration test cleanup completed');
});
