/**
 * @fileoverview Rollup config for building registry source to CommonJS.
 */

import Module from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { babel as babelPlugin } from '@rollup/plugin-babel'
import commonjsPlugin from '@rollup/plugin-commonjs'
import jsonPlugin from '@rollup/plugin-json'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import replacePlugin from '@rollup/plugin-replace'
import fastGlob from 'fast-glob'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const rootPath = path.join(__dirname, '..')
const configPath = path.join(rootPath, '.config')
const srcPath = path.join(rootPath, 'src')
const distPath = path.join(rootPath, 'dist')

const builtinAliases = Module.builtinModules.reduce((o, n) => {
  if (!n.startsWith('node:')) {
    o[`node:${n}`] = n
  }
  return o
}, {})

export default async () => {
  // Find all TypeScript entry points in src/.
  const tsFiles = await fastGlob('**/*.ts', {
    absolute: false,
    cwd: srcPath,
    ignore: ['**/*.d.ts', 'external/**'],
  })

  // Create input object mapping output paths to source paths.
  const input = tsFiles.reduce((o, file) => {
    // Remove .ts extension for output name.
    const name = file.replace(/\.ts$/, '')
    o[name] = path.join(srcPath, file)
    return o
  }, {})

  return {
    // Disable tree-shaking to prevent incorrect removal of code.
    // Without this, Rollup incorrectly removes the AST parsing logic in
    // lib/packages/licenses.ts (lines 237-257) which calls parseSpdxExp()
    // and visitLicenses(), causing test failures in packages-licenses.test.mts.
    treeshake: false,
    external(id) {
      // Externalize Node.js built-ins.
      if (Module.isBuiltin(id) || Module.isBuiltin(id.replace(/^node:/, ''))) {
        return true
      }
      // Externalize external dependencies that are built separately.
      if (id.includes('/external/') || id.startsWith('../external/')) {
        return true
      }
      // Externalize node_modules.
      if (id.includes('node_modules')) {
        return true
      }
      return false
    },
    input,
    onwarn(warning, warn) {
      // Suppress warnings.
      if (
        warning.code === 'CIRCULAR_DEPENDENCY' ||
        warning.code === 'INVALID_ANNOTATION' ||
        warning.code === 'MIXED_EXPORTS' ||
        warning.code === 'THIS_IS_UNDEFINED'
      ) {
        return
      }
      // Forward other warnings.
      warn(warning)
    },
    output: [
      {
        chunkFileNames: '[name].js',
        dir: distPath,
        entryFileNames: '[name].js',
        exports: 'auto',
        externalLiveBindings: false,
        format: 'cjs',
        preserveModules: true,
        preserveModulesRoot: srcPath,
        sourcemap: false,
      },
    ],
    plugins: [
      nodeResolve({
        exportConditions: ['node'],
        extensions: ['.mjs', '.js', '.json', '.ts'],
        preferBuiltins: true,
      }),
      jsonPlugin(),
      commonjsPlugin({
        defaultIsModuleExports: true,
        extensions: ['.cjs', '.js'],
        ignoreDynamicRequires: true,
        ignoreGlobal: true,
        ignoreTryCatch: true,
        strictRequires: true,
      }),
      babelPlugin({
        babelHelpers: 'runtime',
        babelrc: false,
        configFile: path.join(configPath, 'babel.config.js'),
        exclude: ['node_modules/**', path.join(rootPath, 'plugins', '**')],
        extensions: ['.js', '.cjs', '.mjs', '.ts'],
      }),
      // Convert un-prefixed built-in imports into "node:"" prefixed forms.
      replacePlugin({
        delimiters: ['(?<=(?:require\\(|from\\s*)["\'])', '(?=["\'])'],
        preventAssignment: false,
        values: builtinAliases,
      }),
    ],
  }
}
