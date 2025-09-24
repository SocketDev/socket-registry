'use strict'

const { freeze: ObjectFreeze } = Object

const fs = require('node:fs')
const path = require('node:path')

const eslintCompat = require('@eslint/compat')
const registryConstants = require('@socketsecurity/registry/lib/constants')
const { whichBinSync } = require('@socketsecurity/registry/lib/agent')
const { envAsBoolean } = require('@socketsecurity/registry/lib/env')
const which = require('which')

const {
  ESLINT_CONFIG_JS,
  EXTENSIONS_JSON,
  GITIGNORE,
  LICENSE,
  MANIFEST_JSON,
  NODE_MODULES,
  NPM,
  PACKAGE_JSON,
  PACKAGE_LOCK_JSON,
  PNPM,
  README_MD,
  REGISTRY,
  TSCONFIG_JSON,
  UTF8,
  YARN_LOCK,
  kInternalsSymbol,
  [kInternalsSymbol]: { createConstantsObject },
} = registryConstants

let _defaultWhichOptions
function getDefaultWhichOptions() {
  if (_defaultWhichOptions === undefined) {
    _defaultWhichOptions = {
      __proto__: null,
      path: `${constants.rootNodeModulesBinPath}${path.delimiter}${process.env.PATH}`,
    }
  }
  return _defaultWhichOptions
}

const LAZY_ENV = () => {
  const { env } = process
  // We inline some environment values so that they CANNOT be influenced by user
  // provided environment variables.
  return Object.freeze({
    __proto__: null,
    // Lazily access registryConstants.ENV.
    ...registryConstants.ENV,
    // Enable verbose build output.
    VERBOSE_BUILD: envAsBoolean(env.VERBOSE_BUILD),
  })
}

const LAZY_LICENSE_CONTENT = () =>
  fs.readFileSync(constants.rootLicensePath, UTF8)

const lazyEcosystems = () => {
  // Lazily require('@socketsecurity/registry/lib/fs').
  const registryLibFs = /*@__PURE__*/ require('@socketsecurity/registry/lib/fs')
  const readDirNamesSync = registryLibFs.readDirNamesSync
  return ObjectFreeze(readDirNamesSync(constants.rootPackagesPath))
}

const lazyGitExecPath = () => which.sync('git', { ...getDefaultWhichOptions() })

const lazyGitIgnoreFile = () =>
  eslintCompat.includeIgnoreFile(path.join(constants.rootPath, GITIGNORE))

const lazyIgnoreGlobs = () =>
  ObjectFreeze([
    ...new Set([
      // Most of these ignored files can be included specifically if included in the
      // files globs. Exceptions to this are:
      // https://docs.npmjs.com/cli/v10/configuring-npm/package-json#files
      // These can not be included.
      '.git',
      '.npmrc',
      `**/${NODE_MODULES}`,
      `**/${PACKAGE_LOCK_JSON}`,
      `**/${PNPM}-lock.ya?ml`,
      `**/${YARN_LOCK}`,
      ...constants.gitIgnoreFile.ignores,
    ]),
  ])

const lazyNpmPackageNames = () => {
  // Lazily require('@socketsecurity/registry/lib/fs').
  const registryLibFs = /*@__PURE__*/ require('@socketsecurity/registry/lib/fs')
  const readDirNamesSync = registryLibFs.readDirNamesSync
  return ObjectFreeze(readDirNamesSync(constants.npmPackagesPath))
}

const lazyNpmPackagesPath = () => path.join(constants.rootPackagesPath, NPM)

const lazyNpmTemplatesPath = () => path.join(constants.templatesPath, NPM)

const lazyNpmTemplatesReadmePath = () =>
  path.join(constants.npmTemplatesPath, README_MD)

const lazyPerfNpmPath = () => path.join(constants.rootPath, `perf/${NPM}`)

const lazyPerfNpmFixturesPath = () =>
  path.join(constants.perfNpmPath, 'fixtures')

const lazyRootLicensePath = () => path.join(constants.rootPath, LICENSE)

const lazyRootEslintConfigPath = () =>
  path.join(constants.rootPath, ESLINT_CONFIG_JS)

const lazyRootNodeModulesPath = () =>
  path.join(constants.rootPath, NODE_MODULES)

const lazyRootNodeModulesBinPath = () =>
  path.join(constants.rootNodeModulesPath, '.bin')

const lazyRootPackageJsonPath = () =>
  path.join(constants.rootPath, PACKAGE_JSON)

const lazyRootPackageLockPath = () =>
  path.join(constants.rootPath, PACKAGE_LOCK_JSON)

const lazyRootPackagesPath = () => path.join(constants.rootPath, 'packages')

const lazyRootPath = () => {
  // Find project root by looking for pnpm-workspace.yaml.
  // Start from current working directory and walk up.
  let currentPath = process.cwd()
  const root = path.parse(currentPath).root

  while (currentPath !== root) {
    if (fs.existsSync(path.join(currentPath, 'pnpm-workspace.yaml'))) {
      return currentPath
    }
    currentPath = path.dirname(currentPath)
  }

  // Fallback if not found (shouldn't happen in normal operation).
  return path.resolve(__dirname, '..')
}

const lazyRootTsConfigPath = () => path.join(constants.rootPath, TSCONFIG_JSON)

const lazyRegistryPkgPath = () => path.join(constants.rootPath, REGISTRY)

const lazyRegistryExtensionsJsonPath = () =>
  path.join(constants.registryPkgPath, EXTENSIONS_JSON)

const lazyRegistryManifestJsonPath = () =>
  path.join(constants.registryPkgPath, MANIFEST_JSON)

const lazyRelNpmPackagesPath = () =>
  path.relative(constants.rootPath, constants.npmPackagesPath)

const lazyRelPackagesPath = () =>
  path.relative(constants.rootPath, constants.rootPackagesPath)

const lazyRelRegistryPkgPath = () =>
  path.relative(constants.rootPath, constants.registryPkgPath)

const lazyRelRegistryManifestJsonPath = () =>
  path.relative(constants.rootPath, constants.registryManifestJsonPath)

const lazyRelTestNpmPath = () =>
  path.relative(constants.rootPath, constants.testNpmPath)

const lazyRelTestNpmNodeModulesPath = () =>
  path.relative(constants.rootPath, constants.testNpmNodeModulesPath)

const lazySkipTestsByEcosystem = () => {
  const { WIN32 } = registryConstants
  return new Map([
    [
      'npm',
      new Set([
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
        ...(WIN32 ? [] : ['date']),
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
        'safer-buffer',
      ]),
    ],
  ])
}

const lazyWin32EnsureTestsByEcosystem = () => {
  return new Map([['npm', new Set(['date'])]])
}

const lazyTemplatesPath = () => path.join(__dirname, 'templates')

const lazyTestNpmPath = () => path.join(constants.rootPath, `test/${NPM}`)

const lazyTestNpmFixturesPath = () =>
  path.join(constants.testNpmPath, 'fixtures')

const lazyTestNpmNodeModulesPath = () =>
  path.join(constants.testNpmPath, NODE_MODULES)

const lazyTestNpmNodeWorkspacesPath = () =>
  path.join(constants.testNpmPath, constants.PACKAGES)

const lazyTestNpmPkgJsonPath = () =>
  path.join(constants.testNpmPath, PACKAGE_JSON)

const lazyTestNpmPkgLockPath = () =>
  path.join(constants.testNpmPath, PACKAGE_LOCK_JSON)

const lazyTsxExecPath = () =>
  whichBinSync('tsx', { ...getDefaultWhichOptions() })

const lazyYarnPkgExtsPath = () =>
  path.join(constants.rootNodeModulesPath, '@yarnpkg/extensions')

const lazyYarnPkgExtsJsonPath = () =>
  path.join(constants.yarnPkgExtsPath, PACKAGE_JSON)

const constants = createConstantsObject(
  {
    // Lazily defined values are initialized as `undefined` to
    // keep their key order.
    BIOME_JSON: 'biome.json',
    ENV: undefined,
    DEFAULT_CONCURRENCY: 3,
    LICENSE_CONTENT: undefined,
    PACKAGES: 'packages',
    TEMPLATE_CJS: 'cjs',
    TEMPLATE_CJS_BROWSER: 'cjs-browser',
    TEMPLATE_CJS_ESM: 'cjs-esm',
    TEMPLATE_ES_SHIM_CONSTRUCTOR: 'es-shim-constructor',
    TEMPLATE_ES_SHIM_PROTOTYPE_METHOD: 'es-shim-prototype-method',
    TEMPLATE_ES_SHIM_STATIC_METHOD: 'es-shim-static-method',
    ecosystems: undefined,
    gitExecPath: undefined,
    gitIgnoreFile: undefined,
    kInternalsSymbol,
    ignoreGlobs: undefined,
    npmPackageNames: undefined,
    npmPackagesPath: undefined,
    npmTemplatesPath: undefined,
    npmTemplatesReadmePath: undefined,
    parseArgsConfig: {
      options: {
        force: {
          type: 'boolean',
          short: 'f',
        },
        quiet: {
          type: 'boolean',
        },
      },
      strict: false,
    },
    perfNpmPath: undefined,
    perfNpmFixturesPath: undefined,
    registryExtensionsJsonPath: undefined,
    registryManifestJsonPath: undefined,
    registryPkgPath: undefined,
    relNpmPackagesPath: undefined,
    relPackagesPath: undefined,
    relRegistryManifestJsonPath: undefined,
    relRegistryPkgPath: undefined,
    relTestNpmPath: undefined,
    relTestNpmNodeModulesPath: undefined,
    rootEslintConfigPath: undefined,
    rootLicensePath: undefined,
    rootNodeModulesBinPath: undefined,
    rootNodeModulesPath: undefined,
    rootPackageJsonPath: undefined,
    rootPackageLockPath: undefined,
    rootPackagesPath: undefined,
    rootPath: undefined,
    rootTsConfigPath: undefined,
    skipTestsByEcosystem: undefined,
    templatesPath: undefined,
    testNpmPath: undefined,
    testNpmFixturesPath: undefined,
    testNpmNodeModulesPath: undefined,
    testNpmNodeWorkspacesPath: undefined,
    testNpmPkgJsonPath: undefined,
    testNpmPkgLockPath: undefined,
    tsxExecPath: undefined,
    win32EnsureTestsByEcosystem: undefined,
    yarnPkgExtsPath: undefined,
    yarnPkgExtsJsonPath: undefined,
  },
  {
    getters: {
      ENV: LAZY_ENV,
      LICENSE_CONTENT: LAZY_LICENSE_CONTENT,
      ecosystems: lazyEcosystems,
      gitExecPath: lazyGitExecPath,
      gitIgnoreFile: lazyGitIgnoreFile,
      ignoreGlobs: lazyIgnoreGlobs,
      npmPackageNames: lazyNpmPackageNames,
      npmPackagesPath: lazyNpmPackagesPath,
      npmTemplatesPath: lazyNpmTemplatesPath,
      npmTemplatesReadmePath: lazyNpmTemplatesReadmePath,
      perfNpmPath: lazyPerfNpmPath,
      perfNpmFixturesPath: lazyPerfNpmFixturesPath,
      registryExtensionsJsonPath: lazyRegistryExtensionsJsonPath,
      registryManifestJsonPath: lazyRegistryManifestJsonPath,
      registryPkgPath: lazyRegistryPkgPath,
      relNpmPackagesPath: lazyRelNpmPackagesPath,
      relPackagesPath: lazyRelPackagesPath,
      relRegistryManifestJsonPath: lazyRelRegistryManifestJsonPath,
      relRegistryPkgPath: lazyRelRegistryPkgPath,
      relTestNpmPath: lazyRelTestNpmPath,
      relTestNpmNodeModulesPath: lazyRelTestNpmNodeModulesPath,
      rootEslintConfigPath: lazyRootEslintConfigPath,
      rootLicensePath: lazyRootLicensePath,
      rootNodeModulesBinPath: lazyRootNodeModulesBinPath,
      rootNodeModulesPath: lazyRootNodeModulesPath,
      rootPackageJsonPath: lazyRootPackageJsonPath,
      rootPackageLockPath: lazyRootPackageLockPath,
      rootPackagesPath: lazyRootPackagesPath,
      rootPath: lazyRootPath,
      rootTsConfigPath: lazyRootTsConfigPath,
      skipTestsByEcosystem: lazySkipTestsByEcosystem,
      templatesPath: lazyTemplatesPath,
      testNpmPath: lazyTestNpmPath,
      testNpmFixturesPath: lazyTestNpmFixturesPath,
      testNpmNodeModulesPath: lazyTestNpmNodeModulesPath,
      testNpmNodeWorkspacesPath: lazyTestNpmNodeWorkspacesPath,
      testNpmPkgJsonPath: lazyTestNpmPkgJsonPath,
      testNpmPkgLockPath: lazyTestNpmPkgLockPath,
      tsxExecPath: lazyTsxExecPath,
      win32EnsureTestsByEcosystem: lazyWin32EnsureTestsByEcosystem,
      yarnPkgExtsPath: lazyYarnPkgExtsPath,
      yarnPkgExtsJsonPath: lazyYarnPkgExtsJsonPath,
    },
    mixin: registryConstants,
  },
)
module.exports = constants
