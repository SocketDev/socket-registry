/**
 * @file Path constants for project structure.
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { findUpPackageJson } from '@socketsecurity/lib-stable/packages/find'

/**
 * Find project root by looking for pnpm-workspace.yaml. Anchors on this
 * module's own location (per fleet rule: scripts/ must not depend on the
 * caller's cwd).
 */
export function findProjectRoot(): string {
  const __filename = fileURLToPath(import.meta.url)
  let currentPath = path.dirname(__filename)
  const root = path.parse(currentPath).root

  while (currentPath !== root) {
    if (existsSync(path.join(currentPath, 'pnpm-workspace.yaml'))) {
      return normalizePath(currentPath)
    }
    currentPath = path.dirname(currentPath)
  }

  // Fallback: the directory holding the nearest package.json (walks up via the
  // fleet lib helper, so it stays correct if this file moves).
  const nearestPkg = findUpPackageJson(import.meta)
  return normalizePath(
    nearestPkg ? path.dirname(nearestPkg) : path.dirname(__filename),
  )
}

/**
 * Normalize path separators for cross-platform compatibility.
 */
export function normalizePath(p: string): string {
  return p.split(path.sep).join(path.posix.sep)
}

// File and directory names.
export const DOT_GITHUB = '.github'
export const EXTENSIONS_JSON = 'extensions.json'
export const LICENSE = 'LICENSE'
export const LICENSE_ORIGINAL = 'LICENSE.original'
export const MANIFEST_JSON = 'manifest.json'
export const NODE_MODULES = 'node_modules'
export const PACKAGE_JSON = 'package.json'
export const PACKAGE_LOCK_JSON = 'package-lock.json'
export const README_MD = 'README.md'
export const YARN_LOCK = 'yarn.lock'

// Root path.
export const ROOT_PATH = findProjectRoot()
export const EXTERNAL_TOOLS_CONFIG_PATH = normalizePath(
  path.join(ROOT_PATH, '.config', 'repo', 'external-tools.json'),
)
export const NPM_HIGH_IMPACT_MANIFEST_PATH = normalizePath(
  path.join(ROOT_PATH, 'node_modules', 'npm-high-impact', 'package.json'),
)

// Package manager names.
export const NPM = 'npm'
export const PNPM = 'pnpm'

// Registry constants.
export const REGISTRY = 'registry'
export const SOCKET_REGISTRY_SCOPE = '@socketsecurity'

// Computed paths.
export const ROOT_PACKAGE_JSON_PATH = normalizePath(
  path.join(ROOT_PATH, PACKAGE_JSON),
)
export const ROOT_PACKAGES_PATH = normalizePath(
  path.join(ROOT_PATH, 'packages'),
)
export const ROOT_LICENSE_PATH = normalizePath(path.join(ROOT_PATH, LICENSE))
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
export const TEST_NPM_PKG_JSON_PATH = normalizePath(
  path.join(TEST_NPM_PATH, PACKAGE_JSON),
)
export const TEST_NPM_FIXTURES_PATH = normalizePath(
  path.join(TEST_NPM_PATH, 'fixtures'),
)

// Relative paths.
export const REL_REGISTRY_PKG_PATH = normalizePath(
  path.relative(ROOT_PATH, REGISTRY_PKG_PATH),
)
export const REL_REGISTRY_MANIFEST_JSON_PATH = normalizePath(
  path.relative(ROOT_PATH, REGISTRY_MANIFEST_JSON_PATH),
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
