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
import { normalizePath } from '../registry/dist/lib/path.js'

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

/**
 * Get environment configuration with inlined values.
 */
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

/**
 * Get root LICENSE file content.
 */
const LAZY_LICENSE_CONTENT = () =>
  fs.readFileSync(constants.rootLicensePath, UTF8)

/**
 * Get available package ecosystems from packages directory.
 */
const lazyEcosystems = () => {
  const registryLibFs = /*@__PURE__*/ require('../registry/dist/lib/fs.js')
  const readDirNamesSync = registryLibFs.readDirNamesSync
  return Object.freeze(readDirNamesSync(constants.rootPackagesPath))
}

/**
 * Get git executable path.
 */
const lazyGitExecPath = () => which.sync('git', { ...getDefaultWhichOptions() })

/**
 * Get gitignore file configuration for ESLint.
 */
const lazyGitIgnoreFile = () =>
  includeIgnoreFile(normalizePath(path.join(lazyRootPath(), GITIGNORE)))

/**
 * Get merged ignore globs from gitignore and standard exclusions.
 */
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

/**
 * Get npm package names from packages directory.
 */
const lazyNpmPackageNames = () => {
  const registryLibFs = /*@__PURE__*/ require('../registry/dist/lib/fs.js')
  const readDirNamesSync = registryLibFs.readDirNamesSync
  return Object.freeze(readDirNamesSync(constants.npmPackagesPath))
}

/**
 * Get npm packages directory path.
 */
const lazyNpmPackagesPath = () =>
  normalizePath(path.join(constants.rootPackagesPath, NPM))

/**
 * Get npm templates directory path.
 */
const lazyNpmTemplatesPath = () =>
  normalizePath(path.join(constants.templatesPath, NPM))

/**
 * Get npm templates README path.
 */
const lazyNpmTemplatesReadmePath = () =>
  normalizePath(path.join(constants.npmTemplatesPath, README_MD))

/**
 * Get npm performance test directory path.
 */
const lazyPerfNpmPath = () =>
  normalizePath(path.join(constants.rootPath, `perf/${NPM}`))

/**
 * Get npm performance fixtures directory path.
 */
const lazyPerfNpmFixturesPath = () =>
  normalizePath(path.join(constants.perfNpmPath, 'fixtures'))

/**
 * Get root cache directory path.
 */
const lazyRootCachePath = () =>
  normalizePath(path.join(constants.rootPath, '.cache'))

/**
 * Get root .github directory path.
 */
const lazyRootDotGithubPath = () =>
  normalizePath(path.join(constants.rootPath, DOT_GITHUB))

/**
 * Get root .github/actions directory path.
 */
const lazyRootDotGithubActionsPath = () =>
  normalizePath(path.join(constants.rootDotGithubPath, 'actions'))

/**
 * Get root .github/workflows directory path.
 */
const lazyRootDotGithubWorkflowsPath = () =>
  normalizePath(path.join(constants.rootDotGithubPath, 'workflows'))

/**
 * Get root GitHub cache directory path.
 */
const lazyRootGithubCachePath = () =>
  normalizePath(path.join(constants.rootCachePath, 'github'))

/**
 * Get root LICENSE file path.
 */
const lazyRootLicensePath = () =>
  normalizePath(path.join(constants.rootPath, LICENSE))

/**
 * Get root ESLint config file path.
 */
const lazyRootEslintConfigPath = () =>
  normalizePath(path.join(constants.rootPath, ESLINT_CONFIG_JS))

/**
 * Get root node_modules directory path.
 */
const lazyRootNodeModulesPath = () =>
  normalizePath(path.join(constants.rootPath, NODE_MODULES))

/**
 * Get root node_modules/.bin directory path.
 */
const lazyRootNodeModulesBinPath = () =>
  normalizePath(path.join(constants.rootNodeModulesPath, '.bin'))

/**
 * Get root package.json file path.
 */
const lazyRootPackageJsonPath = () =>
  normalizePath(path.join(constants.rootPath, PACKAGE_JSON))

/**
 * Get root package-lock.json file path.
 */
const lazyRootPackageLockPath = () =>
  normalizePath(path.join(constants.rootPath, PACKAGE_LOCK_JSON))

/**
 * Get root packages directory path.
 */
const lazyRootPackagesPath = () =>
  normalizePath(path.join(constants.rootPath, 'packages'))

/**
 * Get project root directory path by finding pnpm-workspace.yaml.
 */
const lazyRootPath = () => {
  // Find project root by looking for pnpm-workspace.yaml.
  // Start from current working directory and walk up.
  let currentPath = process.cwd()
  const root = path.parse(currentPath).root

  while (currentPath !== root) {
    if (
      fs.existsSync(
        normalizePath(path.join(currentPath, 'pnpm-workspace.yaml')),
      )
    ) {
      return normalizePath(currentPath)
    }
    currentPath = path.dirname(currentPath)
  }

  // Fallback if not found (shouldn't happen in normal operation).
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  return normalizePath(path.resolve(__dirname, '..'))
}

/**
 * Get root tsconfig.json file path.
 */
const lazyRootTsConfigPath = () =>
  normalizePath(path.join(constants.rootPath, constants.TSCONFIG_JSON))

/**
 * Get registry package directory path.
 */
const lazyRegistryPkgPath = () =>
  normalizePath(path.join(constants.rootPath, constants.REGISTRY))

/**
 * Get registry extensions.json file path.
 */
const lazyRegistryExtensionsJsonPath = () =>
  normalizePath(path.join(constants.registryPkgPath, constants.EXTENSIONS_JSON))

/**
 * Get registry manifest.json file path.
 */
const lazyRegistryManifestJsonPath = () =>
  normalizePath(path.join(constants.registryPkgPath, constants.MANIFEST_JSON))

/**
 * Get relative npm packages directory path.
 */
const lazyRelNpmPackagesPath = () =>
  normalizePath(path.relative(constants.rootPath, constants.npmPackagesPath))

/**
 * Get relative packages directory path.
 */
const lazyRelPackagesPath = () =>
  normalizePath(path.relative(constants.rootPath, constants.rootPackagesPath))

/**
 * Get relative registry package directory path.
 */
const lazyRelRegistryPkgPath = () =>
  normalizePath(path.relative(constants.rootPath, constants.registryPkgPath))

/**
 * Get relative registry manifest.json file path.
 */
const lazyRelRegistryManifestJsonPath = () =>
  normalizePath(
    path.relative(constants.rootPath, constants.registryManifestJsonPath),
  )

/**
 * Get relative test npm directory path.
 */
const lazyRelTestNpmPath = () =>
  normalizePath(path.relative(constants.rootPath, constants.testNpmPath))

/**
 * Get relative test npm node_modules directory path.
 */
const lazyRelTestNpmNodeModulesPath = () =>
  normalizePath(
    path.relative(constants.rootPath, constants.testNpmNodeModulesPath),
  )

/**
 * Get map of tests to skip by ecosystem.
 */
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

/**
 * Get map of tests that must run on Win32 by ecosystem.
 */
const lazyWin32EnsureTestsByEcosystem = () => {
  return new Map([['npm', new Set(['date'])]])
}

/**
 * Get templates directory path.
 */
const lazyTemplatesPath = () =>
  normalizePath(
    path.join(path.dirname(fileURLToPath(import.meta.url)), 'templates'),
  )

/**
 * Get test npm directory path.
 */
const lazyTestNpmPath = () =>
  normalizePath(path.join(constants.rootPath, `test/${NPM}`))

/**
 * Get test npm fixtures directory path.
 */
const lazyTestNpmFixturesPath = () =>
  normalizePath(path.join(constants.testNpmPath, 'fixtures'))

/**
 * Get test npm node_modules directory path.
 */
const lazyTestNpmNodeModulesPath = () =>
  normalizePath(path.join(constants.testNpmPath, NODE_MODULES))

/**
 * Get test npm packages directory path.
 */
const lazyTestNpmNodeWorkspacesPath = () =>
  normalizePath(path.join(constants.testNpmPath, 'packages'))

/**
 * Get test npm package.json file path.
 */
const lazyTestNpmPkgJsonPath = () =>
  normalizePath(path.join(constants.testNpmPath, PACKAGE_JSON))

/**
 * Get test npm package-lock.json file path.
 */
const lazyTestNpmPkgLockPath = () =>
  normalizePath(path.join(constants.testNpmPath, PACKAGE_LOCK_JSON))

/**
 * Get tsx executable path.
 */
const lazyTsxExecPath = () =>
  whichBinSync('tsx', { ...getDefaultWhichOptions() })

/**
 * Get Yarn package extensions directory path.
 */
const lazyYarnPkgExtsPath = () =>
  normalizePath(path.join(constants.rootNodeModulesPath, '@yarnpkg/extensions'))

/**
 * Get Yarn package extensions package.json file path.
 */
const lazyYarnPkgExtsJsonPath = () =>
  normalizePath(path.join(constants.yarnPkgExtsPath, PACKAGE_JSON))

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
