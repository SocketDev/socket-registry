'use strict'

const registryConstants = require('@socketsecurity/registry/lib/constants')

let _eslintCompat
function getEslintCompat() {
  if (_eslintCompat === undefined) {
    _eslintCompat = require('@eslint/compat')
  }
  return _eslintCompat
}

let _fs
function getFs() {
  if (_fs === undefined) {
    _fs = require('node:fs')
  }
  return _fs
}

let _path
function getPath() {
  if (_path === undefined) {
    _path = require('node:path')
  }
  return _path
}

let _process
function getProcess() {
  if (_process === undefined) {
    _process = require('node:process')
  }
  return _process
}

let _which
function getWhich() {
  if (_which === undefined) {
    _which = require('which')
  }
  return _which
}

const {
  ESLINT_CONFIG_JS,
  EXTENSIONS_JSON,
  GIT_IGNORE,
  LICENSE,
  MANIFEST_JSON,
  NODE_MODULES,
  NODE_WORKSPACES,
  NPM,
  PACKAGE_JSON,
  PACKAGE_LOCK,
  README_MD,
  REGISTRY,
  TSCONFIG_JSON,
  kInternalsSymbol,
  [kInternalsSymbol]: { createConstantsObject, readDirNamesSync }
} = registryConstants

let _defaultWhichOptions
function getDefaultWhichOptions() {
  if (_defaultWhichOptions === undefined) {
    const path = getPath()
    const process = getProcess()
    _defaultWhichOptions = {
      __proto__: null,
      // Lazily access constants.rootNodeModulesBinPath.
      path: `${constants.rootNodeModulesBinPath}${path.delimiter}${process.env.PATH}`
    }
  }
  return _defaultWhichOptions
}

function which(cmd, options) {
  const whichFn = getWhich()
  return whichFn(cmd, {
    __proto__: null,
    ...getDefaultWhichOptions(),
    ...options
  })
}

function whichSync(cmd, options) {
  const whichFn = getWhich()
  return whichFn.sync(cmd, {
    __proto__: null,
    ...getDefaultWhichOptions(),
    ...options
  })
}

const LAZY_LICENSE_CONTENT = () =>
  // Lazily access constants.rootLicensePath.
  getFs().readFileSync(constants.rootLicensePath, 'utf8')

const lazyEcosystems = () =>
  // Lazily access constants.rootPackagesPath.
  Object.freeze(readDirNamesSync(constants.rootPackagesPath))

const lazyGitExecPath = () => whichSync('git')

const lazyGitIgnoreFile = () =>
  getEslintCompat().includeIgnoreFile(
    // Lazily access constants.rootPath.
    getPath().join(constants.rootPath, GIT_IGNORE)
  )

const lazyIgnoreGlobs = () =>
  Object.freeze([
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
      // Lazily access constants.gitIgnoreFile.
      ...constants.gitIgnoreFile.ignores
    ])
  ])

const lazyNpmPackageNames = () =>
  // Lazily access constants.npmPackagesPath.
  Object.freeze(readDirNamesSync(constants.npmPackagesPath))

const lazyNpmPackagesPath = () =>
  // Lazily access constants.rootPackagesPath.
  getPath().join(constants.rootPackagesPath, NPM)

const lazyNpmTemplatesPath = () =>
  // Lazily access constants.templatesPath.
  getPath().join(constants.templatesPath, NPM)

const lazyNpmTemplatesReadmePath = () =>
  // Lazily access constants.npmTemplatesPath.
  getPath().join(constants.npmTemplatesPath, README_MD)

const lazyPerfNpmPath = () =>
  // Lazily access constants.rootPath.
  getPath().join(constants.rootPath, `perf/${NPM}`)

const lazyPerfNpmFixturesPath = () =>
  // Lazily access constants.perfNpmPath.
  getPath().join(constants.perfNpmPath, 'fixtures')

const lazyRootLicensePath = () =>
  // Lazily access constants.rootPath.
  getPath().join(constants.rootPath, LICENSE)

const lazyRootEslintConfigPath = () =>
  // Lazily access constants.rootPath.
  getPath().join(constants.rootPath, ESLINT_CONFIG_JS)

const lazyRootNodeModulesPath = () =>
  // Lazily access constants.rootPath.
  getPath().join(constants.rootPath, NODE_MODULES)

const lazyRootNodeModulesBinPath = () =>
  // Lazily access constants.rootNodeModulesPath.
  getPath().join(constants.rootNodeModulesPath, '.bin')

const lazyRootPackageJsonPath = () =>
  // Lazily access constants.rootPath.
  getPath().join(constants.rootPath, PACKAGE_JSON)

const lazyRootPackageLockPath = () =>
  // Lazily access constants.rootPath.
  getPath().join(constants.rootPath, PACKAGE_LOCK)

const lazyRootPackagesPath = () =>
  // Lazily access constants.rootPath.
  getPath().join(constants.rootPath, 'packages')

const lazyRootPath = () => getPath().resolve(__dirname, '..')

const lazyRootTsConfigPath = () =>
  // Lazily access constants.rootPath.
  getPath().join(constants.rootPath, TSCONFIG_JSON)

const lazyRegistryPkgPath = () =>
  // Lazily access constants.rootPath.
  getPath().join(constants.rootPath, REGISTRY)

const lazyRegistryExtensionsJsonPath = () =>
  // Lazily access constants.registryPkgPath.
  getPath().join(constants.registryPkgPath, EXTENSIONS_JSON)

const lazyRegistryManifestJsonPath = () =>
  // Lazily access constants.registryPkgPath.
  getPath().join(constants.registryPkgPath, MANIFEST_JSON)

const lazyRelNpmPackagesPath = () =>
  // Lazily access constants.rootPath and constants.npmPackagesPath.
  getPath().relative(constants.rootPath, constants.npmPackagesPath)

const lazyRelPackagesPath = () =>
  // Lazily access constants.rootPath and constants.rootPackagesPath.
  getPath().relative(constants.rootPath, constants.rootPackagesPath)

const lazyRelRegistryPkgPath = () =>
  // Lazily access constants.rootPath and constants.registryPkgPath.
  getPath().relative(constants.rootPath, constants.registryPkgPath)

const lazyRelRegistryManifestJsonPath = () =>
  // Lazily access constants.rootPath and constants.registryManifestJsonPath.
  getPath().relative(constants.rootPath, constants.registryManifestJsonPath)

const lazyRelTestNpmPath = () =>
  // Lazily access constants.rootPath and constants.testNpmPath.
  getPath().relative(constants.rootPath, constants.testNpmPath)

const lazyRelTestNpmNodeModulesPath = () =>
  // Lazily access constants.rootPath and constants.testNpmNodeModulesPath.
  getPath().relative(constants.rootPath, constants.testNpmNodeModulesPath)

const lazyTapCiConfigPath = () =>
  // Lazily access constants.rootPath.
  getPath().join(constants.rootPath, '.tapci.yaml')

const lazyTapConfigPath = () =>
  // Lazily access constants.rootPath.
  getPath().join(constants.rootPath, '.taprc')

const lazyTapRunExecPath = () => whichSync('tap-run')

const lazyTemplatesPath = () => getPath().join(__dirname, 'templates')

const lazyTestNpmPath = () =>
  // Lazily access constants.rootPath.
  getPath().join(constants.rootPath, `test/${NPM}`)

const lazyTestNpmFixturesPath = () =>
  // Lazily access constants.testNpmPath.
  getPath().join(constants.testNpmPath, 'fixtures')

const lazyTestNpmNodeModulesPath = () =>
  // Lazily access constants.testNpmPath.
  getPath().join(constants.testNpmPath, NODE_MODULES)

const lazyTestNpmNodeWorkspacesPath = () =>
  // Lazily access constants.testNpmPath.
  getPath().join(constants.testNpmPath, NODE_WORKSPACES)

const lazyTestNpmPkgJsonPath = () =>
  // Lazily access constants.testNpmPath.
  getPath().join(constants.testNpmPath, PACKAGE_JSON)

const lazyTestNpmPkgLockPath = () =>
  // Lazily access constants.testNpmPath.
  getPath().join(constants.testNpmPath, PACKAGE_LOCK)

const lazyTsxExecPath = () => whichSync('tsx')

const lazyYarnPkgExtsPath = () =>
  // Lazily access constants.rootNodeModulesPath.
  getPath().join(constants.rootNodeModulesPath, '@yarnpkg/extensions')

const lazyYarnPkgExtsJsonPath = () =>
  // Lazily access constants.yarnPkgExtsPath.
  getPath().join(constants.yarnPkgExtsPath, PACKAGE_JSON)

const constants = createConstantsObject(
  {
    // Lazily defined values are initialized as `undefined` to
    // keep their key order.
    LICENSE_CONTENT: undefined,
    ecosystems: undefined,
    gitExecPath: undefined,
    gitIgnoreFile: undefined,
    kInternalsSymbol,
    ignoreGlobs: undefined,
    npmPackageNames: undefined,
    npmPackagesPath: undefined,
    npmTemplatesPath: undefined,
    npmTemplatesReadmePath: undefined,
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
    tapCiConfigPath: undefined,
    tapConfigPath: undefined,
    tapRunExecPath: undefined,
    templatesPath: undefined,
    testNpmPath: undefined,
    testNpmFixturesPath: undefined,
    testNpmNodeModulesPath: undefined,
    testNpmNodeWorkspacesPath: undefined,
    testNpmPkgJsonPath: undefined,
    testNpmPkgLockPath: undefined,
    tsxExecPath: undefined,
    yarnPkgExtsPath: undefined,
    yarnPkgExtsJsonPath: undefined
  },
  {
    getters: {
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
      tapCiConfigPath: lazyTapCiConfigPath,
      tapConfigPath: lazyTapConfigPath,
      tapRunExecPath: lazyTapRunExecPath,
      templatesPath: lazyTemplatesPath,
      testNpmPath: lazyTestNpmPath,
      testNpmFixturesPath: lazyTestNpmFixturesPath,
      testNpmNodeModulesPath: lazyTestNpmNodeModulesPath,
      testNpmNodeWorkspacesPath: lazyTestNpmNodeWorkspacesPath,
      testNpmPkgJsonPath: lazyTestNpmPkgJsonPath,
      testNpmPkgLockPath: lazyTestNpmPkgLockPath,
      tsxExecPath: lazyTsxExecPath,
      yarnPkgExtsPath: lazyYarnPkgExtsPath,
      yarnPkgExtsJsonPath: lazyYarnPkgExtsJsonPath
    },
    internals: {
      which,
      whichSync
    },
    mixin: registryConstants
  }
)
module.exports = constants
