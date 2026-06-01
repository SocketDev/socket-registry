/**
 * @file Rolldown configuration for socket-registry. Per-file transpile (not a
 *   bundle): every `src/**\/*.{ts,mts,cts}` becomes a sibling `dist/**\/*.js`
 *   with inter-file `require()`s preserved, via `output.preserveModules`.
 *   Declarations come from tsgo. Replaces the esbuild build (fleet "Tooling"
 *   rule: bundler = rolldown). Output contract (consumers `require()` it): CJS,
 *   no minification, mirrored dir layout, NODE_ENV inlined.
 */

import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import fg from 'fast-glob'

import { envAsBoolean } from '@socketsecurity/lib/env/boolean'

import type { RolldownOptions } from 'rolldown'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.join(__dirname, '..')
const srcPath = path.join(rootPath, 'src')
const distPath = path.join(rootPath, 'dist')

// Mirror the esbuild entry-point glob: every runtime source file, minus
// declaration files and the types/ directory.
const entryFiles = fg.sync('**/*.{ts,mts,cts}', {
  cwd: srcPath,
  absolute: true,
  ignore: ['**/*.d.ts', '**/types/**'],
})

// preserveModules keys outputs off the input map; build an explicit map so
// each file lands at its mirrored dist path.
const input: Record<string, string> = {}
for (let i = 0, { length } = entryFiles; i < length; i += 1) {
  const abs = entryFiles[i]!
  const rel = path
    .relative(srcPath, abs)
    .replace(/\.(?:c|m)?ts$/, '')
    .split(path.sep)
    .join('/')
  input[rel] = abs
}

export const buildConfig: RolldownOptions = {
  // bundle:false equivalent — keep each source file as its own module with
  // inter-file requires intact.
  external: (id: string) => !id.startsWith('.') && !path.isAbsolute(id),
  input,
  output: {
    dir: distPath,
    format: 'cjs',
    preserveModules: true,
    preserveModulesRoot: srcPath,
    minify: false,
    sourcemap: envAsBoolean(process.env['COVERAGE']),
    entryFileNames: '[name].js',
    chunkFileNames: '[name].js',
    banner: '/* Socket Registry - Built with rolldown */',
  },
  platform: 'node',
  // oxc define lives under `transform` (top-level `define` is rejected by
  // rolldown). Value is already-quoted source text, same contract as esbuild.
  transform: {
    define: {
      'process.env.NODE_ENV': JSON.stringify(
        process.env['NODE_ENV'] || 'production',
      ),
    },
  },
}
