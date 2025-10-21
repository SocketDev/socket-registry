/**
 * @fileoverview esbuild configuration for socket-registry
 * Fast JS compilation with esbuild, declarations with tsgo
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fg from 'fast-glob'

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
  sourcemap: false,
  // Library code should be readable.
  minify: false,
  // Can't tree-shake without bundling.
  treeShaking: false,
  metafile: true,
  logLevel: 'info',

  // Note: Cannot use "external" with bundle: false
  // esbuild automatically treats all imports as external when not bundling

  // Banner for generated code
  banner: {
    js: '/* Socket Registry - Built with esbuild */',
  },
}

// Watch configuration for development with incremental builds
export const watchConfig = {
  ...buildConfig,
  minify: false,
  sourcemap: false,
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
