import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Check if coverage is enabled via CLI flags or environment.
// Note: process.argv doesn't include vitest CLI args at config load time,
// so we check environment variables and use a heuristic based on npm script.
const isCoverageEnabled =
  process.env.COVERAGE === 'true' ||
  process.env.npm_lifecycle_event?.includes('coverage') ||
  process.argv.some(arg => arg.includes('coverage'))

const projectRoot = path.resolve(__dirname, '..')

export default defineConfig({
  // Disabled complex transform plugins - we now test src/ directly
  // plugins: [
  //   createImportTransformPlugin(isCoverageEnabled, __dirname),
  //   createRequireTransformPlugin(),
  // ],
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
      {
        // Always map @socketsecurity/registry to src/ for all tests
        // This simplifies coverage and avoids complex dist/ → src/ transforms
        find: '@socketsecurity/registry',
        replacement: path.resolve(projectRoot, 'registry/src'),
      },
      // Map external dependencies to their dist versions
      ...(isCoverageEnabled
        ? [
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
        : []),
    ],
  },
  test: {
    globalSetup: [path.resolve(__dirname, 'vitest-global-setup.mts')],
    setupFiles: ['./test/setup.mts'],
    globals: false,
    environment: 'node',
    include: [
      path.resolve(projectRoot, 'test/**/*.test.{js,ts,mjs,mts,cjs,cts}'),
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // Exclude test/npm unless INCLUDE_NPM_TESTS is set
      ...(process.env.INCLUDE_NPM_TESTS
        ? []
        : [path.resolve(projectRoot, 'test/npm/**')]),
    ],
    reporters: ['default'],
    // Use threads for better performance
    pool: 'threads',
    poolOptions: {
      threads: {
        // Use single thread for coverage to reduce memory, parallel otherwise.
        singleThread: isCoverageEnabled,
        maxThreads: isCoverageEnabled ? 1 : 16,
        minThreads: isCoverageEnabled ? 1 : 4,
        // IMPORTANT: isolate: false for performance and test compatibility
        //
        // Tradeoff Analysis:
        // - isolate: true  = Full isolation, slower, breaks nock/module mocking
        // - isolate: false = Shared worker context, faster, mocking works
        //
        // We choose isolate: false because:
        // 1. Significant performance improvement (faster test runs)
        // 2. Nock HTTP mocking works correctly across all test files
        // 3. Vi.mock() module mocking functions properly
        // 4. Test state pollution is prevented through proper beforeEach/afterEach
        // 5. Our tests are designed to clean up after themselves
        //
        // Tests requiring true isolation should use pool: 'forks' or be marked
        // with { pool: 'forks' } in the test file itself.
        isolate: false,
        // Use worker threads for better performance
        useAtomics: true,
      },
    },
    // Reduce timeouts for faster failures
    testTimeout: 10_000,
    hookTimeout: 10_000,
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
        'test/**',
        'packages/**',
        'perf/**',
        'dist/**',
        // Exclude everything in registry except src/
        'registry/scripts/**',
        'registry/plugins/**',
        'registry/dist/**',
        'registry/src/external/**',
        'registry/src/types.ts',
        // Explicitly exclude at root level
        'scripts/**',
      ],
      // Only include registry/src/ files for coverage instrumentation
      include: ['registry/src/**/*.{ts,mts,cts}'],
      all: true,
      clean: true,
      skipFull: false,
      ignoreClassMethods: ['constructor'],
      thresholds: {
        lines: 1,
        functions: 70,
        branches: 70,
        statements: 1,
      },
    },
  },
})
