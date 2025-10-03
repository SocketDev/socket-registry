/**
 * @fileoverview Configuration constants and CLI argument parsing for build scripts.
 * Provides shared configuration, paths, and environment settings for registry operations.
 */

import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { includeIgnoreFile } from '@eslint/compat'
import which from 'which'
import registryConstants from '../registry/dist/lib/constants/index.js'
import { whichBinSync } from '../registry/dist/lib/bin.js'
import { envAsBoolean } from '../registry/dist/lib/env.js'
import { createConstantsObject } from '../registry/dist/lib/objects.js'

const require = createRequire(import.meta.url)

const {
  DOT_GITHUB,
  ESLINT_CONFIG_JS,
  GITIGNORE,
  LICENSE,
  NODE_MODULES,
  NPM,
  PACKAGE_JSON,
  PACKAGE_LOCK_JSON,
  PNPM,
  README_MD,
  UTF8,
  YARN_LOCK,
} = registryConstants

let _defaultWhichOptions

/**
 * Get cached default which command options with augmented PATH.
 */
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
  const registryLibFs = /*@__PURE__*/ require('../registry/dist/lib/fs')
  const readDirNamesSync = registryLibFs.readDirNamesSync
  return Object.freeze(readDirNamesSync(constants.rootPackagesPath))
}

const lazyGitExecPath = () => which.sync('git', { ...getDefaultWhichOptions() })

const lazyGitIgnoreFile = () =>
  includeIgnoreFile(path.join(lazyRootPath(), GITIGNORE))

const lazyIgnoreGlobs = () =>
  Object.freeze([
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
  const registryLibFs = /*@__PURE__*/ require('../registry/dist/lib/fs')
  const readDirNamesSync = registryLibFs.readDirNamesSync
  return Object.freeze(readDirNamesSync(constants.npmPackagesPath))
}

const lazyNpmPackagesPath = () => path.join(constants.rootPackagesPath, NPM)

const lazyNpmTemplatesPath = () => path.join(constants.templatesPath, NPM)

const lazyNpmTemplatesReadmePath = () =>
  path.join(constants.npmTemplatesPath, README_MD)

const lazyPerfNpmPath = () => path.join(constants.rootPath, `perf/${NPM}`)

const lazyPerfNpmFixturesPath = () =>
  path.join(constants.perfNpmPath, 'fixtures')

const lazyRootCachePath = () => path.join(constants.rootPath, '.cache')

const lazyRootDotGithubPath = () => path.join(constants.rootPath, DOT_GITHUB)

const lazyRootDotGithubActionsPath = () =>
  path.join(constants.rootDotGithubPath, 'actions')

const lazyRootDotGithubWorkflowsPath = () =>
  path.join(constants.rootDotGithubPath, 'workflows')

const lazyRootGithubCachePath = () =>
  path.join(constants.rootCachePath, 'github')

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
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  return path.resolve(__dirname, '..')
}

const lazyRootTsConfigPath = () =>
  path.join(constants.rootPath, constants.TSCONFIG_JSON)

const lazyRegistryPkgPath = () =>
  path.join(constants.rootPath, constants.REGISTRY)

const lazyRegistryExtensionsJsonPath = () =>
  path.join(constants.registryPkgPath, constants.EXTENSIONS_JSON)

const lazyRegistryManifestJsonPath = () =>
  path.join(constants.registryPkgPath, constants.MANIFEST_JSON)

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

  // Get all test files from test/npm directory.
  const testNpmPath = lazyTestNpmPath()
  const testFiles = fs
    .readdirSync(testNpmPath)
    .filter(name => name.endsWith('.test.mts'))
    .map(name => name.slice(0, -'.test.mts'.length))

  const skipSet = new Set([
    // date tests fail for some Node versions and platforms, but pass in CI
    // Win32 environments for the time being.
    // https://github.com/es-shims/Date/issues/3
    // https://github.com/es-shims/Date/tree/v2.0.5
    ...(WIN32 ? [] : ['date']),
    // Dynamically include all packages with test files in test/npm.
    ...testFiles,
  ])

  return new Map([['npm', skipSet]])
}

const lazyWin32EnsureTestsByEcosystem = () => {
  return new Map([['npm', new Set(['date'])]])
}

const lazyTemplatesPath = () =>
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'templates')

const lazyTestNpmPath = () => path.join(constants.rootPath, `test/${NPM}`)

const lazyTestNpmFixturesPath = () =>
  path.join(constants.testNpmPath, 'fixtures')

const lazyTestNpmNodeModulesPath = () =>
  path.join(constants.testNpmPath, NODE_MODULES)

const lazyTestNpmNodeWorkspacesPath = () =>
  path.join(constants.testNpmPath, 'packages')

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
    allowTestFailuresByEcosystem: new Map([
      [
        'npm',
        new Set([
          // es-get-iterator installation fails intermittently in CI environments.
          'es-get-iterator',
          // function.prototype.name installation fails intermittently in CI environments.
          'function.prototype.name',
          // is-boolean-object installation fails intermittently in CI environments.
          'is-boolean-object',
          // object.assign installation fails intermittently in CI environments.
          'object.assign',
        ]),
      ],
    ]),
    ecosystems: undefined,
    gitExecPath: undefined,
    gitIgnoreFile: undefined,
    kInternalsSymbol: registryConstants.kInternalsSymbol,
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
    rootCachePath: undefined,
    rootDotGithubPath: undefined,
    rootDotGithubActionsPath: undefined,
    rootDotGithubWorkflowsPath: undefined,
    rootGithubCachePath: undefined,
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
      rootCachePath: lazyRootCachePath,
      rootDotGithubPath: lazyRootDotGithubPath,
      rootDotGithubActionsPath: lazyRootDotGithubActionsPath,
      rootDotGithubWorkflowsPath: lazyRootDotGithubWorkflowsPath,
      rootGithubCachePath: lazyRootGithubCachePath,
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

export default constants
