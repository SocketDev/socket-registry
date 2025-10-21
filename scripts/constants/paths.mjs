/**
 * @fileoverview Path constants for project structure.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getTsxExecPath } from './utils.mjs'

/**
 * Normalize path separators for cross-platform compatibility.
 */
function normalizePath(p) {
  return p.split(path.sep).join(path.posix.sep)
}

/**
 * Find project root by looking for pnpm-workspace.yaml.
 */
function findProjectRoot() {
  let currentPath = process.cwd()
  const root = path.parse(currentPath).root

  while (currentPath !== root) {
    if (fs.existsSync(path.join(currentPath, 'pnpm-workspace.yaml'))) {
      return normalizePath(currentPath)
    }
    currentPath = path.dirname(currentPath)
  }

  // Fallback.
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  return normalizePath(path.resolve(__dirname, '..', '..'))
}

// File and directory names.
export const CHANGELOG_MD = 'CHANGELOG.md'
export const DOT_GITHUB = '.github'
export const ESLINT_CONFIG_JS = 'eslint.config.js'
export const EXTENSIONS_JSON = 'extensions.json'
export const LICENSE = 'LICENSE'
export const LICENSE_ORIGINAL = 'LICENSE.original'
export const MANIFEST_JSON = 'manifest.json'
export const NODE_MODULES = 'node_modules'
export const PACKAGE_JSON = 'package.json'
export const PACKAGE_LOCK_JSON = 'package-lock.json'
export const PNPM_LOCK_YAML = 'pnpm-lock.yaml'
export const README_MD = 'README.md'
export const TSCONFIG_JSON = 'tsconfig.json'
export const YARN_LOCK = 'yarn.lock'

// Root path.
export const ROOT_PATH = findProjectRoot()

// Package manager names.
export const NPM = 'npm'
export const PNPM = 'pnpm'
export const YARN = 'yarn'

// Registry constants.
export const REGISTRY = 'registry'
export const SOCKET_REGISTRY_SCOPE = '@socketsecurity'

// Computed paths.
export const ROOT_NODE_MODULES_PATH = normalizePath(
  path.join(ROOT_PATH, NODE_MODULES),
)
export const ROOT_NODE_MODULES_BIN_PATH = normalizePath(
  path.join(ROOT_NODE_MODULES_PATH, '.bin'),
)
export const ROOT_PACKAGE_JSON_PATH = normalizePath(
  path.join(ROOT_PATH, PACKAGE_JSON),
)
export const ROOT_PACKAGE_LOCK_PATH = normalizePath(
  path.join(ROOT_PATH, PACKAGE_LOCK_JSON),
)
export const ROOT_PACKAGES_PATH = normalizePath(
  path.join(ROOT_PATH, 'packages'),
)
export const ROOT_LICENSE_PATH = normalizePath(path.join(ROOT_PATH, LICENSE))
export const ROOT_ESLINT_CONFIG_PATH = normalizePath(
  path.join(ROOT_PATH, ESLINT_CONFIG_JS),
)
export const ROOT_TSCONFIG_PATH = normalizePath(
  path.join(ROOT_PATH, TSCONFIG_JSON),
)
export const NPM_PACKAGES_PATH = normalizePath(
  path.join(ROOT_PACKAGES_PATH, NPM),
)
export const REGISTRY_PKG_PATH = normalizePath(path.join(ROOT_PATH, REGISTRY))
export const REGISTRY_MANIFEST_JSON_PATH = normalizePath(
  path.join(REGISTRY_PKG_PATH, MANIFEST_JSON),
)
export const REGISTRY_EXTENSIONS_JSON_PATH = normalizePath(
  path.join(REGISTRY_PKG_PATH, EXTENSIONS_JSON),
)
export const TEST_NPM_PATH = normalizePath(path.join(ROOT_PATH, `test/${NPM}`))
export const TEST_NPM_NODE_MODULES_PATH = normalizePath(
  path.join(TEST_NPM_PATH, NODE_MODULES),
)
export const TEST_NPM_PKG_JSON_PATH = normalizePath(
  path.join(TEST_NPM_PATH, PACKAGE_JSON),
)
export const TEST_NPM_PKG_LOCK_PATH = normalizePath(
  path.join(TEST_NPM_PATH, PACKAGE_LOCK_JSON),
)
export const TEST_NPM_FIXTURES_PATH = normalizePath(
  path.join(TEST_NPM_PATH, 'fixtures'),
)
export const TEST_NPM_NODE_WORKSPACES_PATH = normalizePath(
  path.join(TEST_NPM_PATH, 'packages'),
)

// Relative paths.
export const REL_NPM_PACKAGES_PATH = normalizePath('packages/npm')
export const REL_PACKAGES_PATH = normalizePath(
  path.relative(ROOT_PATH, ROOT_PACKAGES_PATH),
)
export const REL_REGISTRY_PKG_PATH = normalizePath(
  path.relative(ROOT_PATH, REGISTRY_PKG_PATH),
)
export const REL_REGISTRY_MANIFEST_JSON_PATH = normalizePath(
  path.relative(ROOT_PATH, REGISTRY_MANIFEST_JSON_PATH),
)
export const REL_TEST_NPM_PATH = normalizePath(
  path.relative(ROOT_PATH, TEST_NPM_PATH),
)
export const REL_TEST_NPM_NODE_MODULES_PATH = normalizePath(
  path.relative(ROOT_PATH, TEST_NPM_NODE_MODULES_PATH),
)

// Template paths.
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
export const TEMPLATES_PATH = normalizePath(
  path.join(__dirname, '..', 'templates'),
)
export const NPM_TEMPLATES_PATH = normalizePath(path.join(TEMPLATES_PATH, NPM))
export const NPM_TEMPLATES_README_PATH = normalizePath(
  path.join(NPM_TEMPLATES_PATH, README_MD),
)

// Performance test paths.
export const PERF_NPM_PATH = normalizePath(path.join(ROOT_PATH, `perf/${NPM}`))
export const PERF_NPM_FIXTURES_PATH = normalizePath(
  path.join(PERF_NPM_PATH, 'fixtures'),
)

// Cache paths.
export const ROOT_CACHE_PATH = normalizePath(path.join(ROOT_PATH, '.cache'))
export const ROOT_GITHUB_CACHE_PATH = normalizePath(
  path.join(ROOT_CACHE_PATH, 'github'),
)

// GitHub paths.
export const ROOT_DOT_GITHUB_PATH = normalizePath(
  path.join(ROOT_PATH, DOT_GITHUB),
)
export const ROOT_DOT_GITHUB_ACTIONS_PATH = normalizePath(
  path.join(ROOT_DOT_GITHUB_PATH, 'actions'),
)
export const ROOT_DOT_GITHUB_WORKFLOWS_PATH = normalizePath(
  path.join(ROOT_DOT_GITHUB_PATH, 'workflows'),
)

// Binary paths.
export const TSX_EXEC_PATH = getTsxExecPath()
