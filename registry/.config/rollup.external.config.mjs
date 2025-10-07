/**
 * @fileoverview Rollup config for bundling external dependencies.
 * Each src/external/<thing>.js re-export is an entry point that gets
 * bundled into a standalone dist/external/<thing>.js file.
 */

import Module from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { babel as babelPlugin } from '@rollup/plugin-babel'
import commonjsPlugin from '@rollup/plugin-commonjs'
import jsonPlugin from '@rollup/plugin-json'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import fastGlob from 'fast-glob'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const rootPath = path.join(__dirname, '..')
const configPath = path.join(rootPath, '.config')
const srcPath = path.join(rootPath, 'src')
const srcExternalPath = path.join(srcPath, 'external')
const distPath = path.join(rootPath, 'dist')

export default async () => {
  // Find all JavaScript entry points in src/external/.
  const jsFiles = await fastGlob('**/*.js', {
    absolute: false,
    cwd: srcExternalPath,
  })

  // Copy .d.ts files separately (they don't need bundling).
  const dtsFiles = await fastGlob('**/*.d.ts', {
    absolute: true,
    cwd: srcExternalPath,
  })

  // Create separate config for each file to bundle independently.
  const configs = jsFiles.map(file => {
    const name = `external/${file.replace(/\.js$/, '')}`
    const inputPath = path.join(srcExternalPath, file)

    return {
      external(id) {
        // Externalize Node.js built-ins only.
        if (Module.isBuiltin(id)) {
          return true
        }
        // Externalize the registry itself to avoid circular dependencies.
        if (id.includes('@socketsecurity/registry')) {
          return true
        }
        // Bundle everything else - let Rollup do its thing.
        return false
      },
      input: inputPath,
      onwarn(warning, warn) {
        // Suppress common warnings.
        if (
          warning.code === 'CIRCULAR_DEPENDENCY' ||
          warning.code === 'INVALID_ANNOTATION' ||
          warning.code === 'MIXED_EXPORTS' ||
          warning.code === 'THIS_IS_UNDEFINED'
        ) {
          return
        }
        warn(warning)
      },
      output: {
        file: path.join(distPath, `${name}.js`),
        exports: 'auto',
        externalLiveBindings: false,
        format: 'cjs',
        // Inline all dynamic imports into the bundle.
        inlineDynamicImports: true,
        // Use named exports for better compatibility.
        interop: 'auto',
        sourcemap: false,
      },
      plugins: [
        // Resolve node_modules and handle all module types.
        nodeResolve({
          exportConditions: ['node', 'require'],
          extensions: ['.mjs', '.js', '.json', '.node', '.cjs'],
          preferBuiltins: true,
        }),
        // Handle JSON imports.
        jsonPlugin(),
        // Convert CommonJS to ES modules before bundling.
        commonjsPlugin({
          // Preserve the original module structure.
          defaultIsModuleExports: true,
          // Transform dynamic requires.
          dynamicRequireTargets: [],
          // Handle ES module externals properly.
          esmExternals: false,
          extensions: ['.cjs', '.js'],
          // Don't ignore dynamic requires.
          ignoreDynamicRequires: false,
          ignoreGlobal: false,
          ignoreTryCatch: 'remove',
          // Preserve require semantics.
          requireReturnsDefault: false,
          strictRequires: 'auto',
          // Don't transform mixed modules - preserve as-is.
          transformMixedEsModules: false,
        }),
        // Use Babel to ensure class inheritance works correctly.
        babelPlugin({
          babelHelpers: 'bundled',
          babelrc: false,
          configFile: path.join(configPath, 'babel.config.js'),
          exclude: ['node_modules/@babel/**'],
          extensions: ['.js', '.cjs', '.mjs'],
          // Skip node_modules except for problematic packages.
          skipPreflightCheck: true,
        }),
      ],
    }
  })

  // Copy .d.ts files after building all JavaScript files.
  if (dtsFiles.length > 0 && configs.length > 0) {
    const lastConfig = configs[configs.length - 1]
    lastConfig.plugins.push({
      name: 'copy-dts-files',
      async writeBundle() {
        const { promises: fs } = await import('node:fs')
        await Promise.all(
          dtsFiles.map(async filepath => {
            const relPath = path.relative(srcPath, filepath)
            const destPath = path.join(distPath, relPath)
            const destDir = path.dirname(destPath)
            await fs.mkdir(destDir, { recursive: true })
            await fs.copyFile(filepath, destPath)
          }),
        )
      },
    })
  }

  return configs
}
