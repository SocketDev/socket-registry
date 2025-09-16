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
  PNPM,
  README_MD,
  REGISTRY,
  TSCONFIG_JSON,
  UTF8,
  YARN_LOCK,
  kInternalsSymbol,
  [kInternalsSymbol]: { createConstantsObject }
} = registryConstants

let _defaultWhichOptions
function getDefaultWhichOptions() {
  if (_defaultWhichOptions === undefined) {
    _defaultWhichOptions = {
      __proto__: null,
      path: `${constants.rootNodeModulesBinPath}${path.delimiter}${process.env.PATH}`
    }
  }
  return _defaultWhichOptions
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
      ...constants.gitIgnoreFile.ignores
    ])
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
  // Find project root by looking for pnpm-workspace.yaml
  // Start from current working directory and walk up
  let currentPath = process.cwd()
  const root = path.parse(currentPath).root

  while (currentPath !== root) {
    if (fs.existsSync(path.join(currentPath, 'pnpm-workspace.yaml'))) {
      return currentPath
    }
    currentPath = path.dirname(currentPath)
  }

  // Fallback if not found (shouldn't happen in normal operation)
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

const lazyTemplatesPath = () => path.join(__dirname, 'templates')

const lazyTestNpmPath = () => path.join(constants.rootPath, `test/${NPM}`)

const lazyTestNpmFixturesPath = () =>
  path.join(constants.testNpmPath, 'fixtures')

const lazyTestNpmNodeModulesPath = () =>
  path.join(constants.testNpmPath, NODE_MODULES)

const lazyTestNpmNodeWorkspacesPath = () =>
  path.join(constants.testNpmPath, NODE_WORKSPACES)

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
