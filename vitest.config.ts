import path from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['test/**/*.test.{js,ts,mjs,cjs}'],
    reporters: ['default'],
    // Improve memory usage by running tests sequentially in CI.
    pool: process.env['CI'] ? 'forks' : 'threads',
    poolOptions: {
      forks: {
        singleFork: true,
        maxForks: 1,
        // Isolate tests to prevent memory leaks between test files.
        isolate: true,
      },
      threads: {
        singleThread: false,
        // Limit thread concurrency to prevent RegExp compiler exhaustion.
        maxThreads: process.env['CI'] ? 1 : 2,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/*.config.*',
        '**/dist/**',
        '**/build/**',
        '**/node_modules/**',
        '**/[.]**',
        '**/*.d.ts',
        '**/pnpmfile.*',
        '**/virtual:*',
        'coverage/**',
        'test/**',
        'scripts/**',
        'registry/external/**',
        'registry/src/external/**',
        'registry/scripts/**',
        'packages/**',
        'perf/**',
      ],
      all: false,
      thresholds: {
        lines: 90,
        functions: 85,
        branches: 90,
        statements: 90,
      },
    },
    testTimeout: 60000,
    hookTimeout: 60000,
  },
  resolve: {
    alias: {
      '@socketregistry/scripts': path.resolve(__dirname, './scripts'),
      '@socketsecurity/registry': path.resolve(__dirname, './registry'),
    },
  },
})
