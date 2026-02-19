import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Global test settings
    globals: true,
    environment: 'node',

    // Test file patterns
    include: ['test/**/*.{test,spec}.{js,ts}'],

    // Exclude patterns
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],

    // Coverage settings (optional - add @vitest/coverage-v8 for coverage)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'test/', '**/*.config.{js,ts}'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },

    // Test timeout
    testTimeout: 30000, // 30s for integration tests

    // Hook timeout
    hookTimeout: 30000,

    // Enable verbose output
    verbose: true,

    // Setup files
    setupFiles: ['./test/setup.js'],
  },

  // ESM support
  esbuild: {
    target: 'node20',
  },
});
