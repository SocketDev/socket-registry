/**
 * Package metadata, defaults, extensions, and lifecycle scripts.
 */

import { env } from 'node:process'

// Package constants.
export const PACKAGE = 'package'
export const AT_LATEST = '@latest'
export const LATEST = 'latest'
export const PACKAGE_DEFAULT_VERSION = '1.0.0'

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

// Package default Socket categories.
let _packageDefaultSocketCategories: readonly string[]
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
let _packageExtensions: Record<string, unknown>
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

// NPM lifecycle event.
export function getNpmLifecycleEvent(): string | undefined {
  return env.npm_lifecycle_event
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
