import path from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['test/**/*.test.{js,ts,mjs,cjs}'],
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
      ],
      all: true,
      thresholds: {
        lines: 99,
        functions: 99,
        branches: 99,
        statements: 99,
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
