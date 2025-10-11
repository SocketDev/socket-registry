/**
 * Lazy-loaded constants that require runtime computation.
 * These are evaluated on first access to avoid initialization issues.
 */

import { platform } from 'node:os'
import { env } from 'node:process'

// Platform detection.
const _platform = platform()
export const DARWIN = _platform === 'darwin'
export const WIN32 = _platform === 'win32'

// Node.js version and feature support detection.
export function getNodeVersion(): string {
  return process.version
}

export function getNodeMajorVersion(): number {
  return parseInt(process.version.slice(1).split('.')[0] || '0', 10)
}

export function supportsNodeCompileCacheApi(): boolean {
  const major = getNodeMajorVersion()
  return major >= 24
}

export function supportsNodeCompileCacheEnvVar(): boolean {
  const major = getNodeMajorVersion()
  return major >= 22
}

export function supportsNodeDisableWarningFlag(): boolean {
  const major = getNodeMajorVersion()
  return major >= 21
}

export function supportsNodePermissionFlag(): boolean {
  const major = getNodeMajorVersion()
  return major >= 20
}

export function supportsNodeRequireModule(): boolean {
  const major = getNodeMajorVersion()
  return major >= 23 || (major === 22 && parseInt(process.version.split('.')[1] || '0', 10) >= 12)
}

export function supportsNodeRun(): boolean {
  const major = getNodeMajorVersion()
  return major >= 23 || (major === 22 && parseInt(process.version.split('.')[1] || '0', 10) >= 11)
}

export function supportsProcessSend(): boolean {
  return typeof process.send === 'function'
}

// Package manager execution paths.
export function getNpmExecPath(): string | undefined {
  return env['npm_execpath']
}

export function getNpmRealExecPath(): string | undefined {
  return env['NPM_CONFIG_REAL_EXEC_PATH']
}

export function getPnpmExecPath(): string | undefined {
  return env['PNPM_SCRIPT_SRC_DIR']
}

export function getYarnExecPath(): string | undefined {
  return env['BERRY_BIN_FOLDER'] || env['YARN_SCRIPT_PATH']
}

// Package manager cache paths.
export function getBunCachePath(): string | undefined {
  return env['BUN_CACHE_DIR']
}

export function getPnpmStorePath(): string | undefined {
  return env['PNPM_STORE_DIR']
}

export function getVltCachePath(): string | undefined {
  return env['VLT_CACHE_DIR']
}

export function getYarnCachePath(): string | undefined {
  return env['YARN_CACHE_FOLDER']
}

// NPM lifecycle event.
export function getNpmLifecycleEvent(): string | undefined {
  return env['npm_lifecycle_event']
}

// Exec path.
export function getExecPath(): string {
  return process.execPath
}

// Package extensions data.
let _packageExtensions: any
export function getPackageExtensions() {
  if (_packageExtensions === undefined) {
    try {
      _packageExtensions = require('../lib/package-extensions')
    } catch {
      _packageExtensions = {}
    }
  }
  return _packageExtensions
}

// Package default Socket categories.
let _packageDefaultSocketCategories: any
export function getPackageDefaultSocketCategories() {
  if (_packageDefaultSocketCategories === undefined) {
    try {
      _packageDefaultSocketCategories = require('../lib/package-default-socket-categories')
    } catch {
      _packageDefaultSocketCategories = []
    }
  }
  return _packageDefaultSocketCategories
}

// Package default Node range.
let _packageDefaultNodeRange: string | undefined
export function getPackageDefaultNodeRange(): string | undefined {
  if (_packageDefaultNodeRange === undefined) {
    try {
      _packageDefaultNodeRange = require('../lib/package-default-node-range')
    } catch {
      _packageDefaultNodeRange = '>=18'
    }
  }
  return _packageDefaultNodeRange
}

// Maintained Node versions.
let _maintainedNodeVersions: any
export function getMaintainedNodeVersions() {
  if (_maintainedNodeVersions === undefined) {
    try {
      _maintainedNodeVersions = require('../lib/maintained-node-versions')
    } catch {
      _maintainedNodeVersions = []
    }
  }
  return _maintainedNodeVersions
}

// Lifecycle script names.
let _lifecycleScriptNames: string[]
export function getLifecycleScriptNames(): string[] {
  if (_lifecycleScriptNames === undefined) {
    try {
      _lifecycleScriptNames = require('../lib/lifecycle-script-names')
    } catch {
      _lifecycleScriptNames = []
    }
  }
  return _lifecycleScriptNames
}

// Node debug flags.
let _nodeDebugFlags: string[]
export function getNodeDebugFlags(): string[] {
  if (_nodeDebugFlags === undefined) {
    _nodeDebugFlags = [
      '--inspect',
      '--inspect-brk',
      '--inspect-port',
      '--inspect-publish-uid',
    ]
  }
  return _nodeDebugFlags
}

// Node harden flags.
let _nodeHardenFlags: string[]
export function getNodeHardenFlags(): string[] {
  if (_nodeHardenFlags === undefined) {
    _nodeHardenFlags = [
      '--disable-proto=delete',
      '--experimental-permission',
      '--experimental-policy',
      '--force-node-api-uncaught-exceptions-policy',
    ]
  }
  return _nodeHardenFlags
}

// Node no-warnings flags.
let _nodeNoWarningsFlags: string[]
export function getNodeNoWarningsFlags(): string[] {
  if (_nodeNoWarningsFlags === undefined) {
    _nodeNoWarningsFlags = ['--no-warnings', '--no-deprecation']
  }
  return _nodeNoWarningsFlags
}

// Package manager cache names.
let _packageManagerCacheNames: string[]
export function getPackageManagerCacheNames(): string[] {
  if (_packageManagerCacheNames === undefined) {
    _packageManagerCacheNames = [
      '.npm',
      '.pnpm-store',
      '.yarn',
      '.bun',
      '.vlt',
    ]
  }
  return _packageManagerCacheNames
}

// Copy-left licenses.
let _copyLeftLicenses: Set<string>
export function getCopyLeftLicenses(): Set<string> {
  if (_copyLeftLicenses === undefined) {
    _copyLeftLicenses = new Set([
      'GPL',
      'GPL-2.0',
      'GPL-3.0',
      'LGPL',
      'LGPL-2.0',
      'LGPL-2.1',
      'LGPL-3.0',
      'AGPL',
      'AGPL-3.0',
      'MPL',
      'MPL-2.0',
    ])
  }
  return _copyLeftLicenses
}

// TypeScript types/libs availability.
export function getTsTypesAvailable(): boolean {
  try {
    require.resolve('typescript/lib/lib.d.ts')
    return true
  } catch {
    return false
  }
}

export function getTsLibsAvailable(): boolean {
  try {
    require.resolve('typescript/lib')
    return true
  } catch {
    return false
  }
}

// Packument cache.
let _packumentCache: Map<string, any>
export function getPackumentCache(): Map<string, any> {
  if (_packumentCache === undefined) {
    _packumentCache = new Map()
  }
  return _packumentCache
}

// Pacote cache path.
let _pacoteCachePath: string | undefined
export function getPacoteCachePath(): string | undefined {
  if (_pacoteCachePath === undefined) {
    const cachePath = env['npm_config_cache']
    if (cachePath) {
      const path = require('node:path')
      _pacoteCachePath = path.join(cachePath, '_cacache')
    }
  }
  return _pacoteCachePath
}

// Abort controller and signal.
let _abortController: AbortController
export function getAbortController(): AbortController {
  if (_abortController === undefined) {
    _abortController = new AbortController()
  }
  return _abortController
}

export function getAbortSignal(): AbortSignal {
  return getAbortController().signal
}

// Spinner instance.
let _spinner: any
export function getSpinner() {
  if (_spinner === undefined) {
    try {
      const { createSpinner } = require('../lib/spinner')
      _spinner = createSpinner()
    } catch {
      _spinner = null
    }
  }
  return _spinner
}