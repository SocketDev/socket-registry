'use strict'

const path = require('node:path')

const { includeIgnoreFile } = require('@eslint/compat')
const { packageExtensions: yarnPkgExts } = require('@yarnpkg/extensions')
const browserslist = require('browserslist')
const { createNewSortInstance } = require('fast-sort')
const fs = require('fs-extra')
const pacote = require('pacote')
const picomatch = require('picomatch')
const semver = require('semver')
const whichFn = require('which')
const { sync: whichSyncFn } = whichFn

const { constructor: PacoteFetcherBase } = Reflect.getPrototypeOf(
  pacote.RegistryFetcher.prototype
)
const packumentCache = new Map()

function envAsBool(value) {
  return (
    typeof value === 'string' &&
    (value === '1' || value.toLowerCase() === 'true')
  )
}

const EMPTY_FILE = '/* empty */\n'
const ENV = Object.freeze({
  // CI is always set to "true" in a GitHub action.
  // https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables#default-environment-variables
  CI: envAsBool(process.env.CI),
  // PRE_COMMIT is set to "1" by our "test-pre-commit" script run by the
  // .husky/pre-commit hook.
  PRE_COMMIT: envAsBool(process.env.PRE_COMMIT)
})
const LICENSE = 'LICENSE'
const LICENSE_GLOB = 'LICEN[CS]E{.*,}'
const LICENSE_GLOB_RECURSIVE = `**/${LICENSE_GLOB}`
const LICENSE_ORIGINAL_GLOB = '*.original{.*,}'
const LICENSE_ORIGINAL_GLOB_RECURSIVE = `**/${LICENSE_ORIGINAL_GLOB}`
const LOOP_SENTINEL = 1_000_000
const MIT = 'MIT'
const NODE_MODULES = 'node_modules'
const NODE_WORKSPACES = 'node_workspaces'
const NODE_VERSION = process.versions.node
const NPM_ORG = 'socketregistry'
const NPM_SCOPE = `@${NPM_ORG}`
const OVERRIDES = 'overrides'
const PACKAGE_JSON = 'package.json'
const PACKAGE_LOCK = 'package-lock.json'
const PACKAGE_HIDDEN_LOCK = `.${PACKAGE_LOCK}`
const README_GLOB_PATTERN = 'README{.*,}'
const REPO_ORG = 'SocketDev'
const REPO_NAME = 'socket-registry-js'
const TSCONFIG_JSON = 'tsconfig.json'
const UNLICENCED = 'UNLICENCED'
const UNLICENSED = 'UNLICENSED'
const VERSION = '1.0.0'

const rootPath = path.resolve(__dirname, '..')
const rootLicensePath = path.join(rootPath, LICENSE)
const rootManifestJsonPath = path.join(rootPath, 'manifest.json')
const rootNodeModulesPath = path.join(rootPath, NODE_MODULES)
const rootNodeModulesBinPath = path.join(rootNodeModulesPath, '.bin')
const rootPackageJsonPath = path.join(rootPath, PACKAGE_JSON)
const rootPackageLockPath = path.join(rootPath, PACKAGE_LOCK)
const rootPackagesPath = path.join(rootPath, 'packages')
const rootTsConfigPath = path.join(rootPath, TSCONFIG_JSON)

const { execPath } = process
const gitignorePath = path.resolve(rootPath, '.gitignore')
const pacoteCachePath = new PacoteFetcherBase(/*dummy package spec*/ 'x', {})
  .cache
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

const { compare: localCompare } = new Intl.Collator()

const naturalSort = createNewSortInstance({
  comparer: new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
    .compare
})

const innerReadDirNames = function innerReadDirNames(dirents, options) {
  const { includeEmpty, sort } = {
    __proto__: null,
    sort: true,
    includeEmpty: false,
    ...options
  }
  const names = dirents
    .filter(
      d =>
        d.isDirectory() &&
        (includeEmpty || !isDirEmptySync(path.join(d.parentPath, d.name)))
    )
    .map(d => d.name)
  return sort ? names.sort(localCompare) : names
}

const matcherCache = new Map()

const getGlobMatcher = function getGlobMatcher(glob, options) {
  const patterns = Array.isArray(glob) ? glob : [glob]
  const key = JSON.stringify({ patterns, options })
  let matcher = matcherCache.get(key)
  if (matcher) {
    return matcher
  }
  matcher = picomatch(patterns, {
    dot: true,
    nocase: true,
    ...options
  })
  matcherCache.set(key, matcher)
  return matcher
}

const isDirEmptySync = function isDirEmptySync(dirname) {
  try {
    const files = fs.readdirSync(dirname)
    const { length } = files
    if (length === 0) {
      return true
    }
    const matcher = getGlobMatcher(ignores, { cwd: dirname })
    let ignoredCount = 0
    for (let i = 0; i < length; i += 1) {
      if (matcher(files[i])) {
        ignoredCount += 1
      }
    }
    return ignoredCount === length
  } catch (e) {
    return e?.code === 'ENOENT'
  }
}

const readDirNamesSync = function readDirNamesSync(dirname, options) {
  return innerReadDirNames(
    fs.readdirSync(dirname, { withFileTypes: true }),
    options
  )
}

const defaultWhichOptions = {
  __proto__: null,
  path: `${rootNodeModulesBinPath}${path.delimiter}${process.env.PATH}`
}

const which = function which(cmd, options) {
  return whichFn(cmd, { __proto__: null, ...defaultWhichOptions, ...options })
}

const whichSync = function whichSync(cmd, options) {
  return whichSyncFn(cmd, {
    __proto__: null,
    ...defaultWhichOptions,
    ...options
  })
}

const kInternalsSymbol = Symbol('@socketregistry.constants.internals')

const internals = Object.freeze({
  getGlobMatcher,
  innerReadDirNames,
  isDirEmptySync,
  localCompare,
  naturalSort,
  readDirNamesSync,
  which,
  whichSync
})

const gitExecPath = whichSync('git')
const npmExecPath = whichSync('npm')
const runScriptParallelExecPath = whichSync('run-p')
const runScriptSequentiallyExecPath = whichSync('run-s')

const copyLeftLicenses = new Set([
  'AGPL-3.0-or-later',
  'AGPL-3.0',
  'AGPL-3.0-only',
  'AGPL-1.0-or-later',
  'AGPL-1.0',
  'AGPL-1.0-only',
  'CC-BY-SA-4.0',
  'CC-BY-SA-3.0',
  'CC-BY-SA-2.0',
  'CC-BY-SA-1.0',
  'EPL-2.0',
  'EPL-1.0',
  'EUPL-1.2',
  'EUPL-1.1',
  'GPL-3.0-or-later',
  'GPL-3.0',
  'GPL-3.0-only',
  'GPL-2.0-or-later',
  'GPL-2.0',
  'GPL-2.0-only',
  'GPL-1.0-or-later',
  'GPL-1.0',
  'GPL-1.0-only'
])

const ecosystems = Object.freeze(readDirNamesSync(rootPackagesPath))

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

const PACKAGE_ENGINES_NODE_RANGE = `>=${maintainedNodeVersions.get('previous')}`

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
  [kInternalsSymbol]: internals,
  EMPTY_FILE,
  ENV,
  LICENSE,
  LICENSE_CONTENT,
  LICENSE_GLOB,
  LICENSE_GLOB_RECURSIVE,
  LICENSE_ORIGINAL_GLOB,
  LICENSE_ORIGINAL_GLOB_RECURSIVE,
  LOOP_SENTINEL,
  MIT,
  NODE_MODULES,
  NODE_WORKSPACES,
  NODE_VERSION,
  NPM_ORG,
  NPM_SCOPE,
  OVERRIDES,
  PACKAGE_ENGINES_NODE_RANGE,
  PACKAGE_JSON,
  PACKAGE_HIDDEN_LOCK,
  PACKAGE_LOCK,
  README_GLOB_PATTERN,
  REPO_ORG,
  REPO_NAME,
  TSCONFIG_JSON,
  UNLICENCED,
  UNLICENSED,
  VERSION,
  copyLeftLicenses,
  ecosystems,
  execPath,
  gitExecPath,
  gitignorePath,
  ignores,
  kInternalsSymbol,
  lifecycleScriptNames,
  lowerToCamelCase,
  maintainedNodeVersions,
  npmExecPath,
  npmPackageNames,
  npmPackagesPath,
  npmTemplatesPath,
  packageExtensions,
  packumentCache,
  pacoteCachePath,
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
  rootTsConfigPath,
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
