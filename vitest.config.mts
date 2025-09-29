import path from 'node:path'

import { defineConfig } from 'vitest/config'

import { createRequireTransformPlugin } from './vitest-plugins/require-transform.mjs'

// Check if coverage is enabled via CLI flags or environment.
const isCoverageEnabled =
  process.argv.includes('--coverage') || process.env['COVERAGE'] === 'true'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

export default defineConfig({
  plugins: [createRequireTransformPlugin(isCoverageEnabled)],
  resolve: {
    preserveSymlinks: false,
    // Prioritize TypeScript extensions during coverage
    extensions: isCoverageEnabled
      ? ['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs', '.json']
      : ['.mts', '.ts', '.mjs', '.js', '.json'],
    alias: [
      {
        // Used by test/npm/ package configs to import script utilities.
        // Transforms: @socketregistry/scripts/* → /abs/path/to/scripts/*
        find: '@socketregistry/scripts',
        replacement: path.resolve(__dirname, './scripts'),
      },
      // Only map dist/ to src/ when coverage is enabled.
      // Without coverage: tests run against compiled dist/ JavaScript.
      // With coverage: tests run against src/ TypeScript for instrumentation.
      ...(isCoverageEnabled
        ? [
            {
              // Used by scripts/ and some perf/ files to import registry code.
              // Transforms: @socketsecurity/registry/lib/* → /abs/path/to/registry/src/lib/*
              find: '@socketsecurity/registry',
              replacement: path.resolve(__dirname, './registry/src'),
            },
            {
              // Used by test files with relative imports.
              // Transforms: ../../registry/dist/* → /abs/path/to/registry/src/*
              find: /^\.\.\/\.\.\/registry\/dist\/(.*)$/,
              replacement: path.resolve(__dirname, './registry/src/$1'),
            },
          ]
        : [
            {
              // Used by scripts/ and some perf/ files to import registry code.
              // Transforms: @socketsecurity/registry/lib/* → /abs/path/to/registry/dist/lib/*
              find: '@socketsecurity/registry',
              replacement: path.resolve(__dirname, './registry/dist'),
            },
          ]),
    ],
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['test/**/*.test.{js,ts,mjs,mts,cjs,cts}'],
    reporters: ['default'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    server: {
      deps: {
        // Inline dependencies to enable source transformation for coverage.
        inline: isCoverageEnabled ? [/@socketsecurity\/registry/] : [],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        '**/*.config.*',
        '**/node_modules/**',
        '**/[.]**',
        '**/*.d.ts',
        '**/virtual:*',
        'coverage/**',
        'scripts/**',
        'test/**',
        'packages/**',
        'perf/**',
        'registry/scripts/**',
        'registry/dist/external/**',
        'registry/dist/types.js',
        'registry/src/external/**',
        'registry/src/types.ts',
      ],
      include: isCoverageEnabled
        ? ['registry/src/**/*.{ts,mts,cts}']
        : ['registry/dist/**/*.{js,mjs,cjs}'],
      all: true,
      thresholds: {
        lines: 61.1,
        functions: 53.82,
        branches: 76.1,
        statements: 61.1,
      },
    },
  },
})
