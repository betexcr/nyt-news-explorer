import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    name: 'integration',
    include: ['tests/integration/**/*.test.{ts,js}', 'src/**/*.integration.test.{ts,js}'],
    exclude: [
      'tests/unit/**/*',
      'tests/contract/**/*',
      'tests/e2e/**/*',
      'node_modules/**/*'
    ],
    environment: 'node',
    globals: true,
    testTimeout: 60000, // Longer timeout for container startup
    hookTimeout: 60000,
    teardownTimeout: 30000,
    isolate: false, // Allow sharing containers between tests
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true // Run integration tests sequentially to avoid port conflicts
      }
    },
    setupFiles: ['./tests/integration/setup.ts'],
    globalSetup: './tests/integration/global-setup.ts',
    globalTeardown: './tests/integration/global-teardown.ts'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})