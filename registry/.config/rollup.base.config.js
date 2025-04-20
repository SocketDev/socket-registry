'use strict'

const Module = require('node:module')
const path = require('node:path')

const { babel: babelPlugin } = require('@rollup/plugin-babel')
const commonjsPlugin = require('@rollup/plugin-commonjs')
const jsonPlugin = require('@rollup/plugin-json')
const { nodeResolve } = require('@rollup/plugin-node-resolve')
const replacePlugin = require('@rollup/plugin-replace')

const configPath = __dirname

const builtinAliases = Module.builtinModules.reduce((o, n) => {
  if (!n.startsWith('node:')) {
    o[`node:${n}`] = n
  }
  return o
}, {})

module.exports = function getConfig(filepath) {
  return {
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
      babelPlugin({
        babelHelpers: 'runtime',
        babelrc: false,
        configFile: path.join(configPath, 'babel.config.js'),
        extensions: ['.js', '.cjs', '.mjs']
      }),
      // Convert un-prefixed built-in imports into "node:"" prefixed forms.
      replacePlugin({
        delimiters: ['(?<=(?:require\\(|from\\s*)["\'])', '(?=["\'])'],
        preventAssignment: false,
        values: builtinAliases
      })
    ],
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
    }
  }
}
