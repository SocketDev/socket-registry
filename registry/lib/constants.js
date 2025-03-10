'use strict'

// The 'signal-exit' package is browser safe.
// Do NOT defer loading, otherwise mystery errors may occur at the end of the
// event loop.
const signalExit = /*@__PURE__*/ require('signal-exit')

let _browserList
/*@__NO_SIDE_EFFECTS__*/
function getBrowserList() {
  if (_browserList === undefined) {
    _browserList = /*@__PURE__*/ require('browserslist')
  }
  return _browserList
}

let _fs
/*@__NO_SIDE_EFFECTS__*/
function getFs() {
  if (_fs === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _fs = /*@__PURE__*/ require('fs')
  }
  return _fs
}

let _pacote
/*@__NO_SIDE_EFFECTS__*/
function getPacote() {
  if (_pacote === undefined) {
    _pacote = /*@__PURE__*/ require('pacote')
  }
  return _pacote
}

let _process
/*@__NO_SIDE_EFFECTS__*/
function getProcess() {
  if (_process === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _process = /*@__PURE__*/ require('process')
  }
  return _process
}

let _semver
/*@__NO_SIDE_EFFECTS__*/
function getSemver() {
  if (_semver === undefined) {
    // The 'semver' package is browser safe.
    _semver = /*@__PURE__*/ require('semver')
  }
  return _semver
}

let _which
/*@__NO_SIDE_EFFECTS__*/
function getWhich() {
  if (_which === undefined) {
    _which = /*@__PURE__*/ require('which')
  }
  return _which
}

let _yarnPkgExtensions
/*@__NO_SIDE_EFFECTS__*/
function getYarnPkgExtensions() {
  if (_yarnPkgExtensions === undefined) {
    // The '@yarnpkg/extensions' package is browser safe.
    _yarnPkgExtensions =
      /*@__PURE__*/ require('@yarnpkg/extensions').packageExtensions
  }
  return _yarnPkgExtensions
}

const abortController = new AbortController()

const { signal: abortSignal } = abortController

/*@__PURE__*/
;(() => {
  // By manually setting `kMaxEventTargetListeners` on `abortSignal` we avoid:
  //   TypeError [ERR_INVALID_ARG_TYPE]: The "emitter" argument must be an
  //   instance of EventEmitter or EventTarget. Received an instance of
  //   AbortSignal
  //
  // in some patch releases of Node 18-23 when calling events.getMaxListeners(abortSignal).
  // See https://github.com/nodejs/node/pull/56807.
  //
  // Instead of calling events.setMaxListeners(10, abortSignal) we set the symbol
  // property directly to keep the constants initialization platform agnostic and
  // not rely on the Node specific 'node:events' module up front.
  const symbols = Object.getOwnPropertySymbols(abortSignal)
  const kMaxEventTargetListeners = symbols.find(
    s => s.description === 'events.maxEventTargetListeners'
  )
  if (kMaxEventTargetListeners) {
    // The default events.defaultMaxListeners value is 10.
    // https://nodejs.org/api/events.html#eventsdefaultmaxlisteners
    abortSignal[kMaxEventTargetListeners] = 10
  }
})()

// Detect ^C, i.e. Ctrl + C.
signalExit.onExit(() => {
  abortController.abort()
})

const LATEST = 'latest'
const PACKAGE_LOCK_JSON = 'package-lock.json'

const AT_LATEST = `@${LATEST}`
const BIOME_JSON = 'biome.json'
const CI = 'CI'
const COLUMN_LIMIT = 80
const EMPTY_FILE = '/* empty */\n'
const ESLINT_CONFIG_JS = 'eslint.config.js'
const ESNEXT = 'esnext'
const EXTENSIONS = 'extensions'
const EXTENSIONS_JSON = `${EXTENSIONS}.json`
const HIDDEN_PACKAGE_LOCK_JSON = `.${PACKAGE_LOCK_JSON}`
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
const NODE_AUTH_TOKEN = 'NODE_AUTH_TOKEN'
const NODE_ENV = 'NODE_ENV'
const NODE_MODULES = 'node_modules'
const NODE_MODULES_GLOB_RECURSIVE = `**/${NODE_MODULES}`
const NODE_WORKSPACES = 'node_workspaces'
const NPM = 'npm'
const NPX = 'npx'
const OVERRIDES = 'overrides'
const PACKAGE_DEFAULT_SOCKET_CATEGORIES = Object.freeze(['cleanup'])
const PACKAGE_DEFAULT_VERSION = '1.0.0'
const PACKAGE_JSON = 'package.json'
const PRE_COMMIT = 'PRE_COMMIT'
const README_GLOB = 'README{.*,}'
const README_GLOB_RECURSIVE = `**/${README_GLOB}`
const README_MD = 'README.md'
const REGISTRY = 'registry'
const REGISTRY_SCOPE_DELIMITER = '__'
const RESOLUTIONS = 'resolutions'
const SOCKET_GITHUB_ORG = 'SocketDev'
const SOCKET_IPC_HANDSHAKE = 'SOCKET_IPC_HANDSHAKE'
const SOCKET_OVERRIDE_SCOPE = '@socketoverride'
const SOCKET_PUBLIC_API_TOKEN =
  'sktsec_t_--RAN5U4ivauy4w37-6aoKyYPDt5ZbaT5JBVMqiwKo_api'
const SOCKET_PUBLIC_API_KEY = SOCKET_PUBLIC_API_TOKEN
const SOCKET_SECURITY_SCOPE = '@socketsecurity'
const SOCKET_REGISTRY_NPM_ORG = 'socketregistry'
const SOCKET_REGISTRY_SCOPE = `@${SOCKET_REGISTRY_NPM_ORG}`
const SOCKET_REGISTRY_PACKAGE_NAME = `${SOCKET_SECURITY_SCOPE}/registry`
const SOCKET_REGISTRY_REPO_NAME = 'socket-registry'
const TAP = 'TAP'
const TEMPLATE_CJS = 'cjs'
const TEMPLATE_CJS_BROWSER = 'cjs-browser'
const TEMPLATE_CJS_ESM = 'cjs-esm'
const TEMPLATE_ES_SHIM_CONSTRUCTOR = 'es-shim-constructor'
const TEMPLATE_ES_SHIM_PROTOTYPE_METHOD = 'es-shim-prototype-method'
const TEMPLATE_ES_SHIM_STATIC_METHOD = 'es-shim-static-method'
const TSCONFIG_JSON = 'tsconfig.json'
const UNDEFINED_TOKEN = {}
const UNLICENCED = 'UNLICENCED'
const UNLICENSED = 'UNLICENSED'
const VITEST = 'VITEST'

const { __defineGetter__ } = Object.prototype

const packumentCache = new Map()

const kInternalsSymbol = Symbol(`${SOCKET_REGISTRY_SCOPE}.constants.internals`)

const internalsMixin = {
  createConstantsObject,
  getIPC
}

/*@__NO_SIDE_EFFECTS__*/
function createConstantsObject(props, options) {
  const {
    getters = {},
    internals = {},
    mixin
  } = { __proto__: null, ...options }
  const lazyGetterStats = { initialized: new Set() }
  const object = defineLazyGetters(
    {
      __proto__: null,
      [kInternalsSymbol]: Object.freeze({
        __proto__: null,
        get lazyGetterStats() {
          return lazyGetterStats
        },
        ...internalsMixin,
        ...internals
      }),
      kInternalsSymbol,
      ...props
    },
    getters,
    lazyGetterStats
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

/*@__NO_SIDE_EFFECTS__*/
function createLazyGetter(name, getter, stats) {
  let lazyValue = UNDEFINED_TOKEN
  // Dynamically name the getter without using Object.defineProperty.
  const { [name]: lazyGetter } = {
    [name]() {
      if (lazyValue === UNDEFINED_TOKEN) {
        stats?.initialized?.add(name)
        lazyValue = getter()
      }
      return lazyValue
    }
  }
  return lazyGetter
}

/*@__NO_SIDE_EFFECTS__*/
function defineGetter(object, propKey, getter) {
  __defineGetter__.call(object, propKey, getter)
  return object
}

/*@__NO_SIDE_EFFECTS__*/
function defineLazyGetter(object, propKey, getter, stats) {
  return defineGetter(object, propKey, createLazyGetter(propKey, getter, stats))
}

/*@__NO_SIDE_EFFECTS__*/
function defineLazyGetters(object, getterDefObj, stats) {
  if (getterDefObj !== null && typeof getterDefObj === 'object') {
    const keys = Reflect.ownKeys(getterDefObj)
    for (let i = 0, { length } = keys; i < length; i += 1) {
      const key = keys[i]
      defineLazyGetter(
        object,
        key,
        createLazyGetter(key, getterDefObj[key], stats)
      )
    }
  }
  return object
}

/*@__NO_SIDE_EFFECTS__*/
function envAsBoolean(value) {
  return typeof value === 'string'
    ? value === '1' || value.toLowerCase() === 'true'
    : !!value
}

/*@__NO_SIDE_EFFECTS__*/
function envAsString(value) {
  if (typeof value === 'string') {
    return value
  }
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

// ipcPromise is defined inside the LAZY_IPC assignment IIFE below.
let ipcPromise
/*@__NO_SIDE_EFFECTS__*/
async function getIPC(key) {
  const data = await ipcPromise
  return key === undefined ? data : data[key]
}

/*@__NO_SIDE_EFFECTS__*/
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

/*@__NO_SIDE_EFFECTS__*/
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

/*@__NO_SIDE_EFFECTS__*/
function resolveBinPath(binPath) {
  const fs = getFs()
  // Lazily access constants.WIN32.
  if (constants.WIN32) {
    // Trim trailing .cmd and .ps1 extensions.
    const noCmdOrPs1Ext = binPath.replace(/\.(?:cmd|ps1)$/, '')
    if (binPath !== noCmdOrPs1Ext && fs.existsSync(noCmdOrPs1Ext)) {
      binPath = noCmdOrPs1Ext
    }
  }
  return fs.realpathSync.native(binPath)
}

/*@__NO_SIDE_EFFECTS__*/
const LAZY_SUPPORTS_NODE_DISABLE_WARNING_FLAG = () =>
  // https://nodejs.org/api/all.html#all_cli_--disable-warningcode-or-type
  // Lazily access constants.NODE_VERSION.
  getSemver().satisfies(constants.NODE_VERSION, '>=21.3.0||^20.11.0')

/*@__NO_SIDE_EFFECTS__*/
const LAZY_SUPPORTS_NODE_RUN = () =>
  // https://nodejs.org/api/all.html#all_cli_--run
  // Lazily access constants.NODE_VERSION.
  getSemver().satisfies(constants.NODE_VERSION, '>=22.3.0')

/*@__NO_SIDE_EFFECTS__*/
const LAZY_SUPPORTS_NODE_REQUIRE_MODULE = () =>
  // https://nodejs.org/docs/latest-v22.x/api/all.html#all_cli_--experimental-require-module
  // Lazily access constants.NODE_VERSION.
  getSemver().satisfies(constants.NODE_VERSION, '>=22.12')

/*@__NO_SIDE_EFFECTS__*/
const LAZY_SUPPORTS_PROCESS_SEND = () =>
  // Forked subprocesses have the process.send method.
  // https://nodejs.org/api/child_process.html#subprocesssendmessage-sendhandle-options-callback
  typeof getProcess().send === 'function'

/*@__NO_SIDE_EFFECTS__*/
const LAZY_ENV = () => {
  const { env } = getProcess()
  return Object.freeze({
    __proto__: null,
    // CI is always set to 'true' in a GitHub action.
    // https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables#default-environment-variables
    [CI]: envAsBoolean(env[CI]),
    // .github/workflows/provenance.yml defines this.
    // https://docs.github.com/en/actions/use-cases-and-examples/publishing-packages/publishing-nodejs-packages
    [NODE_AUTH_TOKEN]: envAsString(env[NODE_AUTH_TOKEN]),
    // NODE_ENV is a recognized convention, but not a built-in Node.js feature.
    [NODE_ENV]:
      envAsString(env[NODE_ENV]).toLowerCase() === 'development'
        ? 'development'
        : 'production',
    // PRE_COMMIT is set to '1' by our 'test-pre-commit' script run by the
    // .husky/pre-commit hook.
    [PRE_COMMIT]: envAsBoolean(env[PRE_COMMIT]),
    // TAP=1 is set by the tap-run test runner.
    // https://node-tap.org/environment/#environment-variables-used-by-tap
    [TAP]: envAsBoolean(env[TAP]),
    // VITEST=true is set by the Vitest test runner.
    // https://vitest.dev/config/#configuring-vitest
    [VITEST]: envAsBoolean(env[VITEST])
  })
}

/*@__NO_SIDE_EFFECTS__*/
const LAZY_NODE_VERSION = () => getProcess().versions.node

/*@__NO_SIDE_EFFECTS__*/
const LAZY_PACKAGE_DEFAULT_NODE_RANGE = () =>
  // Lazily access constants.maintainedNodeVersions.
  `>=${constants.maintainedNodeVersions.last}`

/*@__NO_SIDE_EFFECTS__*/
const LAZY_IPC = /*@__PURE__*/ (() => {
  const target = { __proto__: null }
  // Mutable handler to simulate a frozen target.
  const handler = {
    __proto__: null,
    defineProperty: () => true,
    deleteProperty: () => false,
    preventExtensions() {
      // Prevent a proxy trap invariant error.
      // https://tc39.es/ecma262/#sec-proxy-object-internal-methods-and-internal-slots-isextensible
      Object.preventExtensions(target)
      return true
    },
    set: () => false,
    setPrototypeOf: () => false
  }
  const proxy = new Proxy(target, handler)
  ipcPromise = new Promise(
    // The Promise executor is immediately executed.
    resolve => {
      if (
        !(typeof process === 'object' && process !== null) ||
        // Manually check instead of lazily accessing constants.SUPPORTS_PROCESS_SEND
        // because constants is not initialized yet.
        typeof process.send !== 'function'
      ) {
        resolve(proxy)
        return
      }
      const finish = () => {
        abortSignal.removeEventListener('abort', finish)
        process.removeListener('message', onmessage)
        resolve(proxy)
      }
      const onmessage = rawData => {
        if (rawData !== null && typeof rawData === 'object') {
          const { [SOCKET_IPC_HANDSHAKE]: source } = {
            __proto__: null,
            ...rawData
          }
          Object.assign(target, source)
          Object.freeze(target)
          // The handler of a Proxy is mutable after proxy instantiation.
          // We delete the traps to defer to native behavior.
          for (const trapName in handler) {
            delete handler[trapName]
          }
        }
        finish()
      }
      abortSignal.addEventListener('abort', finish, { once: true })
      process.on('message', onmessage)
      // The timeout of 1,000 milliseconds, i.e. 1 second, is to prevent an
      // unresolved promised. It should be more than enough time for the IPC
      // handshake.
      setTimeout(finish, 1000)
    }
  )
  /*@__NO_SIDE_EFFECTS__*/
  return () => proxy
})()

/*@__NO_SIDE_EFFECTS__*/
const LAZY_WIN32 = () => getProcess().platform === 'win32'

/*@__NO_SIDE_EFFECTS__*/
const lazyExecPath = () => getProcess().execPath

/*@__NO_SIDE_EFFECTS__*/
const lazyIgnoreGlobs = () =>
  Object.freeze([
    // Most of these ignored files can be included specifically if included in the
    // files globs. Exceptions to this are:
    // https://docs.npmjs.com/cli/v10/configuring-npm/package-json#files
    // These can NOT be included.
    // https://github.com/npm/npm-packlist/blob/v10.0.0/lib/index.js#L280
    '**/.git',
    '**/.npmrc',
    '**/bun.lockb?',
    NODE_MODULES_GLOB_RECURSIVE,
    `**/${PACKAGE_LOCK_JSON}`,
    '**/pnpm-lock.ya?ml',
    '**/yarn.lock',
    // Include npm-packlist defaults:
    // https://github.com/npm/npm-packlist/blob/v10.0.0/lib/index.js#L15-L38
    '**/.DS_Store',
    `**/${GIT_IGNORE}`,
    '**/.hg',
    '**/.lock-wscript',
    '**/.npmignore',
    '**/.svn',
    '**/.wafpickle-*',
    '**/.*.swp',
    '**/._*/**',
    '**/archived-packages/**',
    '**/build/config.gypi',
    '**/CVS',
    '**/npm-debug.log',
    '**/*.orig',
    // Inline .gitignore from the socket-registry repository root.
    '**/.env',
    '**/.eslintcache',
    '**/.nvm',
    '**/.tap',
    '**/.tapci.yaml',
    '**/.vscode',
    '**/*.tsbuildinfo',
    '**/Thumbs.db'
  ])

/*@__NO_SIDE_EFFECTS__*/
const lazyMaintainedNodeVersions = () => {
  // Under the hood browserlist uses the node-releases package which is out of date:
  // https://github.com/chicoxyzzy/node-releases/issues/37
  //
  // So we maintain a manual version list for now.
  // https://nodejs.org/en/about/previous-releases#looking-for-latest-release-of-a-version-branch
  //
  // Updated March 5th, 2025.
  const manualNext = '23.9.0'
  const manualCurr = '22.14.0'
  const manualPrev = '20.18.3'
  const manualLast = '18.20.7'

  const browsersList = getBrowserList()
  const semver = getSemver()

  const query = browsersList('maintained node versions')
    // Trim value, e.g. 'node 22.5.0' to '22.5.0'.
    .map(s => s.slice(5 /*'node '.length*/))
  // browsersList returns results in descending order.
  const queryNext = query.at(0) ?? manualNext
  const queryCurr = query.at(1) ?? manualCurr
  const queryPrev = query.at(2) ?? manualPrev
  const queryLast = query.at(-1) ?? manualLast

  const next = semver.maxSatisfying(
    [queryNext, manualNext],
    `^${semver.major(queryNext)}`
  )
  const current = semver.maxSatisfying(
    [queryCurr, manualCurr],
    `^${semver.major(queryCurr)}`
  )
  const previous = semver.maxSatisfying(
    [queryPrev, manualPrev],
    `^${semver.major(queryPrev)}`
  )
  const last = semver.maxSatisfying(
    [queryLast, manualLast],
    `^${semver.major(queryLast)}`
  )
  return Object.freeze(
    Object.assign([last, previous, current, next], {
      last,
      previous,
      current,
      next
    })
  )
}

/*@__NO_SIDE_EFFECTS__*/
const lazyNodeHardenFlags = () =>
  // Lazily access constants.WIN32.
  constants.WIN32
    ? []
    : // Harden Node security.
      // https://nodejs.org/en/learn/getting-started/security-best-practices
      // We have contributed the following patches to our dependencies to make
      // Node's --frozen-intrinsics workable.
      // √ https://github.com/SBoudrias/Inquirer.js/pull/1683
      // √ https://github.com/pnpm/components/pull/23
      ['--disable-proto', 'delete', '--frozen-intrinsics', '--no-deprecation']

/*@__NO_SIDE_EFFECTS__*/
const lazyNodeNoWarningsFlags = () =>
  Object.freeze(
    // Lazily access constants.SUPPORTS_NODE_DISABLE_WARNING_FLAG.
    constants.SUPPORTS_NODE_DISABLE_WARNING_FLAG
      ? ['--disable-warning', 'ExperimentalWarning']
      : ['--no-warnings']
  )

/*@__NO_SIDE_EFFECTS__*/
const lazyNpmExecPath = () =>
  // Will throw if not found.
  resolveBinPath(getWhich().sync(NPM))

/*@__NO_SIDE_EFFECTS__*/
const lazyPackageExtensions = () =>
  Object.freeze(
    [
      ...getYarnPkgExtensions(),
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
    ].sort((a_, b_) => {
      const a = a_[0].slice(0, a_[0].lastIndexOf('@'))
      const b = b_[0].slice(0, b_[0].lastIndexOf('@'))
      // Simulate the default compareFn of String.prototype.sort.
      if (a < b) {
        return -1
      }
      if (a > b) {
        return 1
      }
      return 0
    })
  )

/*@__NO_SIDE_EFFECTS__*/
const lazyPacoteCachePath = () => {
  const pacote = getPacote()
  const { constructor: PacoteFetcherBase } = Reflect.getPrototypeOf(
    pacote.RegistryFetcher.prototype
  )
  return new PacoteFetcherBase(/*dummy package spec*/ 'x', {}).cache
}

/*@__NO_SIDE_EFFECTS__*/
const lazyParseArgsConfig = () =>
  Object.freeze({
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

/*@__NO_SIDE_EFFECTS__*/
const lazySkipTestsByEcosystem = () =>
  Object.freeze({
    __proto__: null,
    [NPM]: new Set([
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
      // Lazily access constants.ENV.
      ...(constants.ENV.WIN32 ? [] : ['date']),
      // es6-object-assign has no unit tests.
      // https://github.com/rubennorte/es6-object-assign/tree/v1.1.0
      'es6-object-assign',
      // harmony-reflect has known failures in its package and requires running
      // tests in browser.
      // https://github.com/tvcutsem/harmony-reflect/tree/v1.6.2/test
      'harmony-reflect',
      // is-regex tests don't account for `is-regex` backed by
      // `require('node:util/types).isRegExp` which triggers no proxy traps and
      // assumes instead that the 'getOwnPropertyDescriptor' trap will be triggered
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

/*@__NO_SIDE_EFFECTS__*/
const lazySpinner = () => {
  // Lazily require('./spinner').Spinner to avoid cyclical imports.
  const { Spinner } = /*@__PURE__*/ require('./spinner')
  return Spinner()
}

/*@__NO_SIDE_EFFECTS__*/
const lazyWin32EnsureTestsByEcosystem = () =>
  Object.freeze({
    __proto__: null,
    [NPM]: new Set(['date'])
  })

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

const tsLibsAvailable = new Set([
  // Defined in priority order.
  ESNEXT,
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

const constants = createConstantsObject(
  {
    AT_LATEST,
    BIOME_JSON,
    CI,
    COLUMN_LIMIT,
    EMPTY_FILE,
    ENV: undefined,
    ESLINT_CONFIG_JS,
    ESNEXT,
    EXTENSIONS,
    EXTENSIONS_JSON,
    GIT_IGNORE,
    HIDDEN_PACKAGE_LOCK_JSON,
    IPC: undefined,
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
    NODE_AUTH_TOKEN,
    NODE_ENV,
    NODE_MODULES,
    NODE_MODULES_GLOB_RECURSIVE,
    NODE_WORKSPACES,
    NODE_VERSION: undefined,
    NPM,
    NPX,
    OVERRIDES,
    PACKAGE_DEFAULT_SOCKET_CATEGORIES,
    // Lazily defined values are initialized as `undefined` to keep their key order.
    PACKAGE_DEFAULT_NODE_RANGE: undefined,
    PACKAGE_DEFAULT_VERSION,
    PACKAGE_JSON,
    PACKAGE_LOCK_JSON,
    PRE_COMMIT,
    README_GLOB,
    README_GLOB_RECURSIVE,
    README_MD,
    REGISTRY_SCOPE_DELIMITER,
    REGISTRY,
    RESOLUTIONS,
    SOCKET_GITHUB_ORG,
    SOCKET_IPC_HANDSHAKE,
    SOCKET_OVERRIDE_SCOPE,
    SOCKET_PUBLIC_API_KEY,
    SOCKET_PUBLIC_API_TOKEN,
    SOCKET_REGISTRY_NPM_ORG,
    SOCKET_REGISTRY_PACKAGE_NAME,
    SOCKET_REGISTRY_REPO_NAME,
    SOCKET_REGISTRY_SCOPE,
    SOCKET_SECURITY_SCOPE,
    SUPPORTS_NODE_DISABLE_WARNING_FLAG: undefined,
    SUPPORTS_NODE_REQUIRE_MODULE: undefined,
    SUPPORTS_NODE_RUN: undefined,
    SUPPORTS_PROCESS_SEND: undefined,
    TAP,
    TEMPLATE_CJS,
    TEMPLATE_CJS_BROWSER,
    TEMPLATE_CJS_ESM,
    TEMPLATE_ES_SHIM_CONSTRUCTOR,
    TEMPLATE_ES_SHIM_PROTOTYPE_METHOD,
    TEMPLATE_ES_SHIM_STATIC_METHOD,
    TSCONFIG_JSON,
    UNDEFINED_TOKEN,
    UNLICENCED,
    UNLICENSED,
    VITEST,
    WIN32: undefined,
    abortController,
    abortSignal,
    copyLeftLicenses,
    execPath: undefined,
    ignoreGlobs: undefined,
    lifecycleScriptNames,
    maintainedNodeVersions: undefined,
    nodeHardenFlags: undefined,
    nodeNoWarningsFlags: undefined,
    npmExecPath: undefined,
    packageExtensions: undefined,
    packumentCache,
    pacoteCachePath: undefined,
    parseArgsConfig: undefined,
    skipTestsByEcosystem: undefined,
    spinner: undefined,
    tsLibsAvailable,
    tsTypesAvailable,
    win32EnsureTestsByEcosystem: undefined
  },
  {
    getters: {
      ENV: LAZY_ENV,
      IPC: LAZY_IPC,
      NODE_VERSION: LAZY_NODE_VERSION,
      PACKAGE_DEFAULT_NODE_RANGE: LAZY_PACKAGE_DEFAULT_NODE_RANGE,
      SUPPORTS_NODE_DISABLE_WARNING_FLAG:
        LAZY_SUPPORTS_NODE_DISABLE_WARNING_FLAG,
      SUPPORTS_NODE_REQUIRE_MODULE: LAZY_SUPPORTS_NODE_REQUIRE_MODULE,
      SUPPORTS_NODE_RUN: LAZY_SUPPORTS_NODE_RUN,
      SUPPORTS_PROCESS_SEND: LAZY_SUPPORTS_PROCESS_SEND,
      WIN32: LAZY_WIN32,
      execPath: lazyExecPath,
      ignoreGlobs: lazyIgnoreGlobs,
      maintainedNodeVersions: lazyMaintainedNodeVersions,
      nodeHardenFlags: lazyNodeHardenFlags,
      nodeNoWarningsFlags: lazyNodeNoWarningsFlags,
      npmExecPath: lazyNpmExecPath,
      packageExtensions: lazyPackageExtensions,
      pacoteCachePath: lazyPacoteCachePath,
      parseArgsConfig: lazyParseArgsConfig,
      skipTestsByEcosystem: lazySkipTestsByEcosystem,
      spinner: lazySpinner,
      win32EnsureTestsByEcosystem: lazyWin32EnsureTestsByEcosystem
    }
  }
)

module.exports = constants
