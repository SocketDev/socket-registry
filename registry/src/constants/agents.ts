/**
 * Package management agents (npm, pnpm, yarn, bun, vlt).
 * Configuration, paths, caches, and utilities for package managers.
 */

import { env } from 'node:process'

// Agent names.
export const NPM = 'npm'
export const PNPM = 'pnpm'
export const YARN = 'yarn'
export const BUN = 'bun'
export const VLT = 'vlt'
export const NPX = 'npx'

// NPM registry URL.
export const NPM_REGISTRY_URL = 'https://registry.npmjs.org'

// Agent variants.
export const YARN_BERRY = 'yarn/berry'
export const YARN_CLASSIC = 'yarn/classic'

// Lock files.
export const PACKAGE_LOCK = 'package-lock'
export const PACKAGE_LOCK_JSON = 'package-lock.json'
export const NPM_SHRINKWRAP_JSON = 'npm-shrinkwrap.json'
export const PNPM_LOCK = 'pnpm-lock'
export const PNPM_LOCK_YAML = 'pnpm-lock.yaml'
export const YARN_LOCK = 'yarn.lock'
export const BUN_LOCK = 'bun.lock'
export const BUN_LOCKB = 'bun.lockb'
export const VLT_LOCK_JSON = 'vlt-lock.json'

// Workspace configuration.
export const PNPM_WORKSPACE_YAML = 'pnpm-workspace.yaml'

// Package.json fields for dependency overrides.
export const OVERRIDES = 'overrides'
export const RESOLUTIONS = 'resolutions'

// Agent execution paths.
export function getNpmExecPath(): string | undefined {
  return env.npm_execpath
}

export function getNpmRealExecPath(): string | undefined {
  return env.NPM_CONFIG_REAL_EXEC_PATH
}

export function getPnpmExecPath(): string | undefined {
  return env.PNPM_SCRIPT_SRC_DIR
}

export function getYarnExecPath(): string | undefined {
  return env.BERRY_BIN_FOLDER || env.YARN_SCRIPT_PATH
}

// Agent cache paths.
export function getBunCachePath(): string | undefined {
  return env.BUN_CACHE_DIR
}

export function getPnpmStorePath(): string | undefined {
  return env.PNPM_STORE_DIR
}

export function getVltCachePath(): string | undefined {
  return env.VLT_CACHE_DIR
}

export function getYarnCachePath(): string | undefined {
  return env.YARN_CACHE_FOLDER
}

export function getPacoteCachePath(): string | undefined {
  const cachePath = env.npm_config_cache
  if (cachePath) {
    const path = require('node:path')
    return path.join(cachePath, '_cacache')
  }
  return undefined
}

// Agent cache directory names.
let _packageManagerCacheNames: string[]
export function getPackageManagerCacheNames(): string[] {
  if (_packageManagerCacheNames === undefined) {
    _packageManagerCacheNames = ['.npm', '.pnpm-store', '.yarn', '.bun', '.vlt']
  }
  return _packageManagerCacheNames
}

// Packument cache for package metadata.
let _packumentCache: Map<string, unknown>
export function getPackumentCache(): Map<string, unknown> {
  if (_packumentCache === undefined) {
    _packumentCache = new Map()
  }
  return _packumentCache
}
