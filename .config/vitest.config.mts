import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

import { createImportTransformPlugin } from './vitest-plugins/import-transform.mts'
import { createRequireTransformPlugin } from './vitest-plugins/require-transform.mts'

// Check if coverage is enabled via CLI flags or environment.
const isCoverageEnabled =
  process.argv.includes('--coverage') || process.env['COVERAGE'] === 'true'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

export default defineConfig({
  plugins: [
    createImportTransformPlugin(isCoverageEnabled, __dirname),
    createRequireTransformPlugin(isCoverageEnabled),
  ],
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
        replacement: path.resolve(projectRoot, 'scripts'),
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
              replacement: path.resolve(projectRoot, 'registry/src'),
            },
            {
              // Used by test files with relative imports.
              // Transforms: ../../registry/dist/*.js → /abs/path/to/registry/src/*.ts
              find: /^\.\.\/\.\.\/registry\/dist\/(.*)\.js$/,
              replacement: path.resolve(projectRoot, 'registry/src/$1.ts'),
            },
          ]
        : [
            {
              // Used by scripts/ and some perf/ files to import registry code.
              // Transforms: @socketsecurity/registry/lib/* → /abs/path/to/registry/dist/lib/*
              find: '@socketsecurity/registry',
              replacement: path.resolve(projectRoot, 'registry/dist'),
            },
          ]),
    ],
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['test/**/*.test.{js,ts,mjs,mts,cjs,cts}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // Exclude test/npm unless INCLUDE_NPM_TESTS is set
      ...(process.env['INCLUDE_NPM_TESTS'] ? [] : ['test/npm/**']),
    ],
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
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
