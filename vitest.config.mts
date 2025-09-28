import path from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    preserveSymlinks: false,
    alias: {
      '@socketregistry/scripts': path.resolve(__dirname, './scripts'),
      '@socketsecurity/registry': path.resolve(__dirname, './registry'),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['test/**/*.test.{js,ts,mjs,mts,cjs,cts}'],
    reporters: ['default'],
    testTimeout: 60000,
    hookTimeout: 60000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/*.config.*',
        '**/[.]**',
        '**/*.d.ts',
        '**/virtual:*',
        '**/dist/**',
        '**/build/**',
        '**/node_modules/**',
        '**/pnpmfile.*',
        'coverage/**',
        'test/**',
        'scripts/**',
        'registry/external/**',
        'registry/src/external/**',
        'registry/scripts/**',
        'packages/**',
        'perf/**',
      ],
      include: [
        'registry/lib/**/*.{js,ts,mjs,cjs}',
        'registry/src/**/*.{js,ts,mjs,cjs}',
      ],
      all: true,
      thresholds: {
        lines: 90,
        functions: 85,
        branches: 90,
        statements: 90,
      },
    },
  },
})
