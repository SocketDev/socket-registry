/**
 * @fileoverview Comprehensive optimization configurations for external bundles.
 */

export const optimizationStrategies = {
  // 1. MODULE REPLACEMENT - Use lighter alternatives.
  moduleReplacements: {
    // Replace heavy modules with lighter/native alternatives.
    // Node has native recursive mkdir.
    mkdirp: 'fs.promises.mkdir',
    // Node has native recursive rm.
    rimraf: 'fs.promises.rm',
    // We already use fast-glob.
    glob: 'fast-glob',
    // Tree-shakeable version.
    lodash: 'lodash-es',
    // Native in Node 14.17+.
    'uuid/v4': 'crypto.randomUUID',
    // Built into Node 18+.
    'node-fetch': 'undici',
  },

  // 2. SELECTIVE IMPORTS - Cherry-pick only what we need.
  selectiveImports: {
    lodash: ['get', 'set', 'merge', 'cloneDeep'],
    rxjs: ['Observable', 'Subject', 'from', 'of'],
    'date-fns': ['format', 'parseISO', 'isValid'],
  },

  // 3. LOCALE/DATA STRIPPING - Remove unnecessary data files.
  stripPatterns: [
    // Moment.js locales (if any package uses it).
    /moment\/locale\/[^/]+$/,
    // Timezone data we don't need.
    /timezone\/[^/]+\.json$/,
    // Test fixtures and examples.
    /\/(test|tests|spec|specs|__tests__|examples?|demo|docs?)\//,
    // Source maps.
    /\.map$/,
    // TypeScript source files.
    /\.ts$/,
    // README/LICENSE/CHANGELOG in dependencies.
    /node_modules\/[^/]+\/(README|LICENSE|CHANGELOG|HISTORY)/i,
  ],

  // 4. COMPILE-TIME CONSTANTS - More aggressive dead code elimination.
  defineConstants: {
    // Development/debugging flags.
    'process.env.NODE_ENV': '"production"',
    'process.env.DEBUG': 'undefined',
    __DEV__: 'false',
    __TEST__: 'false',
    __DEBUG__: 'false',

    // Browser/Node detection.
    'process.browser': 'false',
    'typeof window': '"undefined"',
    'typeof document': '"undefined"',
    'typeof navigator': '"undefined"',

    // Feature flags.
    'process.env.VERBOSE': 'false',
    'process.env.CI': 'false',
    'process.env.SILENT': 'true',

    // Package-specific flags.
    'global.GENTLY': 'false',
    'process.env.SUPPRESS_NO_CONFIG_WARNING': 'true',
    'process.env.NODE_NO_WARNINGS': '1',
  },

  // 5. BUNDLER HINTS - Mark side-effect free packages.
  sideEffectsFreePackages: [
    'semver',
    'yargs-parser',
    'picomatch',
    'fast-glob',
    'debug',
    'which',
  ],

  // 6. HEAVY DEPENDENCY ALTERNATIVES.
  alternativePackages: {
    pacote: {
      // Instead of full pacote, we could use targeted npm APIs.
      alternative: '@npmcli/arborist',
      reason: 'Lighter weight for specific operations',
    },
    'make-fetch-happen': {
      // Native fetch with retries.
      alternative: 'p-retry + native fetch',
      reason: 'Node 18+ has native fetch',
    },
    cacache: {
      // Simple file-based cache.
      alternative: 'flat-cache',
      reason: 'Simpler caching for our use case',
    },
  },

  // 7. CODE SPLITTING - Split rarely used code.
  codeSplitPoints: {
    // Error handling could be lazy-loaded.
    errors: /throw\s+new\s+[A-Z]\w+Error/,
    // CLI-specific code could be separate.
    cli: /yargs|commander|minimist/,
    // Validation could be lazy.
    validation: /ajv|joi|yup|zod/,
  },

  // 8. BINARY DATA OPTIMIZATION.
  binaryOptimization: {
    // Convert base64 to external files.
    extractBase64: true,
    // Compress large string literals.
    compressStrings: true,
    // External data files.
    externalizeData: ['*.json', '*.xml', '*.yaml'],
  },

  // 9. AGGRESSIVE MINIFICATION.
  minificationOptions: {
    // Remove all comments including licenses.
    legalComments: 'none',
    // Short variable names.
    identifierBase: 36,
    // Inline simple functions.
    inlineLimit: 10,
    // Fold constant expressions.
    constantFolding: true,
  },

  // 10. NPM-SPECIFIC OPTIMIZATIONS.
  npmOptimizations: {
    // Skip package validation in production.
    skipValidation: true,
    // Don't load package scripts.
    ignoreScripts: true,
    // Skip optional dependencies.
    skipOptional: true,
    // Use minimal manifest.
    minimalManifest: true,
  },
}

// Generate package-specific optimization config.
export function getPackageOptimizations(packageName) {
  const opts = {
    external: [],
    define: { ...optimizationStrategies.defineConstants },
    pure: [],
  }

  // Package-specific optimizations.
  switch (packageName) {
    case 'pacote':
      // Pacote includes git support we might not need.
      opts.external.push('isomorphic-git', 'dugite')
      opts.define['process.env.PACOTE_NO_GIT'] = 'true'
      break

    case 'libnpmpack':
      // Includes tar creation we might handle differently.
      opts.pure.push('console.time', 'console.timeEnd')
      break

    case 'make-fetch-happen':
      // Has extensive caching we might not use.
      opts.define['process.env.NO_PROXY_CACHE'] = 'true'
      break

    case 'browserslist':
      // Has update checking we don't need.
      opts.define['process.env.BROWSERSLIST_DISABLE_CACHE'] = 'true'
      break

    case 'zod':
      // Remove error map translations.
      opts.external.push('./locales/*')
      opts.define['process.env.ZOD_NO_ERRORS'] = 'false'
      break
  }

  return opts
}
