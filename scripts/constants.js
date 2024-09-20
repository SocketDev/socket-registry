'use strict'

const path = require('node:path')

const { includeIgnoreFile } = require('@eslint/compat')
const { packageExtensions: yarnPkgExts } = require('@yarnpkg/extensions')
const browserslist = require('browserslist')
const { createNewSortInstance } = require('fast-sort')
const fs = require('fs-extra')
const semver = require('semver')
const which = require('which')

const EMPTY_FILE = '/* empty */\n'
const LICENSE = 'LICENSE'
const LICENSE_GLOB_PATTERN = 'LICEN[CS]E{.*,}'
const MIT = 'MIT'
const NODE_MODULES = 'node_modules'
const NODE_WORKSPACES = 'node_workspaces'
const NODE_VERSION = process.versions.node
const NPM_ORG = 'socketregistry'
const NPM_SCOPE = `@${NPM_ORG}`
const PACKAGE_JSON = 'package.json'
const PACKAGE_LOCK = 'package-lock.json'
const PACKAGE_HIDDEN_LOCK = `.${PACKAGE_LOCK}`
const README_GLOB_PATTERN = 'README{.*,}'
const REPO_ORG = 'SocketDev'
const REPO_NAME = 'socket-registry-js'
const VERSION = '1.0.0'

const rootPath = path.resolve(__dirname, '..')
const rootLicensePath = path.join(rootPath, LICENSE)
const rootManifestJsonPath = path.join(rootPath, 'manifest.json')
const rootNodeModulesPath = path.join(rootPath, NODE_MODULES)
const rootNodeModulesBinPath = path.join(rootNodeModulesPath, '.bin')
const rootPackageJsonPath = path.join(rootPath, PACKAGE_JSON)
const rootPackageLockPath = path.join(rootPath, PACKAGE_LOCK)
const rootPackagesPath = path.join(rootPath, 'packages')

const { execPath } = process
const gitignorePath = path.resolve(rootPath, '.gitignore')
const prettierignorePath = path.resolve(rootPath, '.prettierignore')
const templatesPath = path.join(__dirname, 'templates')

const npmPackagesPath = path.join(rootPackagesPath, 'npm')
const npmTemplatesPath = path.join(templatesPath, 'npm')

const testNpmPath = path.join(rootPath, 'test/npm')
const testNpmPkgJsonPath = path.join(testNpmPath, PACKAGE_JSON)
const testNpmPkgLockPath = path.join(testNpmPath, PACKAGE_LOCK)
const testNpmNodeModulesPath = path.join(testNpmPath, NODE_MODULES)
const testNpmNodeModulesHiddenLockPath = path.join(
  testNpmNodeModulesPath,
  PACKAGE_HIDDEN_LOCK
)
const testNpmNodeWorkspacesPath = path.join(testNpmPath, NODE_WORKSPACES)

const yarnPkgExtsPath = path.join(rootNodeModulesPath, '@yarnpkg/extensions')
const yarnPkgExtsJsonPath = path.join(yarnPkgExtsPath, PACKAGE_JSON)

const relPackagesPath = path.relative(rootPath, rootPackagesPath)
const relNpmPackagesPath = path.relative(rootPath, npmPackagesPath)
const relTestNpmPath = path.relative(rootPath, testNpmPath)
const relTestNpmNodeModulesPath = path.relative(
  rootPath,
  testNpmNodeModulesPath
)

const LICENSE_CONTENT = fs.readFileSync(rootLicensePath, 'utf8')

const { compare: localCompare } = new Intl.Collator()

const innerReadDirNames = (dirents, options) => {
  const opts = { sort: true, ...options }
  const names = dirents.filter(d => d.isDirectory()).map(d => d.name)
  return opts.sort ? names.sort(localCompare) : names
}

const naturalSort = createNewSortInstance({
  comparer: new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
    .compare
})

const readDirNamesSync = (dirname, options) =>
  innerReadDirNames(fs.readdirSync(dirname, { withFileTypes: true }), options)

const whichSyncOptions = {
  path: `${rootNodeModulesBinPath}${path.delimiter}${process.env.PATH}`
}
const whichSync = cmd => which.sync(cmd, whichSyncOptions)

const npmExecPath = whichSync('npm')
const runScriptParallelExecPath = whichSync('run-p')
const runScriptSequentiallyExecPath = whichSync('run-s')

const ecosystems = Object.freeze(readDirNamesSync(rootPackagesPath))

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

const maintainedNodeVersions = (() => {
  const query = naturalSort(
    browserslist('maintained node versions')
      // Trim value, e.g. 'node 22.5.0' to '22.5.0'.
      .map(s => s.slice(5))
  ).desc()
  // Under the hood browserlist uses the node-releases package which is out of date:
  // https://github.com/chicoxyzzy/node-releases/issues/37
  // So we maintain a manual version list for now.
  const manualNext = '22.8.0'
  const manualCurr = '20.17.0'
  const manualPrev = '18.20.4'

  const queryNext = query.at(0)
  const queryCurr = query.at(1)
  const queryPrev = query.at(-1)

  const next = semver.maxSatisfying(
    [queryNext, manualNext],
    `^${semver.major(queryNext)}`
  )
  const curr = semver.maxSatisfying(
    [queryCurr, manualCurr],
    `^${semver.major(queryCurr)}`
  )
  const prev = semver.maxSatisfying(
    [queryPrev, manualPrev],
    `^${semver.major(queryPrev)}`
  )
  return new Map([
    ['next', next],
    ['current', curr],
    ['previous', prev],
    ...[next, curr, prev].map(v => [semver.major(v), v])
  ])
})()

const packageExtensions = Object.freeze(
  [
    ...yarnPkgExts,
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
)

const npmPackageNames = Object.freeze(readDirNamesSync(npmPackagesPath))

const tsLibs = new Set([
  // Defined in priority order.
  'esnext',
  'es2024',
  'es2023',
  'dom',
  'webworker',
  'es2022',
  'es2021',
  'es2020',
  'es2019',
  'es2018',
  'es2017',
  'es2016',
  'es2015',
  'es6',
  'es5',
  'decorators',
  'scripthost'
])

module.exports = {
  EMPTY_FILE,
  LICENSE,
  LICENSE_CONTENT,
  LICENSE_GLOB_PATTERN,
  MIT,
  NODE_MODULES,
  NODE_WORKSPACES,
  NODE_VERSION,
  NPM_ORG,
  NPM_SCOPE,
  PACKAGE_JSON,
  PACKAGE_HIDDEN_LOCK,
  PACKAGE_LOCK,
  README_GLOB_PATTERN,
  REPO_ORG,
  REPO_NAME,
  VERSION,
  ecosystems,
  execPath,
  ignores,
  innerReadDirNames,
  gitignorePath,
  lifecycleScriptNames,
  localCompare,
  lowerToCamelCase,
  maintainedNodeVersions,
  naturalSort,
  npmExecPath,
  npmPackageNames,
  npmPackagesPath,
  npmTemplatesPath,
  packageExtensions,
  prettierignorePath,
  relPackagesPath,
  relNpmPackagesPath,
  relTestNpmPath,
  relTestNpmNodeModulesPath,
  rootPath,
  rootLicensePath,
  rootManifestJsonPath,
  rootNodeModulesPath,
  rootPackageJsonPath,
  rootPackageLockPath,
  rootPackagesPath,
  runScriptParallelExecPath,
  runScriptSequentiallyExecPath,
  templatesPath,
  testNpmPath,
  testNpmPkgJsonPath,
  testNpmPkgLockPath,
  testNpmNodeModulesPath,
  testNpmNodeModulesHiddenLockPath,
  testNpmNodeWorkspacesPath,
  tsLibs,
  yarnPkgExtsPath,
  yarnPkgExtsJsonPath
}
