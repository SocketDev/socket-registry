import path from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['test/**/*.test.{js,ts,mjs,cjs}'],
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
      },
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      'test/packages.test.ts',
      'test/npm/**/*.test.{js,ts}',
    ],
    reporters: ['default'],
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
      all: true,
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
