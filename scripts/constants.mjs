/**
 * @fileoverview Configuration constants and CLI argument parsing for build scripts.
 * Provides shared configuration, paths, and environment settings for registry operations.
 */

import { EMPTY_FILE } from '@socketsecurity/lib/constants/core'
import { UTF8 } from '@socketsecurity/lib/constants/encoding'
import * as core from './constants/core.mjs'
import * as env from './constants/env.mjs'
import * as node from './constants/node.mjs'
import * as paths from './constants/paths.mjs'
import * as templates from './constants/templates.mjs'
import * as testing from './constants/testing.mjs'
import * as utils from './constants/utils.mjs'

// Re-export all constants.
export default {
  __proto__: null,
  // Core constants.
  ...core,
  EMPTY_FILE,
  // Environment.
  ENV: env.getEnv(),
  UTF8,
  // Node.js constants.
  ...node,
  // Paths.
  ...paths,
  // Templates.
  ...templates,
  // Testing.
  ALLOW_TEST_FAILURES_BY_ECOSYSTEM: testing.ALLOW_TEST_FAILURES_BY_ECOSYSTEM,
  // Utilities (lazy getters).
  get ecosystems() {
    return testing.getEcosystems()
  },
  get gitExecPath() {
    return utils.getGitExecPath()
  },
  get gitIgnoreFile() {
    return utils.getGitIgnoreFile()
  },
  get ignoreGlobs() {
    return utils.getIgnoreGlobs()
  },
  get LICENSE_CONTENT() {
    return utils.getLicenseContent()
  },
  get npmPackageNames() {
    return testing.getNpmPackageNames()
  },
  get npmPackagesPath() {
    return paths.NPM_PACKAGES_PATH
  },
  get npmTemplatesPath() {
    return paths.NPM_TEMPLATES_PATH
  },
  get npmTemplatesReadmePath() {
    return paths.NPM_TEMPLATES_README_PATH
  },
  parseArgsConfig: utils.PARSE_ARGS_CONFIG,
  get perfNpmFixturesPath() {
    return paths.PERF_NPM_FIXTURES_PATH
  },
  get perfNpmPath() {
    return paths.PERF_NPM_PATH
  },
  get registryExtensionsJsonPath() {
    return paths.REGISTRY_EXTENSIONS_JSON_PATH
  },
  get registryManifestJsonPath() {
    return paths.REGISTRY_MANIFEST_JSON_PATH
  },
  get registryPkgPath() {
    return paths.REGISTRY_PKG_PATH
  },
  get relNpmPackagesPath() {
    return paths.REL_NPM_PACKAGES_PATH
  },
  get relPackagesPath() {
    return paths.REL_PACKAGES_PATH
  },
  get relRegistryManifestJsonPath() {
    return paths.REL_REGISTRY_MANIFEST_JSON_PATH
  },
  get relRegistryPkgPath() {
    return paths.REL_REGISTRY_PKG_PATH
  },
  get relTestNpmNodeModulesPath() {
    return paths.REL_TEST_NPM_NODE_MODULES_PATH
  },
  get relTestNpmPath() {
    return paths.REL_TEST_NPM_PATH
  },
  get rootCachePath() {
    return paths.ROOT_CACHE_PATH
  },
  get rootDotGithubActionsPath() {
    return paths.ROOT_DOT_GITHUB_ACTIONS_PATH
  },
  get rootDotGithubPath() {
    return paths.ROOT_DOT_GITHUB_PATH
  },
  get rootDotGithubWorkflowsPath() {
    return paths.ROOT_DOT_GITHUB_WORKFLOWS_PATH
  },
  get rootNodeModulesBinPath() {
    return paths.ROOT_NODE_MODULES_BIN_PATH
  },
  get rootNodeModulesPath() {
    return paths.ROOT_NODE_MODULES_PATH
  },
  get rootPackageJsonPath() {
    return paths.ROOT_PACKAGE_JSON_PATH
  },
  get rootPath() {
    return paths.ROOT_PATH
  },
  get testNpmNodeModulesPath() {
    return paths.TEST_NPM_NODE_MODULES_PATH
  },
  get testNpmPath() {
    return paths.TEST_NPM_PATH
  },
}
