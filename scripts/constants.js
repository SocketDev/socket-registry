'use strict'

const path = require('node:path')

const { includeIgnoreFile } = require('@eslint/compat')

const rootPath = path.resolve(__dirname, '..')
const gitignorePath = path.resolve(rootPath, '.gitignore')

const ignores = Object.freeze([
  ...new Set([
    // Most of these ignored files can be included specifically if included in the
    // files globs. Exceptions to this are:
    // https://docs.npmjs.com/cli/v10/configuring-npm/package-json#files
    // These can not be included.
    '.git',
    '.npmrc',
    '**/node_modules',
    '**/package-lock.json',
    '**/pnpm-lock.ya?ml',
    '**/yarn.lock',
    ...includeIgnoreFile(gitignorePath).ignores
  ])
])

const lowerToCamelCase = Object.freeze(
  [
    'AggregateError',
    'allSettled',
    'ArrayBuffer',
    'codePointAt',
    'endsWith',
    'findLast',
    'findLastIndex',
    'flatMap',
    'forEach',
    'fromCodePoint',
    'fromEntries',
    'getOwnPropertyDescriptors',
    'getPrototypeOf',
    'globalThis',
    'groupBy',
    'hasOwn',
    'matchAll',
    'ownKeys',
    'padEnd',
    'padStart',
    'RegExp',
    'replaceAll',
    'startsWith',
    'toSorted',
    'toReversed',
    'trimEnd',
    'trimLeft',
    'trimRight',
    'trimStart',
    'TypedArray'
  ].reduce(
    (o, v) => {
      o[v.toLowerCase()] = v
      return o
    },
    { __proto__: null }
  )
)

module.exports = {
  ignores,
  lowerToCamelCase
}
