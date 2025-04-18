'use strict'

const path = require('node:path')

const commonjsPlugin = require('@rollup/plugin-commonjs')
const jsonPlugin = require('@rollup/plugin-json')
const { nodeResolve } = require('@rollup/plugin-node-resolve')
const { rollup } = require('rollup')
const { glob: tinyGlob } = require('tinyglobby')
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
            defaultIsModuleExports: 'auto',
            extensions: ['.cjs', '.js'],
            ignoreDynamicRequires: true,
            ignoreGlobal: true,
            ignoreTryCatch: true,
            strictRequires: true
          })
        ],
        onwarn(warning, warn) {
          // Suppress CIRCULAR_DEPENDENCY, INVALID_ANNOTATION. and THIS_IS_UNDEFINED
          // warnings.
          if (
            warning.code === 'CIRCULAR_DEPENDENCY' ||
            warning.code === 'INVALID_ANNOTATION' ||
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
