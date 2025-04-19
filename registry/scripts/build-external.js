'use strict'

const Module = require('node:module')
const path = require('node:path')

const commonjsPlugin = require('@rollup/plugin-commonjs')
const jsonPlugin = require('@rollup/plugin-json')
const { nodeResolve } = require('@rollup/plugin-node-resolve')
const replacePlugin = require('@rollup/plugin-replace')
const { rollup } = require('rollup')
const { glob: tinyGlob } = require('tinyglobby')

const builtinAliases = Module.builtinModules.reduce((o, n) => {
  if (!n.startsWith('node:')) {
    o[`node:${n}`] = n
  }
  return o
}, {})
;(async () => {
  const rootPath = path.join(__dirname, '..')
  const srcPath = path.join(rootPath, 'src')
  const srcExternalPath = path.join(srcPath, 'external')
  const filepaths = await tinyGlob(['**/*.js'], {
    absolute: true,
    cwd: srcExternalPath
  })
  await Promise.all(
    filepaths.map(async filepath => {
      const relPath = path.relative(srcPath, filepath)
      const bundle = await rollup({
        input: filepath,
        plugins: [
          nodeResolve({
            exportConditions: ['node'],
            extensions: ['.mjs', '.js', '.json'],
            preferBuiltins: true
          }),
          jsonPlugin(),
          commonjsPlugin({
            defaultIsModuleExports: true,
            extensions: ['.cjs', '.js'],
            ignoreDynamicRequires: true,
            ignoreGlobal: true,
            ignoreTryCatch: true,
            strictRequires: true
          }),
          // Convert un-prefixed built-in imports into "node:"" prefixed forms.
          replacePlugin({
            delimiters: ['(?<=(?:require\\(|from\\s*)["\'])', '(?=["\'])'],
            preventAssignment: false,
            values: builtinAliases
          })
        ],
        onwarn(warning, warn) {
          // Suppress CIRCULAR_DEPENDENCY, INVALID_ANNOTATION. and THIS_IS_UNDEFINED
          // warnings.
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
        }
      })
      await bundle.write({
        file: path.join(rootPath, relPath),
        format: 'cjs',
        sourcemap: true,
        inlineDynamicImports: true
      })
      console.log(`✅ Built ${relPath}`)
    })
  )
})()
