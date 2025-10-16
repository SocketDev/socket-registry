/**
 * @fileoverview Type definitions for constants module.
 */

export interface Constants {
  // Core constants
  BIOME_JSON: string
  DEFAULT_CONCURRENCY: number
  PACKAGES: string
  TEMPLATE_CJS: string
  TEMPLATE_CJS_BROWSER: string
  TEMPLATE_CJS_ESM: string
  TEMPLATE_ES_SHIM_CONSTRUCTOR: string
  TEMPLATE_ES_SHIM_PROTOTYPE_METHOD: string
  TEMPLATE_ES_SHIM_STATIC_METHOD: string

  // Environment
  ENV: Record<string, string | undefined>

  // Node.js constants
  IS_WIN32: boolean
  NODE_VERSION: string
  PLATFORM: string
  WIN32: string

  // File and directory names
  CHANGELOG_MD: string
  DOT_GITHUB: string
  ESLINT_CONFIG_JS: string
  EXTENSIONS_JSON: string
  LICENSE: string
  MANIFEST_JSON: string
  NODE_MODULES: string
  NPM: string
  PACKAGE_JSON: string
  PACKAGE_LOCK_JSON: string
  PNPM: string
  PNPM_LOCK_YAML: string
  README_MD: string
  REGISTRY: string
  SOCKET_REGISTRY_SCOPE: string
  TSCONFIG_JSON: string
  YARN: string
  YARN_LOCK: string

  // Computed paths
  NPM_PACKAGES_PATH: string
  NPM_TEMPLATES_PATH: string
  NPM_TEMPLATES_README_PATH: string
  PERF_NPM_FIXTURES_PATH: string
  PERF_NPM_PATH: string
  REGISTRY_EXTENSIONS_JSON_PATH: string
  REGISTRY_MANIFEST_JSON_PATH: string
  REGISTRY_PKG_PATH: string
  REL_NPM_PACKAGES_PATH: string
  REL_PACKAGES_PATH: string
  REL_REGISTRY_MANIFEST_JSON_PATH: string
  REL_REGISTRY_PKG_PATH: string
  REL_TEST_NPM_NODE_MODULES_PATH: string
  REL_TEST_NPM_PATH: string
  ROOT_CACHE_PATH: string
  ROOT_DOT_GITHUB_ACTIONS_PATH: string
  ROOT_DOT_GITHUB_PATH: string
  ROOT_DOT_GITHUB_WORKFLOWS_PATH: string
  ROOT_NODE_MODULES_BIN_PATH: string
  ROOT_NODE_MODULES_PATH: string
  ROOT_PACKAGE_JSON_PATH: string
  ROOT_PATH: string
  TEST_NPM_NODE_MODULES_PATH: string
  TEST_NPM_PATH: string

  // Lazy getters
  ecosystems: readonly string[]
  gitExecPath: string
  gitIgnoreFile: string
  ignoreGlobs: readonly string[]
  LICENSE_CONTENT: string
  npmPackageNames: readonly string[]
  npmPackagesPath: string
  npmTemplatesPath: string
  npmTemplatesReadmePath: string
  perfNpmFixturesPath: string
  perfNpmPath: string
  registryExtensionsJsonPath: string
  registryManifestJsonPath: string
  registryPkgPath: string
  relNpmPackagesPath: string
  relPackagesPath: string
  relRegistryManifestJsonPath: string
  relRegistryPkgPath: string
  relTestNpmNodeModulesPath: string
  relTestNpmPath: string
  rootCachePath: string
  rootDotGithubActionsPath: string
  rootDotGithubPath: string
  rootDotGithubWorkflowsPath: string
  rootNodeModulesBinPath: string
  rootNodeModulesPath: string
  rootPackageJsonPath: string
  rootPath: string
  testNpmNodeModulesPath: string
  testNpmPath: string

  // Testing
  ALLOW_TEST_FAILURES_BY_ECOSYSTEM: Record<string, readonly string[]>

  // Utilities
  parseArgsConfig: {
    options: Record<string, { type: string; short?: string; default?: unknown }>
    strict: boolean
    allowPositionals: boolean
  }
}

declare const constants: Constants
export default constants
