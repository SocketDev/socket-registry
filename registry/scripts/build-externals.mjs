/**
 * @fileoverview Bundle external dependencies into standalone zero-dependency modules.
 * This bundles packages like cacache, pacote, make-fetch-happen into dist/external.
 */

import { promises as fs } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)

// Use esbuild from root node_modules since registry package is zero-dependency.
import esbuild from '../../node_modules/esbuild/lib/main.js'
import {
  printError,
  printFooter,
  printHeader,
  printSuccess,
} from '../../scripts/utils/cli-helpers.mjs'
import { createCherryPickEntry } from './cherry-pick-entries.mjs'
import { createNonBarrelEntry } from './non-barrel-imports.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const srcExternalDir = path.join(rootDir, 'src', 'external')
const distExternalDir = path.join(rootDir, 'dist', 'external')

// Check if local workspace or sibling project versions exist.
// Used for development to use local changes instead of published packages.
async function getLocalPackagePath(packageName) {
  const checks = []

  // Check workspace packages (e.g. @socketregistry/yocto-spinner).
  if (packageName.startsWith('@socketregistry/')) {
    const pkgName = packageName.replace('@socketregistry/', '')
    const workspacePath = path.resolve(
      rootDir,
      '..',
      'packages',
      'npm',
      pkgName,
    )
    checks.push(workspacePath)
  }

  // Check sibling projects (e.g. socket-packageurl-js).
  if (packageName === '@socketregistry/packageurl-js') {
    const siblingPath = path.resolve(
      rootDir,
      '..',
      '..',
      'socket-packageurl-js',
    )
    checks.push(siblingPath)
  }

  // Return first existing path.
  for (const checkPath of checks) {
    try {
      await fs.access(path.join(checkPath, 'package.json'))
      return checkPath
    } catch {
      // Path doesn't exist, continue.
    }
  }

  return null
}

// Define which packages need bundling (ones that are actual npm packages).
// Skip ones that are just local re-exports.
const externalPackages = [
  // NPM internals
  { name: 'cacache', bundle: true },
  { name: 'pacote', bundle: true },
  { name: 'make-fetch-happen', bundle: true },
  { name: 'libnpmpack', bundle: true },
  { name: 'npm-package-arg', bundle: true },
  { name: 'normalize-package-data', bundle: true },
  // Utilities
  // { name: 'browserslist', bundle: true }, // UNUSED - no imports found
  { name: 'debug', bundle: true },
  { name: 'del', bundle: true },
  { name: 'fast-glob', bundle: true },
  { name: 'fast-sort', bundle: true },
  { name: 'get-east-asian-width', bundle: true },
  { name: 'picomatch', bundle: true },
  { name: 'semver', bundle: true },
  { name: 'spdx-correct', bundle: true },
  { name: 'spdx-expression-parse', bundle: true },
  { name: 'streaming-iterables', bundle: true },
  { name: 'validate-npm-package-name', bundle: true },
  { name: 'which', bundle: true },
  { name: 'yargs-parser', bundle: true },
  { name: 'yoctocolors-cjs', bundle: true },
  // Used by socket-cli (dist/cli.js has minified zod).
  { name: 'zod', bundle: true },
]

// Scoped packages need special handling.
const scopedPackages = [
  { scope: '@npmcli', name: 'promise-spawn', bundle: true },
  {
    scope: '@inquirer',
    packages: ['checkbox', 'confirm', 'core', 'prompts', 'select'],
    optional: true,
  },
  {
    scope: '@socketregistry',
    packages: ['packageurl-js', 'is-unicode-supported', 'yocto-spinner'],
    optional: true,
  },
  { scope: '@yarnpkg', name: 'extensions', bundle: true },
]

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

// Package-specific optimizations.
function getPackageSpecificOptions(packageName) {
  const opts = {}

  // Optimize specific packages.
  if (packageName === 'browserslist') {
    // Browserslist's data updates frequently - we can exclude some update checking.
    opts.define = {
      'process.versions.node': '"18.0.0"',
    }
  } else if (packageName === 'zod') {
    // Zod has localization files we don't need.
    opts.external = [...(opts.external || []), './locales/*']
  } else if (packageName.startsWith('@inquirer/')) {
    // Inquirer packages have heavy dependencies we might not need.
    opts.external = [...(opts.external || []), 'rxjs/operators']
  } else if (packageName === 'yargs-parser') {
    // yargs-parser uses import.meta.url which isn't available in CommonJS.
    // Replace import.meta.url with __filename wrapped in pathToFileURL.
    opts.define = {
      ...opts.define,
      'import.meta.url': '__filename',
    }
  }

  return opts
}

async function bundlePackage(packageName, outputPath) {
  console.log(`  Bundling ${packageName}...`)

  let cherryPickedEntry

  try {
    // Check if package is installed.
    let packagePath

    // First, check for local workspace/sibling versions (dev mode).
    const localPath = await getLocalPackagePath(packageName)
    if (localPath) {
      console.log(
        `  Using local version from ${path.relative(rootDir, localPath)}`,
      )
      // Use the package's entry point.
      const localPkgJson = JSON.parse(
        await fs.readFile(path.join(localPath, 'package.json'), 'utf8'),
      )
      // Resolve the main export - handle nested exports structure.
      let mainExport = localPkgJson.main || 'index.js'
      const exportsField = localPkgJson.exports?.['.']
      if (exportsField) {
        if (typeof exportsField === 'string') {
          mainExport = exportsField
        } else if (typeof exportsField === 'object') {
          // Try to find default export in nested structure.
          mainExport =
            exportsField.node?.default?.default ||
            exportsField.node?.default ||
            exportsField.default?.default ||
            exportsField.default ||
            mainExport
        }
      }
      packagePath = path.join(localPath, mainExport)
    } else {
      // Fall back to installed version.
      try {
        packagePath = require.resolve(packageName)
      } catch {
        // Package must be installed for bundling - no fallbacks.
        throw new Error(
          `Package "${packageName}" is not installed. Please install it with: pnpm add -D ${packageName}`,
        )
      }
    }

    // Check if we have a cherry-pick optimization for this package first.
    const cherryPickEntry = await createCherryPickEntry(packageName, null)
    if (cherryPickEntry) {
      console.log(`  Using cherry-picked imports for ${packageName}`)
      packagePath = cherryPickEntry
      // For cleanup tracking.
      cherryPickedEntry = cherryPickEntry
    } else {
      // Fall back to non-barrel import optimization.
      const nonBarrelEntry = await createNonBarrelEntry(packageName, null)
      if (nonBarrelEntry) {
        console.log(`  Using non-barrel imports for ${packageName}`)
        packagePath = nonBarrelEntry
        // For cleanup tracking.
        cherryPickedEntry = nonBarrelEntry
      }
    }

    // Get package-specific optimizations.
    const packageOpts = getPackageSpecificOptions(packageName)

    // Bundle the package with esbuild.
    await esbuild.build({
      entryPoints: [packagePath],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      outfile: outputPath,
      external: [
        'node:*',
        'fs',
        'path',
        'os',
        'crypto',
        'stream',
        'util',
        'events',
        'child_process',
        'http',
        'https',
        'net',
        'url',
        'zlib',
        'buffer',
        'querystring',
        'string_decoder',
        'tty',
        'assert',
        'perf_hooks',
        'worker_threads',
        'v8',
        'vm',
        '@socketsecurity/registry',
        ...(packageOpts.external || []),
      ],
      plugins: [
        {
          name: 'stub-encoding',
          setup(build) {
            // Stub out encoding and iconv-lite packages.
            build.onResolve({ filter: /^(encoding|iconv-lite)$/ }, args => ({
              path: args.path,
              namespace: 'stub-encoding',
            }))

            build.onLoad({ filter: /.*/, namespace: 'stub-encoding' }, () => ({
              contents: 'module.exports = {};',
              loader: 'js',
            }))
          },
        },
      ],
      minify: true,
      sourcemap: false,
      metafile: true,
      logLevel: 'error',
      treeShaking: true,
      // Keep function names for better error messages.
      keepNames: true,
      // Additional optimizations:
      // Mark functions as side-effect free for better tree shaking.
      pure: ['console.log', 'console.debug', 'console.warn'],
      // Drop debugger statements and console logs in production.
      drop: ['debugger', 'console'],
      // Ignore specific patterns (e.g., test files, examples, locales).
      ignoreAnnotations: false,
      // More aggressive mangling for smaller output.
      minifyWhitespace: true,
      minifyIdentifiers: true,
      minifySyntax: true,
      // Define compile-time constants for dead code elimination.
      // These allow bundlers to completely remove code paths that will never execute.
      define: {
        // NODE_ENV: The most common optimization flag in the Node.js ecosystem.
        // Many packages use this pattern:
        //   if (process.env.NODE_ENV !== 'production') {
        //     validateProps(props)  // Dev-only validation
        //     checkInvariants()     // Expensive checks
        //     console.warn('...')   // Dev warnings
        //   }
        // When we define NODE_ENV as "production", esbuild:
        // 1. Evaluates the condition: 'production' !== 'production' = false
        // 2. Recognizes the entire if-block will never execute
        // 3. Completely removes all development code
        // This can eliminate 20-40% of React/Vue/Express code!
        'process.env.NODE_ENV': '"production"',

        // __DEV__: Used by React, Vue, and many modern frameworks.
        // Pattern in packages:
        //   if (__DEV__) {
        //     PropTypes.checkPropTypes()  // React prop validation
        //     devtools.init()             // Dev tools initialization
        //     enableHotReload()           // HMR code
        //   }
        // Setting to false removes ALL development-only code paths.
        // React alone can shrink by ~30KB when __DEV__ is false.
        __DEV__: 'false',

        // global.GENTLY: Test mocking library flag from early Node.js era (2010-2015).
        // Used by packages like formidable, multiparty, and other form parsers:
        //   if (global.GENTLY) {
        //     require('gently')  // Test mocking library (~15KB)
        //     GENTLY.hijack(...)  // Mock setup code
        //   }
        // When false, removes ALL mocking infrastructure.
        // See: https://github.com/felixge/node-gently
        'global.GENTLY': 'false',

        // process.env.DEBUG: Controls the popular 'debug' package output.
        // The debug package (used by Express, Socket.io, Mocha) does:
        //   if (process.env.DEBUG) {
        //     const namespaces = process.env.DEBUG.split(',')
        //     enabledNamespaces.push(...namespaces)
        //     loadFormatters()  // Color formatting code
        //     setupTimers()     // Performance timing
        //   }
        // When undefined/false:
        // 1. No namespace parsing logic
        // 2. No formatters loaded (chalk, colors, etc.)
        // 3. No timing calculations
        // 4. All debug() calls become no-ops
        // Can save 5-10KB per package using debug!
        'process.env.DEBUG': 'undefined',

        // process.browser: Used by isomorphic packages to detect browser environment.
        // Common in packages like 'util', 'events', 'stream', 'buffer':
        //   if (process.browser) {
        //     module.exports = require('./browser-implementation')  // Browser polyfills
        //     setupDOMListeners()     // DOM event handlers
        //     loadWebAPIs()           // fetch, WebSocket, etc.
        //   } else {
        //     module.exports = require('./node-implementation')     // Node native code
        //   }
        // Setting to false ensures ONLY Node.js code paths are included.
        // Can eliminate entire browser polyfill bundles (often 50+ KB)!
        'process.browser': 'false',

        // process.env.VERBOSE: Controls verbose logging in many CLI tools.
        // Used by npm, webpack, jest, and other tools:
        //   if (process.env.VERBOSE) {
        //     logger.setLevel('trace')
        //     enableStackTraces()
        //     showProgressBars()
        //     printDetailedErrors()
        //   }
        // When false, removes:
        // - Detailed error messages with stack traces
        // - Progress indicators and spinners
        // - Verbose log formatting code
        // - Performance profiling output
        'process.env.VERBOSE': 'false',

        // typeof window: The most reliable browser detection pattern.
        // Used by virtually every isomorphic package:
        //   if (typeof window !== 'undefined') {
        //     // Browser-specific code
        //     window.addEventListener()    // DOM events
        //     document.querySelector()      // DOM queries
        //     localStorage.setItem()        // Browser storage
        //     fetch()                       // Browser fetch API
        //   }
        // When defined as "undefined":
        // 1. All browser-only code branches are eliminated
        // 2. DOM manipulation libraries are stripped
        // 3. Browser API polyfills are removed
        // 4. Web Worker code is eliminated
        // This is the MOST effective optimization for Node.js bundles!
        // Note: esbuild doesn't support 'typeof X' as a define key directly,
        // but we can define the globals themselves as undefined.
        window: 'undefined',
        document: 'undefined',
        navigator: 'undefined',
        HTMLElement: 'undefined',
        localStorage: 'undefined',
        sessionStorage: 'undefined',
        XMLHttpRequest: 'undefined',
        WebSocket: 'undefined',

        // __TEST__: Used by testing frameworks and test utilities.
        // Common in packages with built-in test helpers:
        //   if (__TEST__) {
        //     exports.mockImplementation = ...  // Test mocks
        //     exports.testHelpers = ...         // Test utilities
        //     setupTestEnvironment()            // Test setup
        //     enableSnapshotting()              // Jest snapshots
        //   }
        // When false, removes ALL testing infrastructure:
        // - Mock implementations
        // - Test fixtures and helpers
        // - Assertion libraries
        // - Snapshot serializers
        __TEST__: 'false',

        // process.env.CI: Continuous Integration environment flag.
        // Many packages alter behavior in CI:
        //   if (process.env.CI) {
        //     disableAnimations()      // No progress bars
        //     enableJUnitReporting()   // XML test output
        //     uploadCoverageReports()  // Coverage reporting
        //     runInHeadlessMode()      // No interactive prompts
        //   }
        // Setting to false removes CI-specific code paths.
        'process.env.CI': 'false',

        // Additional test-related flags:
        // Jest test runner detection.
        __JEST__: 'false',
        // Mocha test runner detection.
        __MOCHA__: 'false',
        // Jest worker threads.
        'process.env.JEST_WORKER_ID': 'undefined',
        // Node.js test runner.
        'process.env.NODE_TEST': 'undefined',

        ...packageOpts.define,
      },
      // Use more efficient charset.
      charset: 'utf8',
    })

    // Add a header comment to the bundled file.
    const bundleContent = await fs.readFile(outputPath, 'utf8')

    const finalContent = `/**
 * Bundled from ${packageName}
 * This is a zero-dependency bundle created by esbuild.
 */
${bundleContent}`
    await fs.writeFile(outputPath, finalContent)

    // Get file size for logging.
    const stats = await fs.stat(outputPath)
    const sizeKB = Math.round(stats.size / 1024)
    console.log(`    ✓ Bundled ${packageName} (${sizeKB}KB)`)

    // Clean up temp directory if we created one.
    if (cherryPickedEntry) {
      const tmpDir = path.join(process.cwd(), '.tmp-build')
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  } catch (error) {
    console.error(`    ✗ Failed to bundle ${packageName}:`, error.message)
    // Create error stub.
    const stubContent = `'use strict'

// Failed to bundle ${packageName}: ${error.message}
throw new Error('Failed to bundle ${packageName}')
`
    await fs.writeFile(outputPath, stubContent)
  } finally {
    // Always clean up temp directory if we created one.
    if (cherryPickedEntry) {
      const tmpDir = path.join(process.cwd(), '.tmp-build')
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
    }
  }
}

async function copyLocalFiles() {
  // Copy TypeScript declaration files.
  const dtsFiles = await fs.readdir(srcExternalDir)
  for (const file of dtsFiles) {
    if (file.endsWith('.d.ts')) {
      await fs.copyFile(
        path.join(srcExternalDir, file),
        path.join(distExternalDir, file),
      )
      console.log(`  Copied ${file}`)
    }
  }
}

// Helper to recursively copy a directory
async function copyRecursive(srcPath, destPath, relativePath = '') {
  await ensureDir(destPath)
  const entries = await fs.readdir(srcPath, { withFileTypes: true })

  for (const entry of entries) {
    const srcEntry = path.join(srcPath, entry.name)
    const destEntry = path.join(destPath, entry.name)
    const relPath = path.join(relativePath, entry.name)

    if (entry.isDirectory()) {
      // Recursively copy directory
      await copyRecursive(srcEntry, destEntry, relPath)
    } else {
      // Only copy if the file doesn't already exist (i.e., wasn't bundled).
      try {
        await fs.access(destEntry)
        // File exists (was bundled), skip copying.
      } catch {
        // File doesn't exist, copy it.
        await fs.copyFile(srcEntry, destEntry)
        console.log(`  Copied ${relPath}`)
      }
    }
  }
}

async function copyScopedFiles() {
  // Copy scoped package directories.
  for (const { scope } of scopedPackages) {
    const scopeSrcDir = path.join(srcExternalDir, scope)
    const scopeDistDir = path.join(distExternalDir, scope)

    try {
      await copyRecursive(scopeSrcDir, scopeDistDir, scope)
    } catch {
      // Scope directory doesn't exist.
    }
  }
}

async function main() {
  printHeader('Building External Bundles')

  // Ensure dist/external directory exists.
  await ensureDir(distExternalDir)

  // Bundle each external package.
  for (const { bundle, name } of externalPackages) {
    if (bundle) {
      const outputPath = path.join(distExternalDir, `${name}.js`)
      await bundlePackage(name, outputPath)
    }
  }

  // Bundle scoped packages.
  for (const { name, optional, packages, scope } of scopedPackages) {
    const scopeDir = path.join(distExternalDir, scope)
    await ensureDir(scopeDir)

    if (name) {
      // Single package in scope.
      const outputPath = path.join(scopeDir, `${name}.js`)
      if (optional) {
        try {
          await bundlePackage(`${scope}/${name}`, outputPath)
        } catch {
          console.log(`  Skipping optional package ${scope}/${name}`)
        }
      } else {
        await bundlePackage(`${scope}/${name}`, outputPath)
      }
    } else if (packages) {
      // Multiple packages in scope.
      for (const pkg of packages) {
        const outputPath = path.join(scopeDir, `${pkg}.js`)
        if (optional) {
          try {
            await bundlePackage(`${scope}/${pkg}`, outputPath)
          } catch {
            console.log(`  Skipping optional package ${scope}/${pkg}`)
          }
        } else {
          await bundlePackage(`${scope}/${pkg}`, outputPath)
        }
      }
    }
  }

  console.log('\nCopying declaration files...')
  await copyLocalFiles()
  await copyScopedFiles()

  printSuccess('External bundles built successfully')
  printFooter()
}

main().catch(error => {
  printError(`Build failed: ${error.message || error}`)
  process.exitCode = 1
})
