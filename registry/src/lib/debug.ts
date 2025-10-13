/**
 * @fileoverview Debug logging utilities with lazy loading and environment-based control.
 * Provides Socket CLI specific debug functionality and logging formatters.
 */

import ENV from './constants/ENV'
import spinner from './constants/spinner'
import { logger } from './logger'
import { hasOwn } from './objects'
import { applyLinePrefix } from './strings'
import isUnicodeSupported from '../external/@socketregistry/is-unicode-supported'
import debugJs from '../external/debug'

// IMPORTANT: Do not use destructuring here - use direct assignment instead.
// tsgo has a bug that incorrectly transpiles destructured exports, resulting in
// `exports.SomeName = void 0;` which causes runtime errors.
// See: https://github.com/SocketDev/socket-packageurl-js/issues/3
const ReflectApply = Reflect.apply

// Type definitions
interface DebugOptions {
  namespaces?: string
  spinner?: { isSpinning: boolean; stop(): void; start(): void }
  [key: string]: unknown
}

type NamespacesOrOptions = string | DebugOptions

interface InspectOptions {
  depth?: number | null
  colors?: boolean
  [key: string]: unknown
}

export type { DebugOptions, NamespacesOrOptions, InspectOptions }

const debugByNamespace = new Map()
/**
 * Get or create a debug instance for a namespace.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getDebugJsInstance(namespace: string) {
  let inst = debugByNamespace.get(namespace)
  if (inst) {
    return inst
  }
  if (
    !ENV.DEBUG &&
    ENV.SOCKET_DEBUG &&
    (namespace === 'error' || namespace === 'notice')
  ) {
    debugJs.enable(namespace)
  }
  inst = debugJs(namespace)
  inst.log = customLog
  debugByNamespace.set(namespace, inst)
  return inst
}

let _util: typeof import('util') | undefined
/**
 * Lazily load the util module.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getUtil() {
  if (_util === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _util = /*@__PURE__*/ require('util')
  }
  return _util!
}

/**
 * Extract caller information from the stack trace.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getCallerInfo(stackOffset: number = 3): string {
  let name = ''
  const captureStackTrace = Error.captureStackTrace
  if (typeof captureStackTrace === 'function') {
    const obj: { stack?: unknown } = {}
    captureStackTrace(obj, getCallerInfo)
    const stack = obj.stack
    if (typeof stack === 'string') {
      let lineCount = 0
      let lineStart = 0
      for (let i = 0, { length } = stack; i < length; i += 1) {
        if (stack[i] === '\n') {
          lineCount += 1
          if (lineCount < stackOffset) {
            // Store the start index of the next line.
            lineStart = i + 1
          } else {
            // Extract the full line and trim it.
            const line = stack.slice(lineStart, i).trimStart()
            // Match the function name portion (e.g., "async runFix").
            const match = /(?<=^at\s+).*?(?=\s+\(|$)/.exec(line)?.[0]
            if (match) {
              name = match
                // Strip known V8 invocation prefixes to get the name.
                .replace(/^(?:async|bound|get|new|set)\s+/, '')
              if (name.startsWith('Object.')) {
                // Strip leading 'Object.' if not an own property of Object.
                const afterDot = name.slice(7 /*'Object.'.length*/)
                if (!hasOwn(Object, afterDot)) {
                  name = afterDot
                }
              }
            }
            break
          }
        }
      }
    }
  }
  return name
}

/**
 * Custom log function for debug output.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function customLog() {
  const util = getUtil()
  const inspectOpts = debugJs.inspectOpts
    ? {
        ...debugJs.inspectOpts,
        showHidden:
          debugJs.inspectOpts.showHidden === null
            ? undefined
            : debugJs.inspectOpts.showHidden,
        depth:
          debugJs.inspectOpts.depth === null ||
          typeof debugJs.inspectOpts.depth === 'boolean'
            ? undefined
            : debugJs.inspectOpts.depth,
      }
    : {}
  ReflectApply(logger.info, logger, [
    util.formatWithOptions(inspectOpts, ...arguments),
  ])
}

/**
 * Extract options from namespaces parameter.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function extractOptions(namespaces: NamespacesOrOptions): DebugOptions {
  return namespaces !== null && typeof namespaces === 'object'
    ? ({ __proto__: null, ...namespaces } as DebugOptions)
    : ({ __proto__: null, namespaces } as DebugOptions)
}

/**
 * Check if debug is enabled for given namespaces.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function isEnabled(namespaces: string | undefined) {
  // Check if debugging is enabled at all
  if (!ENV.SOCKET_DEBUG) {
    return false
  }
  if (typeof namespaces !== 'string' || !namespaces || namespaces === '*') {
    return true
  }
  // Namespace splitting logic is based the 'debug' package implementation:
  // https://github.com/debug-js/debug/blob/4.4.1/src/common.js#L169-L173.
  const split = namespaces
    .trim()
    .replace(/\s+/g, ',')
    .split(',')
    .filter(Boolean)
  const names = []
  const skips = []
  for (const ns of split) {
    if (ns.startsWith('-')) {
      skips.push(ns.slice(1))
    } else {
      names.push(ns)
    }
  }
  if (names.length && !names.some(ns => getDebugJsInstance(ns).enabled)) {
    return false
  }
  return skips.every(ns => !getDebugJsInstance(ns).enabled)
}

/**
 * Debug output for object inspection with caller info.
 */
/*@__NO_SIDE_EFFECTS__*/
function debugDirNs(
  namespacesOrOpts: NamespacesOrOptions,
  obj: unknown,
  inspectOpts?: InspectOptions | undefined,
) {
  const options = extractOptions(namespacesOrOpts)
  const { namespaces } = options
  if (!isEnabled(namespaces as string)) {
    return
  }
  // Get caller info with stack offset of 4 (caller -> debugDirNs -> getCallerInfo).
  const callerName = getCallerInfo(4) || 'anonymous'

  if (pointingTriangle === undefined) {
    const supported = isUnicodeSupported()
    pointingTriangle = supported ? '▸' : '>'
  }

  if (inspectOpts === undefined) {
    const opts = debugJs.inspectOpts
    if (opts) {
      inspectOpts = {
        ...opts,
        showHidden: opts.showHidden === null ? undefined : opts.showHidden,
        depth:
          opts.depth === null || typeof opts.depth === 'boolean'
            ? null
            : opts.depth,
      } as InspectOptions
    }
  }
  const spinnerInstance = options.spinner || spinner
  const wasSpinning = spinnerInstance.isSpinning
  spinnerInstance.stop()
  logger.info(`[DEBUG] ${callerName} ${pointingTriangle} object inspection:`)
  logger.dir(obj, inspectOpts)
  if (wasSpinning) {
    spinnerInstance.start()
  }
}

let pointingTriangle: string | undefined
/**
 * Debug output with caller info.
 */
/*@__NO_SIDE_EFFECTS__*/
function debugNs(namespacesOrOpts: NamespacesOrOptions, ...args: unknown[]) {
  const options = extractOptions(namespacesOrOpts)
  const { namespaces } = options
  if (!isEnabled(namespaces as string)) {
    return
  }
  // Get caller info with stack offset of 4 (caller -> debugNs -> getCallerInfo).
  const name = getCallerInfo(4) || 'anonymous'
  if (pointingTriangle === undefined) {
    const supported = isUnicodeSupported()
    pointingTriangle = supported ? '▸' : '>'
  }
  const text = args.at(0)
  const logArgs =
    typeof text === 'string'
      ? [
          applyLinePrefix(
            `${name ? `${name} ${pointingTriangle} ` : ''}${text}`,
            { prefix: '[DEBUG] ' },
          ),
          ...args.slice(1),
        ]
      : args
  const spinnerInstance = options.spinner || spinner
  const wasSpinning = spinnerInstance.isSpinning
  spinnerInstance.stop()
  ReflectApply(logger.info, logger, logArgs)
  if (wasSpinning) {
    spinnerInstance.start()
  }
}

/**
 * Debug logging function with caller info.
 */
/*@__NO_SIDE_EFFECTS__*/
function debugLogNs(namespacesOrOpts: NamespacesOrOptions, ...args: unknown[]) {
  const options = extractOptions(namespacesOrOpts)
  const { namespaces } = options
  if (!isEnabled(namespaces as string)) {
    return
  }
  // Get caller info with stack offset of 4 (caller -> debugLogNs -> getCallerInfo).
  const callerName = getCallerInfo(4) || 'anonymous'

  if (pointingTriangle === undefined) {
    const supported = isUnicodeSupported()
    pointingTriangle = supported ? '▸' : '>'
  }

  const text = args.at(0)
  const logArgs =
    typeof text === 'string'
      ? [
          applyLinePrefix(
            `${callerName ? `${callerName} ${pointingTriangle} ` : ''}${text}`,
            { prefix: '[DEBUG] ' },
          ),
          ...args.slice(1),
        ]
      : [`[DEBUG] ${callerName} ${pointingTriangle}`, ...args]

  const spinnerInstance = options.spinner || spinner
  const wasSpinning = spinnerInstance.isSpinning
  spinnerInstance.stop()
  ReflectApply(logger.info, logger, logArgs)
  if (wasSpinning) {
    spinnerInstance.start()
  }
}

/**
 * Debug output for cache operations with caller info.
 * First argument is the operation type (hit/miss/set/clear).
 * Second argument is the cache key or message.
 * Optional third argument is metadata object.
 */
/*@__NO_SIDE_EFFECTS__*/
function debugCacheNs(
  namespacesOrOpts: NamespacesOrOptions,
  operation: string,
  key: string,
  meta?: unknown | undefined,
) {
  const options = extractOptions(namespacesOrOpts)
  const { namespaces } = options
  if (!isEnabled(namespaces as string)) {
    return
  }
  // Get caller info with stack offset of 4 (caller -> debugCacheNs -> getCallerInfo).
  const callerName = getCallerInfo(4) || 'cache'

  if (pointingTriangle === undefined) {
    const supported = isUnicodeSupported()
    pointingTriangle = supported ? '▸' : '>'
  }

  const prefix = `[CACHE] ${callerName} ${pointingTriangle} ${operation}: ${key}`
  const logArgs = meta !== undefined ? [prefix, meta] : [prefix]

  const spinnerInstance = options.spinner || spinner
  const wasSpinning = spinnerInstance.isSpinning
  spinnerInstance.stop()
  ReflectApply(logger.info, logger, logArgs)
  if (wasSpinning) {
    spinnerInstance.start()
  }
}

/**
 * Cache debug function with caller info.
 */
/*@__NO_SIDE_EFFECTS__*/
export function debugCache(
  operation: string,
  key: string,
  meta?: unknown | undefined,
): void {
  if (!ENV.SOCKET_DEBUG) {
    return
  }
  // Get caller info with stack offset of 3 (caller -> debugCache -> getCallerInfo).
  const callerName = getCallerInfo(3) || 'cache'

  if (pointingTriangle === undefined) {
    const supported = isUnicodeSupported()
    pointingTriangle = supported ? '▸' : '>'
  }

  const prefix = `[CACHE] ${callerName} ${pointingTriangle} ${operation}: ${key}`
  const args = meta !== undefined ? [prefix, meta] : [prefix]
  console.log(...args)
}

/**
 * Check if debug mode is enabled.
 */
/*@__NO_SIDE_EFFECTS__*/
function isDebugNs(namespaces: string | undefined): boolean {
  return ENV.SOCKET_DEBUG && isEnabled(namespaces)
}

/**
 * Debug output with caller info (wrapper for debugNs with default namespace).
 */
/*@__NO_SIDE_EFFECTS__*/
function debug(...args: unknown[]): void {
  debugNs('*', ...args)
}

/**
 * Debug output for object inspection (wrapper for debugDirNs with default namespace).
 */
/*@__NO_SIDE_EFFECTS__*/
function debugDir(
  obj: unknown,
  inspectOpts?: InspectOptions | undefined,
): void {
  debugDirNs('*', obj, inspectOpts)
}

/**
 * Debug logging function (wrapper for debugLogNs with default namespace).
 */
/*@__NO_SIDE_EFFECTS__*/
function debugLog(...args: unknown[]): void {
  debugLogNs('*', ...args)
}

/**
 * Check if debug mode is enabled.
 */
/*@__NO_SIDE_EFFECTS__*/
function isDebug(): boolean {
  return ENV.SOCKET_DEBUG
}

// Export main debug functions with caller info.
export { debug }
// debugCache is already exported directly above
export { debugCacheNs }
export { debugDir }
export { debugDirNs }
export { debugLog }
export { debugLogNs }
export { debugNs }
export { isDebug }
export { isDebugNs }
