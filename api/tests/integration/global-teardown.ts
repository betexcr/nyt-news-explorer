import { stopContainers } from './global-setup.js'

/**
 * Global teardown for integration tests
 * Stops all test containers after tests complete
 */
export default async function globalTeardown() {
  await stopContainers()
}