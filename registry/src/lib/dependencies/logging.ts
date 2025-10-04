/** @fileoverview Logging and debug dependency registry. */

export interface Logger {
  dir(obj: unknown, options?: unknown): void
  error(...args: unknown[]): void
  info(...args: unknown[]): void
}

export interface Spinner {
  isSpinning: boolean
  start(): void
  stop(): void
}

export interface DebugJs {
  (namespace: string): (...args: unknown[]) => void
  enable(namespaces: string): void
  enabled(name: string): boolean
  inspectOpts?: {
    colors?: boolean
    depth?: boolean | number | null
    showHidden?: boolean | null
    [key: string]: unknown
  }
}

export type YoctoSpinner = {
  (
    options?: unknown,
  ): {
    constructor: {
      spinners: Record<string, unknown>
    }
    [key: string]: unknown
  }
}

export interface IsUnicodeSupported {
  (): boolean
}

export interface Yoctocolors {
  bold(text: string): string
  cyan(text: string): string
  dim(text: string): string
  gray(text: string): string
  green(text: string): string
  magenta(text: string): string
  red(text: string): string
  yellow(text: string): string
}

interface LoggingDependencies {
  debug: DebugJs | undefined
  isUnicodeSupported: IsUnicodeSupported | undefined
  logger: Logger | undefined
  spinner: Spinner | undefined
  yoctoSpinner: YoctoSpinner | undefined
  yoctocolors: Yoctocolors | undefined
}

const dependencies: LoggingDependencies = {
  debug: undefined,
  isUnicodeSupported: undefined,
  logger: undefined,
  spinner: undefined,
  yoctoSpinner: undefined,
  yoctocolors: undefined,
}

/**
 * Get debug.js instance, lazily loading if not set.
 */
export function getDebug(): DebugJs {
  if (!dependencies.debug) {
    const debugExport = require('../../external/debug')
    dependencies.debug = debugExport.default
  }
  return dependencies.debug!
}

/**
 * Get is-unicode-supported instance, lazily loading if not set.
 */
export function getIsUnicodeSupported(): IsUnicodeSupported {
  if (!dependencies.isUnicodeSupported) {
    dependencies.isUnicodeSupported = require('../../external/@socketregistry/is-unicode-supported')
  }
  return dependencies.isUnicodeSupported!
}

/**
 * Get logger instance, lazily loading if not set.
 */
export function getLogger(): Logger {
  if (!dependencies.logger) {
    const { logger } = require('../logger.js')
    dependencies.logger = logger
  }
  return dependencies.logger!
}

/**
 * Get spinner instance, lazily loading if not set.
 */
export function getSpinner(): Spinner {
  if (!dependencies.spinner) {
    dependencies.spinner = require('../constants/spinner.js')
  }
  return dependencies.spinner!
}

/**
 * Get yocto-spinner instance, lazily loading if not set.
 */
export function getYoctoSpinner(): YoctoSpinner {
  if (!dependencies.yoctoSpinner) {
    dependencies.yoctoSpinner = require('../../external/@socketregistry/yocto-spinner')
  }
  return dependencies.yoctoSpinner!
}

/**
 * Get yoctocolors instance, lazily loading if not set.
 */
export function getYoctocolors(): Yoctocolors {
  if (!dependencies.yoctocolors) {
    dependencies.yoctocolors = require('../../external/yoctocolors-cjs')
  }
  return dependencies.yoctocolors!
}

/**
 * Set debug.js instance (useful for testing).
 */
export function setDebug(debug: DebugJs): void {
  dependencies.debug = debug
}

/**
 * Set is-unicode-supported instance (useful for testing).
 */
export function setIsUnicodeSupported(
  isUnicodeSupported: IsUnicodeSupported,
): void {
  dependencies.isUnicodeSupported = isUnicodeSupported
}

/**
 * Set logger instance (useful for testing or custom loggers).
 */
export function setLogger(logger: Logger): void {
  dependencies.logger = logger
}

/**
 * Set spinner instance (useful for testing or custom spinners).
 */
export function setSpinner(spinner: Spinner): void {
  dependencies.spinner = spinner
}

/**
 * Set yocto-spinner instance (useful for testing).
 */
export function setYoctoSpinner(yoctoSpinner: YoctoSpinner): void {
  dependencies.yoctoSpinner = yoctoSpinner
}

/**
 * Set yoctocolors instance (useful for testing).
 */
export function setYoctocolors(yoctocolors: Yoctocolors): void {
  dependencies.yoctocolors = yoctocolors
}

/**
 * Reset all logging dependencies to undefined (forces reload on next access).
 */
export function resetLoggingDependencies(): void {
  dependencies.debug = undefined
  dependencies.isUnicodeSupported = undefined
  dependencies.logger = undefined
  dependencies.spinner = undefined
  dependencies.yoctoSpinner = undefined
  dependencies.yoctocolors = undefined
}
