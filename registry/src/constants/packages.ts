/**
 * Package metadata, defaults, extensions, and lifecycle scripts.
 */

import { npm_lifecycle_event } from '#env/npm-lifecycle-event'

let _lifecycleScriptNames: string[]
let _packageDefaultNodeRange: string | undefined
let _packageDefaultSocketCategories: readonly string[]
let _packageExtensions: Iterable<[string, unknown]>
let _pacoteCachePath: string
let _packumentCache: Map<string, unknown>

// Package constants.
export const PACKAGE = 'package'
export const AT_LATEST = '@latest'
export const LATEST = 'latest'
export const PACKAGE_DEFAULT_VERSION = '1.0.0'

// Package default Node range.
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

// Package default Socket categories.
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

// Package extensions.
export function getPackageExtensions(): Iterable<[string, unknown]> {
  if (_packageExtensions === undefined) {
    try {
      const exts = require('../lib/package-extensions')
      _packageExtensions = Object.entries(exts)
    } catch {
      _packageExtensions = []
    }
  }
  return _packageExtensions
}

// NPM lifecycle event.
export function getNpmLifecycleEvent(): string | undefined {
  return npm_lifecycle_event
}

// Lifecycle script names.
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

// Packument cache.
export function getPackumentCache(): Map<string, unknown> {
  if (_packumentCache === undefined) {
    _packumentCache = new Map()
  }
  return _packumentCache
}

// Pacote cache path.
export function getPacoteCachePath(): string {
  if (_pacoteCachePath === undefined) {
    try {
      const pacote = require('../external/pacote')
      const { normalizePath } = require('../lib/path')
      const proto = Reflect.getPrototypeOf(
        (pacote as { RegistryFetcher: { prototype: object } }).RegistryFetcher
          .prototype,
      ) as { constructor?: new (...args: unknown[]) => { cache: string } }
      const PacoteFetcherBase = proto?.constructor
      const cachePath = PacoteFetcherBase
        ? new PacoteFetcherBase(/*dummy package spec*/ 'x', {}).cache
        : ''
      _pacoteCachePath = normalizePath(cachePath)
    } catch {
      _pacoteCachePath = ''
    }
  }
  return _pacoteCachePath
}
