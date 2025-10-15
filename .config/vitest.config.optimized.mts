import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

import { createImportTransformPlugin } from './vitest-plugins/import-transform.mts'
import { createRequireTransformPlugin } from './vitest-plugins/require-transform.mts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

const isCoverageEnabled =
  process.env.COVERAGE === 'true' ||
  process.env.npm_lifecycle_event?.includes('coverage') ||
  process.argv.some(arg => arg.includes('coverage'))

export default defineConfig({
  cacheDir: 'node_modules/.vitest',
  plugins: [
    createImportTransformPlugin(isCoverageEnabled, __dirname),
    createRequireTransformPlugin(),
  ],
  resolve: {
    preserveSymlinks: false,
    extensions: isCoverageEnabled
      ? ['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs', '.json']
      : ['.mts', '.ts', '.mjs', '.js', '.json'],
    alias: [
      {
        find: '@socketregistry/scripts',
        replacement: path.resolve(projectRoot, 'scripts'),
      },
      ...(isCoverageEnabled
        ? [
            {
              find: '@socketsecurity/registry',
              replacement: path.resolve(projectRoot, 'registry/src'),
            },
            {
              find: /^\.\.\/\.\.\/registry\/dist\/(.*)\.js$/,
              replacement: path.resolve(projectRoot, 'registry/src/$1.ts'),
            },
          ]
        : []),
    ],
  },
  test: {
    globalSetup: [path.resolve(__dirname, 'vitest-global-setup.mts')],
    globals: false,
    environment: 'node',
    include: ['test/**/*.test.{js,ts,mjs,mts,cjs,cts}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      ...(process.env.INCLUDE_NPM_TESTS ? [] : ['test/npm/**']),
    ],
    reporters: ['default'],

    // OPTIMIZATIONS for speed
    pool: 'threads', // Threads are faster than forks for most tests
    poolOptions: {
      threads: {
        // Use all available CPUs for maximum parallelization
        maxThreads: isCoverageEnabled ? 1 : undefined,
        minThreads: isCoverageEnabled ? 1 : 4,
        singleThread: isCoverageEnabled,
        // Reuse threads to avoid creation overhead
        isolate: false,
      },
    },

    // Reduce timeouts for faster failure detection
    testTimeout: 30_000, // Reduced from 60s
    hookTimeout: 30_000, // Reduced from 60s

    // Cache transformation results (moved to vite's cacheDir)

    // Optimize file watching
    fileParallelism: true,

    // Skip slow operations
    slowTestThreshold: 1000, // Warn about tests slower than 1s

    server: {
      deps: {
        inline: isCoverageEnabled ? [/@socketsecurity\/registry/] : [],
        // Optimize dependency handling
        optimizer: {
          enabled: !isCoverageEnabled,
        },
      },
    },

    coverage: {
      provider: 'v8',
      enabled: isCoverageEnabled,
      reportsDirectory: 'coverage',
      reporter: ['text', 'json-summary', 'lcov'], // Reduced reporters
      exclude: [
        '**/*.config.*',
        '**/node_modules/**',
        '**/[.]**',
        '**/*.d.ts',
        'coverage/**',
        'scripts/**',
        'test/**',
        'packages/**',
        'perf/**',
      ],
      include: isCoverageEnabled
        ? ['src/**/*.{ts,mts,cts}']
        : ['dist/**/*.{js,mjs,cjs}'],
      all: true,
      clean: true,
      skipFull: true, // Skip files with 100% coverage
      thresholds: {
        lines: 55,
        functions: 55,
        branches: 55,
        statements: 55,
      },
    },
  },
})
