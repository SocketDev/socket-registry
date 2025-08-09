'use strict'

const { freeze: ObjectFreeze } = Object

const fs = require('node:fs')
const path = require('node:path')

const eslintCompat = require('@eslint/compat')
const registryConstants = require('@socketsecurity/registry/lib/constants')
const { whichBinSync } = require('@socketsecurity/registry/lib/npm')
const which = require('which')

const {
  ESLINT_CONFIG_JS,
  EXTENSIONS_JSON,
  GITIGNORE,
  LICENSE,
  MANIFEST_JSON,
  NODE_MODULES,
  NODE_WORKSPACES,
  NPM,
  PACKAGE_JSON,
  PACKAGE_LOCK_JSON,
  README_MD,
  REGISTRY,
  TSCONFIG_JSON,
  UTF8,
  kInternalsSymbol,
  [kInternalsSymbol]: { createConstantsObject }
} = registryConstants

let _defaultWhichOptions
function getDefaultWhichOptions() {
  if (_defaultWhichOptions === undefined) {
    _defaultWhichOptions = {
      __proto__: null,
      // Lazily access constants.rootNodeModulesBinPath.
      path: `${constants.rootNodeModulesBinPath}${path.delimiter}${process.env.PATH}`
    }
  }
  return _defaultWhichOptions
}

const LAZY_LICENSE_CONTENT = () =>
  // Lazily access constants.rootLicensePath.
  fs.readFileSync(constants.rootLicensePath, UTF8)

const lazyEcosystems = () => {
  // Lazily require('@socketsecurity/registry/lib/fs').
  const registryLibFs = /*@__PURE__*/ require('@socketsecurity/registry/lib/fs')
  const readDirNamesSync = registryLibFs.readDirNamesSync
  // Lazily access constants.rootPackagesPath.
  return ObjectFreeze(readDirNamesSync(constants.rootPackagesPath))
}

const lazyGitExecPath = () => which.sync('git', { ...getDefaultWhichOptions() })

const lazyGitIgnoreFile = () =>
  eslintCompat.includeIgnoreFile(
    // Lazily access constants.rootPath.
    path.join(constants.rootPath, GITIGNORE)
  )

const lazyIgnoreGlobs = () =>
  ObjectFreeze([
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

const lazyNpmPackageNames = () => {
  // Lazily require('@socketsecurity/registry/lib/fs').
  const registryLibFs = /*@__PURE__*/ require('@socketsecurity/registry/lib/fs')
  const readDirNamesSync = registryLibFs.readDirNamesSync
  // Lazily access constants.npmPackagesPath.
  return ObjectFreeze(readDirNamesSync(constants.npmPackagesPath))
}

const lazyNpmPackagesPath = () =>
  // Lazily access constants.rootPackagesPath.
  path.join(constants.rootPackagesPath, NPM)

const lazyNpmTemplatesPath = () =>
  // Lazily access constants.templatesPath.
  path.join(constants.templatesPath, NPM)

const lazyNpmTemplatesReadmePath = () =>
  // Lazily access constants.npmTemplatesPath.
  path.join(constants.npmTemplatesPath, README_MD)

const lazyPerfNpmPath = () =>
  // Lazily access constants.rootPath.
  path.join(constants.rootPath, `perf/${NPM}`)

const lazyPerfNpmFixturesPath = () =>
  // Lazily access constants.perfNpmPath.
  path.join(constants.perfNpmPath, 'fixtures')

const lazyRootLicensePath = () =>
  // Lazily access constants.rootPath.
  path.join(constants.rootPath, LICENSE)

const lazyRootEslintConfigPath = () =>
  // Lazily access constants.rootPath.
  path.join(constants.rootPath, ESLINT_CONFIG_JS)

const lazyRootNodeModulesPath = () =>
  // Lazily access constants.rootPath.
  path.join(constants.rootPath, NODE_MODULES)

const lazyRootNodeModulesBinPath = () =>
  // Lazily access constants.rootNodeModulesPath.
  path.join(constants.rootNodeModulesPath, '.bin')

const lazyRootPackageJsonPath = () =>
  // Lazily access constants.rootPath.
  path.join(constants.rootPath, PACKAGE_JSON)

const lazyRootPackageLockPath = () =>
  // Lazily access constants.rootPath.
  path.join(constants.rootPath, PACKAGE_LOCK_JSON)

const lazyRootPackagesPath = () =>
  // Lazily access constants.rootPath.
  path.join(constants.rootPath, 'packages')

const lazyRootPath = () => path.resolve(__dirname, '..')

const lazyRootTsConfigPath = () =>
  // Lazily access constants.rootPath.
  path.join(constants.rootPath, TSCONFIG_JSON)

const lazyRegistryPkgPath = () =>
  // Lazily access constants.rootPath.
  path.join(constants.rootPath, REGISTRY)

const lazyRegistryExtensionsJsonPath = () =>
  // Lazily access constants.registryPkgPath.
  path.join(constants.registryPkgPath, EXTENSIONS_JSON)

const lazyRegistryManifestJsonPath = () =>
  // Lazily access constants.registryPkgPath.
  path.join(constants.registryPkgPath, MANIFEST_JSON)

const lazyRelNpmPackagesPath = () =>
  // Lazily access constants.rootPath and constants.npmPackagesPath.
  path.relative(constants.rootPath, constants.npmPackagesPath)

const lazyRelPackagesPath = () =>
  // Lazily access constants.rootPath and constants.rootPackagesPath.
  path.relative(constants.rootPath, constants.rootPackagesPath)

const lazyRelRegistryPkgPath = () =>
  // Lazily access constants.rootPath and constants.registryPkgPath.
  path.relative(constants.rootPath, constants.registryPkgPath)

const lazyRelRegistryManifestJsonPath = () =>
  // Lazily access constants.rootPath and constants.registryManifestJsonPath.
  path.relative(constants.rootPath, constants.registryManifestJsonPath)

const lazyRelTestNpmPath = () =>
  // Lazily access constants.rootPath and constants.testNpmPath.
  path.relative(constants.rootPath, constants.testNpmPath)

const lazyRelTestNpmNodeModulesPath = () =>
  // Lazily access constants.rootPath and constants.testNpmNodeModulesPath.
  path.relative(constants.rootPath, constants.testNpmNodeModulesPath)

const lazyTapCiConfigPath = () =>
  // Lazily access constants.rootPath.
  path.join(constants.rootPath, '.tapci.yaml')

const lazyTapConfigPath = () =>
  // Lazily access constants.rootPath.
  path.join(constants.rootPath, '.taprc')

const lazyTapRunExecPath = () =>
  whichBinSync('tap-run', { ...getDefaultWhichOptions() })

const lazyTemplatesPath = () => path.join(__dirname, 'templates')

const lazyTestNpmPath = () =>
  // Lazily access constants.rootPath.
  path.join(constants.rootPath, `test/${NPM}`)

const lazyTestNpmFixturesPath = () =>
  // Lazily access constants.testNpmPath.
  path.join(constants.testNpmPath, 'fixtures')

const lazyTestNpmNodeModulesPath = () =>
  // Lazily access constants.testNpmPath.
  path.join(constants.testNpmPath, NODE_MODULES)

const lazyTestNpmNodeWorkspacesPath = () =>
  // Lazily access constants.testNpmPath.
  path.join(constants.testNpmPath, NODE_WORKSPACES)

const lazyTestNpmPkgJsonPath = () =>
  // Lazily access constants.testNpmPath.
  path.join(constants.testNpmPath, PACKAGE_JSON)

const lazyTestNpmPkgLockPath = () =>
  // Lazily access constants.testNpmPath.
  path.join(constants.testNpmPath, PACKAGE_LOCK_JSON)

const lazyTsxExecPath = () =>
  whichBinSync('tsx', { ...getDefaultWhichOptions() })

const lazyYarnPkgExtsPath = () =>
  // Lazily access constants.rootNodeModulesPath.
  path.join(constants.rootNodeModulesPath, '@yarnpkg/extensions')

const lazyYarnPkgExtsJsonPath = () =>
  // Lazily access constants.yarnPkgExtsPath.
  path.join(constants.yarnPkgExtsPath, PACKAGE_JSON)

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
    mixin: registryConstants
  }
)
module.exports = constants
