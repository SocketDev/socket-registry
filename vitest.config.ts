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
        'node_modules/**',
        'test/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        '**/build/**',
        '**/taze.config.*',
        '**/biome.json',
        '**/.biome*',
        '**/eslint.config.*',
        '**/.eslintrc.*',
        '**/oxlint.*',
        '**/.oxlintrc.*',
        '**/pnpmfile.*',
        '**/vitest.config.*',
        '**/.prettierrc.*',
        '**/prettier.config.*'
      ]
    },
    testTimeout: 60000,
    hookTimeout: 60000
  },
  resolve: {
    alias: {
      '@socketregistry/scripts': path.resolve(__dirname, './scripts'),
      '@socketsecurity/registry': path.resolve(__dirname, './registry')
    }
  }
})
