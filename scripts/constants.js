'use strict'

const path = require('node:path')

const { includeIgnoreFile } = require('@eslint/compat')
const {
  packageExtensions: yarnPackageExtensions
} = require('@yarnpkg/extensions')

const { compare: localCompare } = new Intl.Collator()

const rootPath = path.resolve(__dirname, '..')
const gitignorePath = path.resolve(rootPath, '.gitignore')

const EMPTY_FILE = '/* empty */\n'
const LICENSE = 'LICENSE'
const MIT = 'MIT'
const NODE_MODULES = 'node_modules'
const NODE_WORKSPACE = 'node_workspace'
const NODE_VERSION = process.versions.node
const NPM_ORG = 'socketregistry'
const NPM_SCOPE = `@${NPM_ORG}`
const PACKAGE_JSON = 'package.json'
const PACKAGE_LOCK = 'package-lock.json'
const PACKAGE_HIDDEN_LOCK = `.${PACKAGE_LOCK}`
const REPO_ORG = 'SocketDev'
const REPO_NAME = 'socket-registry-js'
const VERSION = '1.0.0'

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

const lifecycleScriptNames = new Set(
  [
    'dependencies',
    'prepublishOnly',
    ...[
      'install',
      'pack',
      'prepare',
      'publish',
      'restart',
      'start',
      'stop',
      'version'
    ].map(n => [`pre${n}`, n, `post${n}`])
  ].flat()
)

const lowerToCamelCase = new Map(
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
  ]
    .sort(localCompare)
    .map(v => [v.toLowerCase(), v])
)

const packageExtensions = [
  ...yarnPackageExtensions,
  [
    '@yarnpkg/extensions@>=1.1.0',
    {
      // Properties with undefined values are omitted when saved as JSON.
      peerDependencies: undefined
    }
  ],
  [
    'abab@>=2.0.0',
    {
      devDependencies: {
        // Lower the Webpack from v4.x to one supported by abab's peers.
        webpack: '^3.12.0'
      }
    }
  ],
  [
    'is-generator-function@>=1.0.7',
    {
      scripts: {
        // Make the script a silent no-op.
        'test:uglified': ''
      }
    }
  ]
].sort((a, b) =>
  localCompare(
    a[0].slice(0, a[0].lastIndexOf('@')),
    b[0].slice(0, b[0].lastIndexOf('@'))
  )
)

const tsLibs = new Set([
  'decorators',
  'dom',
  'es5',
  'es6',
  'es2015',
  'es2016',
  'es2017',
  'es2018',
  'es2019',
  'es2020',
  'es2021',
  'es2022',
  'es2023',
  'es2024',
  'esnext',
  'scripthost',
  'webworker'
])

module.exports = {
  EMPTY_FILE,
  LICENSE,
  MIT,
  NODE_MODULES,
  NODE_WORKSPACE,
  NODE_VERSION,
  NPM_ORG,
  NPM_SCOPE,
  PACKAGE_JSON,
  PACKAGE_HIDDEN_LOCK,
  PACKAGE_LOCK,
  REPO_ORG,
  REPO_NAME,
  VERSION,
  ignores,
  lifecycleScriptNames,
  lowerToCamelCase,
  packageExtensions,
  tsLibs
}
