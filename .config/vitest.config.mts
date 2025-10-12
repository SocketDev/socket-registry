import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

import { createImportTransformPlugin } from './vitest-plugins/import-transform.mts'
import { createRequireTransformPlugin } from './vitest-plugins/require-transform.mts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Check if coverage is enabled via CLI flags or environment.
// Note: process.argv doesn't include vitest CLI args at config load time,
// so we check environment variables and use a heuristic based on npm script.
const isCoverageEnabled =
  process.env['COVERAGE'] === 'true' ||
  process.env['npm_lifecycle_event']?.includes('coverage') ||
  process.argv.some(arg => arg.includes('coverage'))

const projectRoot = path.resolve(__dirname, '..')

export default defineConfig({
  plugins: [
    createImportTransformPlugin(isCoverageEnabled, __dirname),
    createRequireTransformPlugin(),
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
            // Map external dependencies to their dist versions during coverage.
            {
              find: /^\.\.\/\.\.\/fast-sort$/,
              replacement: path.resolve(
                projectRoot,
                'registry/dist/fast-sort.js',
              ),
            },
            {
              find: /^\.\.\/\.\.\/semver$/,
              replacement: path.resolve(projectRoot, 'registry/dist/semver.js'),
            },
            {
              find: /^\.\.\/\.\.\/del$/,
              replacement: path.resolve(projectRoot, 'registry/dist/del.js'),
            },
            {
              find: /^\.\.\/\.\.\/cacache$/,
              replacement: path.resolve(
                projectRoot,
                'registry/dist/cacache.js',
              ),
            },
            {
              find: /^\.\.\/\.\.\/libnpmpack$/,
              replacement: path.resolve(
                projectRoot,
                'registry/dist/libnpmpack.js',
              ),
            },
            {
              find: /^\.\.\/\.\.\/pacote$/,
              replacement: path.resolve(projectRoot, 'registry/dist/pacote.js'),
            },
            {
              find: /^\.\.\/\.\.\/browserslist$/,
              replacement: path.resolve(
                projectRoot,
                'registry/dist/browserslist.js',
              ),
            },
            {
              find: /^\.\.\/\.\.\/yargs-parser$/,
              replacement: path.resolve(
                projectRoot,
                'registry/dist/yargs-parser.js',
              ),
            },
            {
              find: /^\.\.\/\.\.\/zod$/,
              replacement: path.resolve(projectRoot, 'registry/dist/zod.js'),
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
    globalSetup: [path.resolve(__dirname, 'vitest-global-setup.mts')],
    globals: false,
    environment: 'node',
    include: [
      path.resolve(projectRoot, 'test/**/*.test.{js,ts,mjs,mts,cjs,cts}'),
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // Exclude test/npm unless INCLUDE_NPM_TESTS is set
      ...(process.env['INCLUDE_NPM_TESTS']
        ? []
        : [path.resolve(projectRoot, 'test/npm/**')]),
    ],
    reporters: ['default'],
    // Improve memory usage by running tests sequentially in CI.
    pool: 'forks',
    poolOptions: {
      forks: {
        // Use single fork for coverage to reduce memory, parallel otherwise.
        singleFork: isCoverageEnabled,
        maxForks: isCoverageEnabled ? 1 : undefined,
        // Isolate tests to prevent memory leaks between test files.
        isolate: true,
      },
      threads: {
        // Use single thread for coverage to reduce memory, parallel otherwise.
        singleThread: isCoverageEnabled,
        maxThreads: isCoverageEnabled ? 1 : undefined,
      },
    },
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
      reportsDirectory: 'coverage',
      reporter: ['text', 'json', 'html', 'lcov', 'clover'],
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
        'dist/external/**',
        'dist/types.js',
        'src/external/**',
        'src/types.ts',
        // Explicitly exclude scripts and packages at root
        '/scripts/**',
        '/packages/**',
        '/test/**',
      ],
      include: isCoverageEnabled
        ? ['src/**/*.{ts,mts,cts}']
        : ['dist/**/*.{js,mjs,cjs}'],
      all: true,
      clean: true,
      skipFull: false,
      ignoreClassMethods: ['constructor'],
      thresholds: {
        lines: 55,
        functions: 55,
        branches: 55,
        statements: 55,
      },
    },
  },
})
