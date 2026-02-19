/**
 * Test Setup File
 *
 * Runs before all tests. Sets up global test environment.
 */

import { beforeAll, afterAll } from 'vitest';

// Global test configuration
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/livescore_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.ARCJET_MODE = 'DRY_RUN';
process.env.ARCJET_KEY = '';

// Global beforeAll hook
beforeAll(async () => {
  console.log('\n🧪 Starting test suite...\n');
});

// Global afterAll hook
afterAll(async () => {
  console.log('\n✅ Test suite complete\n');
});
