/**
 * @fileoverview esbuild configuration for socket-registry
 * Fast JS compilation with esbuild, declarations with tsgo
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fg from 'fast-glob'

import { getLocalPackageAliases } from '../scripts/utils/get-local-package-aliases.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.join(__dirname, '..')
const srcPath = path.join(rootPath, 'src')
const distPath = path.join(rootPath, 'dist')

// Find all TypeScript source files
const entryPoints = fg.sync('**/*.{ts,mts,cts}', {
  cwd: srcPath,
  absolute: true,
  // Skip declaration files.
  ignore: ['**/*.d.ts', '**/types/**'],
})

/**
 * Plugin to handle local package aliases when bundle: false
 * esbuild's built-in alias only works with bundle: true, so we need a custom plugin
 */
function createAliasPlugin() {
  const aliases = getLocalPackageAliases(rootPath)

  // Only create plugin if we have local aliases
  if (Object.keys(aliases).length === 0) {
    return null
  }

  return {
    name: 'local-package-aliases',
    setup(build) {
      // Intercept imports for aliased packages
      for (const [packageName, aliasPath] of Object.entries(aliases)) {
        build.onResolve({ filter: new RegExp(`^${packageName}$`) }, () => {
          // Return the path to the local package dist
          return { path: aliasPath, external: true }
        })

        // Handle subpath imports like '@socketsecurity/lib/spinner'
        build.onResolve({ filter: new RegExp(`^${packageName}/`) }, args => {
          const subpath = args.path.slice(packageName.length + 1)
          return { path: path.join(aliasPath, subpath), external: true }
        })
      }
    },
  }
}

// Build configuration for CommonJS output
export const buildConfig = {
  entryPoints,
  outdir: distPath,
  outbase: srcPath,
  // Don't bundle - library pattern (each file separate).
  bundle: false,
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  // Disable minification for better Node ESM interop
  // Node ESM requires clear exports: module.exports = { foo, bar }
  minify: false,
  // Tree-shaking optimization
  treeShaking: true,
  metafile: true,
  logLevel: 'info',

  // Use plugin for local package aliases (built-in alias requires bundle: true)
  plugins: [createAliasPlugin()].filter(Boolean),

  // Note: Cannot use "external" with bundle: false
  // esbuild automatically treats all imports as external when not bundling

  // Define constants for optimization
  define: {
    'process.env.NODE_ENV': JSON.stringify(
      process.env.NODE_ENV || 'production',
    ),
  },

  // Banner for generated code
  banner: {
    js: '/* Socket Registry - Built with esbuild */',
  },
}

// Watch configuration for development with incremental builds
export const watchConfig = {
  ...buildConfig,
  minify: false,
  sourcemap: 'inline',
  logLevel: 'debug',
}

/**
 * Analyze build output for size information
 */
export function analyzeMetafile(metafile) {
  const outputs = Object.keys(metafile.outputs)
  let totalSize = 0

  const files = outputs.map(file => {
    const output = metafile.outputs[file]
    totalSize += output.bytes
    return {
      name: path.relative(rootPath, file),
      size: `${(output.bytes / 1024).toFixed(2)} KB`,
    }
  })

  return {
    files,
    totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
  }
}
