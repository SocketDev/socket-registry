'use strict'

const Module = require('node:module')
// Available in Node v22.8.0.
// https://nodejs.org/docs/latest/api/module.html#moduleenablecompilecachecachedir
if (typeof Module.enableCompileCache === 'function') {
  Module.enableCompileCache()
}
// eslint-disable-next-line import-x/order
const { readdirSync } = require('node:fs')
const path = require('node:path')

const { packageExtensions: yarnPkgExts } = require('@yarnpkg/extensions')
const { createNewSortInstance } = require('fast-sort')
const pacote = require('pacote')
const picomatch = require('picomatch')
const semver = require('semver')
const which = require('which')

const { envAsBoolean, envAsString } = require('./env')

const UNDEFINED_LAZY_VALUE = {}

const { __defineGetter__ } = Object.prototype
const { compare: localeCompare } = new Intl.Collator()
const { execPath } = process
const { sync: whichSync } = which

const { constructor: PacoteFetcherBase } = Reflect.getPrototypeOf(
  pacote.RegistryFetcher.prototype
)
const packumentCache = new Map()
const pacoteCachePath = new PacoteFetcherBase(/*dummy package spec*/ 'x', {})
  .cache

const kInternalsSymbol = Symbol('@socketregistry.constants.internals')
const matcherCache = new Map()

const naturalSort = createNewSortInstance({
  comparer: new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
    .compare
})

const internalsMixin = {
  createConstantsObject,
  createLazyGetter,
  defineLazyGetter,
  defineLazyGetters,
  getGlobMatcher,
  innerReadDirNames,
  isDirEmptySync,
  localeCompare,
  naturalSort,
  objectEntries,
  objectFromEntries,
  readDirNamesSync
}

function createConstantsObject(props, options) {
  const {
    getters = {},
    internals = {},
    mixin
  } = { __proto__: null, ...options }
  const object = defineLazyGetters(
    {
      __proto__: null,
      [kInternalsSymbol]: Object.freeze({
        __proto__: null,
        ...internalsMixin,
        ...internals
      }),
      kInternalsSymbol,
      ...props
    },
    getters
  )
  if (mixin) {
    Object.defineProperties(
      object,
      objectFromEntries(
        objectEntries(Object.getOwnPropertyDescriptors(mixin)).filter(
          p => !Object.hasOwn(object, p[0])
        )
      )
    )
  }
  return Object.freeze(object)
}

function createLazyGetter(getter) {
  let lazyValue = UNDEFINED_LAZY_VALUE
  return () => {
    if (lazyValue === UNDEFINED_LAZY_VALUE) {
      lazyValue = getter()
    }
    return lazyValue
  }
}

function defineLazyGetter(object, propKey, getter) {
  __defineGetter__.call(object, propKey, createLazyGetter(getter))
  return object
}

function defineLazyGetters(object, getterDefObj) {
  if (getterDefObj !== null && typeof getterDefObj === 'object') {
    const keys = Reflect.ownKeys(getterDefObj)
    for (let i = 0, { length } = keys; i < length; i += 1) {
      const key = keys[i]
      defineLazyGetter(object, key, createLazyGetter(getterDefObj[key]))
    }
  }
  return object
}

function getGlobMatcher(glob, options) {
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

function innerReadDirNames(dirents, options) {
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
  return sort ? names.sort(localeCompare) : names
}

function isDirEmptySync(dirname) {
  try {
    const files = readdirSync(dirname)
    const { length } = files
    if (length === 0) {
      return true
    }
    // Lazily access constants.ignoreGlobs.
    const matcher = getGlobMatcher(constants.ignoreGlobs, { cwd: dirname })
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

function objectEntries(obj) {
  if (obj === null || obj === undefined) {
    return []
  }
  const entries = Object.entries(obj)
  const symbols = Object.getOwnPropertySymbols(obj)
  for (let i = 0, { length } = symbols; i < length; i += 1) {
    const symbol = symbols[i]
    entries.push([symbol, obj[symbol]])
  }
  return entries
}

function objectFromEntries(entries) {
  const keyEntries = []
  const symbolEntries = []
  for (let i = 0, { length } = entries; i < length; i += 1) {
    const entry = entries[i]
    if (typeof entry[0] === 'symbol') {
      symbolEntries.push(entry)
    } else {
      keyEntries.push(entry)
    }
  }
  const object = Object.fromEntries(keyEntries)
  for (let i = 0, { length } = symbolEntries; i < length; i += 1) {
    const entry = symbolEntries[i]
    object[entry[0]] = entry[1]
  }
  return object
}

function readDirNamesSync(dirname, options) {
  try {
    return innerReadDirNames(
      readdirSync(dirname, { withFileTypes: true }),
      options
    )
  } catch {}
  return []
}

const COLUMN_LIMIT = 80
const EMPTY_FILE = '/* empty */\n'
const ENV = Object.freeze({
  __proto__: null,
  // CI is always set to "true" in a GitHub action.
  // https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables#default-environment-variables
  CI: envAsBoolean(process.env.CI),
  // .github/workflows/provenance.yml defines this.
  NODE_AUTH_TOKEN: envAsString(process.env.NODE_AUTH_TOKEN),
  // PRE_COMMIT is set to "1" by our "test-pre-commit" script run by the
  // .husky/pre-commit hook.
  PRE_COMMIT: envAsBoolean(process.env.PRE_COMMIT)
})
const ESLINT_CONFIG_JS = 'eslint.config.js'
const ESNEXT = 'esnext'
const LATEST = 'latest'
const LICENSE = 'LICENSE'
const LICENSE_GLOB = 'LICEN[CS]E{[.-]*,}'
const LICENSE_GLOB_RECURSIVE = `**/${LICENSE_GLOB}`
const LICENSE_ORIGINAL = `${LICENSE}.original`
const LICENSE_ORIGINAL_GLOB = '*.original{.*,}'
const LICENSE_ORIGINAL_GLOB_RECURSIVE = `**/${LICENSE_ORIGINAL_GLOB}`
const LOOP_SENTINEL = 1_000_000
const GIT_IGNORE = '.gitignore'
const MANIFEST_JSON = 'manifest.json'
const MIT = 'MIT'
const NODE_MODULES = 'node_modules'
const NODE_MODULES_GLOB_RECURSIVE = `**/${NODE_MODULES}`
const NODE_WORKSPACES = 'node_workspaces'
const NODE_VERSION = process.versions.node
const NPM_ORG = 'socketregistry'
const OVERRIDES = 'overrides'
const PACKAGE_DEFAULT_SOCKET_CATEGORIES = Object.freeze(['cleanup'])
const PACKAGE_DEFAULT_VERSION = '1.0.0'
const PACKAGE_JSON = 'package.json'
const PACKAGE_LOCK = 'package-lock.json'
const PACKAGE_SCOPE = `@${NPM_ORG}`
const PRETTIER_IGNORE = '.prettierignore'
const PRETTIER_RC = '.prettierrc'
const README_GLOB = 'README{.*,}'
const README_GLOB_RECURSIVE = `**/${README_GLOB}`
const README_MD = 'README.md'
const REGISTRY_SCOPE_DELIMITER = '__'
const REGISTRY_WORKSPACE = 'registry'
const REPO_ORG = 'SocketDev'
const REPO_NAME = 'socket-registry'
const TEMPLATE_CJS = 'cjs'
const TEMPLATE_CJS_BROWSER = 'cjs-browser'
const TEMPLATE_CJS_ESM = 'cjs-esm'
const TEMPLATE_ES_SHIM_CONSTRUCTOR = 'es-shim-constructor'
const TEMPLATE_ES_SHIM_PROTOTYPE_METHOD = 'es-shim-prototype-method'
const TEMPLATE_ES_SHIM_STATIC_METHOD = 'es-shim-static-method'
const TSCONFIG_JSON = 'tsconfig.json'
const UNLICENCED = 'UNLICENCED'
const UNLICENSED = 'UNLICENSED'
const WIN_32 = process.platform === 'win32'

const LAZY_PACKAGE_DEFAULT_NODE_RANGE = () =>
  // Lazily access constants.maintainedNodeVersions.
  `>=${constants.maintainedNodeVersions.previous}`

// https://nodejs.org/api/all.html#all_cli_--disable-warningcode-or-type
const LAZY_SUPPORTS_NODE_DISABLE_WARNING_FLAG = () =>
  semver.satisfies(NODE_VERSION, '>=21.3.0||^20.11.0')

// https://nodejs.org/api/all.html#all_cli_--run
const LAZY_SUPPORTS_NODE_RUN = () => semver.satisfies(NODE_VERSION, '>=22.3.0')

// https://nodejs.org/docs/latest-v22.x/api/all.html#all_cli_--experimental-require-module
const LAZY_SUPPORTS_NODE_REQUIRE_MODULE = () =>
  semver.satisfies(NODE_VERSION, '>=22.12')

const lazyMaintainedNodeVersions = () => {
  // Under the hood browserlist uses the node-releases package which is out of date:
  // https://github.com/chicoxyzzy/node-releases/issues/37
  // So we maintain a manual version list for now.
  // https://nodejs.org/en/about/previous-releases#looking-for-latest-release-of-a-version-branch
  const manualPrev = '18.20.4'
  const manualCurr = '20.18.0'
  const manualNext = '22.10.0'

  // Defer loading browserslist until needed.
  const browserslist = require('browserslist')
  const query = naturalSort(
    browserslist('maintained node versions')
      // Trim value, e.g. 'node 22.5.0' to '22.5.0'.
      .map(s => s.slice(5 /*'node '.length*/))
  ).asc()
  const queryPrev = query.at(0) ?? manualPrev
  const queryCurr = query.at(1) ?? manualCurr
  const queryNext = query.at(2) ?? manualNext

  const previous = semver.maxSatisfying(
    [queryPrev, manualPrev],
    `^${semver.major(queryPrev)}`
  )
  const current = semver.maxSatisfying(
    [queryCurr, manualCurr],
    `^${semver.major(queryCurr)}`
  )
  const next = semver.maxSatisfying(
    [queryNext, manualNext],
    `^${semver.major(queryNext)}`
  )
  return Object.freeze(
    Object.assign([previous, current, next], {
      previous,
      current,
      next
    })
  )
}

const lazyNpmExecPath = () => whichSync('npm')

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

const ignoreGlobs = Object.freeze([
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
  // Inline .gitignore from the socket-registry repository root.
  '.env',
  '.eslintcache',
  '.nvm',
  '.tap',
  '.tapci.yaml',
  '.vscode',
  'npm-debug.log',
  '*.tsbuildinfo',
  '**/.DS_Store',
  '**/._.DS_Store',
  '**/Thumbs.db'
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

const parseArgsConfig = Object.freeze({
  __proto__: null,
  options: {
    __proto__: null,
    force: {
      __proto__: null,
      type: 'boolean',
      short: 'f'
    },
    quiet: {
      __proto__: null,
      type: 'boolean'
    }
  },
  strict: false
})

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
    localeCompare(
      a[0].slice(0, a[0].lastIndexOf('@')),
      b[0].slice(0, b[0].lastIndexOf('@'))
    )
  )
)

const skipTestsByEcosystem = Object.freeze({
  __proto__: null,
  npm: new Set([
    // @hyrious/bun.lockb has no unit tests.
    // https://github.com/hyrious/bun.lockb/tree/v0.0.4
    '@hyrious/bun.lockb',
    'hyrious__bun.lockb',
    // Our array-flatten override supports v1, v2, and v3 APIs, so we handle
    // testing ourselves.
    'array-flatten',
    // date tests fail for some Node versions and platforms, but pass in CI
    // Win32 environments for the time being.
    // https://github.com/es-shims/Date/issues/3
    // https://github.com/es-shims/Date/tree/v2.0.5
    ...(ENV.WIN_32 ? [] : ['date']),
    // es6-object-assign has no unit tests.
    // https://github.com/rubennorte/es6-object-assign/tree/v1.1.0
    'es6-object-assign',
    // harmony-reflect has known failures in its package and requires running
    // tests in browser.
    // https://github.com/tvcutsem/harmony-reflect/tree/v1.6.2/test
    'harmony-reflect',
    // is-regex tests don't account for `is-regex` backed by
    // `require('node:util/types).isRegExp` which triggers no proxy traps and
    // assumes instead that the "getOwnPropertyDescriptor" trap will be triggered
    // by `Object.getOwnPropertyDescriptor(value, 'lastIndex')`.
    // https://github.com/inspect-js/is-regex/issues/35
    // https://github.com/inspect-js/is-regex/blob/v1.1.4/test/index.js
    'is-regex',
    // safer-buffer tests assume Buffer.alloc, Buffer.allocUnsafe, and
    // Buffer.allocUnsafeSlow throw for a size of 2 * (1 << 30), i.e. 2147483648,
    // which is no longer the case.
    // https://github.com/ChALkeR/safer-buffer/issues/16
    // https://github.com/ChALkeR/safer-buffer/blob/v2.1.2/tests.js
    'safer-buffer'
  ])
})

const tsLibsAvailable = new Set([
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

const tsTypesAvailable = new Set(['node'])

const win32EnsureTestsByEcosystem = Object.freeze({
  __proto__: null,
  npm: new Set(['date'])
})

const constants = createConstantsObject(
  {
    COLUMN_LIMIT,
    EMPTY_FILE,
    ENV,
    ESLINT_CONFIG_JS,
    ESNEXT,
    GIT_IGNORE,
    LATEST,
    LICENSE,
    LICENSE_GLOB,
    LICENSE_GLOB_RECURSIVE,
    LICENSE_ORIGINAL,
    LICENSE_ORIGINAL_GLOB,
    LICENSE_ORIGINAL_GLOB_RECURSIVE,
    LOOP_SENTINEL,
    MANIFEST_JSON,
    MIT,
    NODE_MODULES,
    NODE_MODULES_GLOB_RECURSIVE,
    NODE_WORKSPACES,
    NODE_VERSION,
    NPM_ORG,
    OVERRIDES,
    PACKAGE_DEFAULT_SOCKET_CATEGORIES,
    // Lazily defined values are initialized as `undefined` to keep their key order.
    PACKAGE_DEFAULT_NODE_RANGE: undefined,
    PACKAGE_DEFAULT_VERSION,
    PACKAGE_JSON,
    PACKAGE_LOCK,
    PACKAGE_SCOPE,
    PRETTIER_IGNORE,
    PRETTIER_RC,
    README_GLOB,
    README_GLOB_RECURSIVE,
    README_MD,
    REGISTRY_SCOPE_DELIMITER,
    REGISTRY_WORKSPACE,
    REPO_ORG,
    REPO_NAME,
    SUPPORTS_NODE_DISABLE_WARNING_FLAG: undefined,
    SUPPORTS_NODE_REQUIRE_MODULE: undefined,
    SUPPORTS_NODE_RUN: undefined,
    TEMPLATE_CJS,
    TEMPLATE_CJS_BROWSER,
    TEMPLATE_CJS_ESM,
    TEMPLATE_ES_SHIM_CONSTRUCTOR,
    TEMPLATE_ES_SHIM_PROTOTYPE_METHOD,
    TEMPLATE_ES_SHIM_STATIC_METHOD,
    TSCONFIG_JSON,
    UNLICENCED,
    UNLICENSED,
    WIN_32,
    copyLeftLicenses,
    execPath,
    ignoreGlobs,
    lifecycleScriptNames,
    maintainedNodeVersions: undefined,
    npmExecPath: undefined,
    packageExtensions,
    packumentCache,
    pacoteCachePath,
    parseArgsConfig,
    skipTestsByEcosystem,
    tsLibsAvailable,
    tsTypesAvailable,
    win32EnsureTestsByEcosystem
  },
  {
    getters: {
      PACKAGE_DEFAULT_NODE_RANGE: LAZY_PACKAGE_DEFAULT_NODE_RANGE,
      SUPPORTS_NODE_DISABLE_WARNING_FLAG:
        LAZY_SUPPORTS_NODE_DISABLE_WARNING_FLAG,
      SUPPORTS_NODE_REQUIRE_MODULE: LAZY_SUPPORTS_NODE_REQUIRE_MODULE,
      SUPPORTS_NODE_RUN: LAZY_SUPPORTS_NODE_RUN,
      maintainedNodeVersions: lazyMaintainedNodeVersions,
      npmExecPath: lazyNpmExecPath
    }
  }
)
module.exports = constants
