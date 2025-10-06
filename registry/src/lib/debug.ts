/**
 * @fileoverview Debug logging utilities with lazy loading and environment-based control.
 * Provides Socket CLI specific debug functionality and logging formatters.
 */

import ENV from './constants/ENV'
import {
  getDebug,
  getIsUnicodeSupported,
  getLogger,
  getSpinner,
} from './dependencies/logging'
import { hasOwn } from './objects'
import { applyLinePrefix } from './strings'

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
  const debugJs = getDebug()
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
 * Custom log function for debug output.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function customLog() {
  const logger = getLogger()
  const debugJs = getDebug()
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
 * Debug output for object inspection.
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
  if (inspectOpts === undefined) {
    const debugJs = getDebug()
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
  const spinner = options.spinner || getSpinner()
  const wasSpinning = spinner.isSpinning
  spinner.stop()
  const logger = getLogger()
  logger.dir(obj, inspectOpts)
  if (wasSpinning) {
    spinner.start()
  }
}

let pointingTriangle: string | undefined
/**
 * Debug output with function name prefix.
 */
/*@__NO_SIDE_EFFECTS__*/
function debugFnNs(namespacesOrOpts: NamespacesOrOptions, ...args: unknown[]) {
  const options = extractOptions(namespacesOrOpts)
  const { namespaces } = options
  if (!isEnabled(namespaces as string)) {
    return
  }
  const { stack } = new Error()
  let lineCount = 0
  let lineStart = 0
  let name = 'anonymous'
  // Scan the stack trace character-by-character to find the 4th line
  // (index 3), which is typically the caller of debugFn.
  if (stack) {
    for (let i = 0, { length } = stack; i < length; i += 1) {
      if (stack.charCodeAt(i) === 10 /*'\n'*/) {
        lineCount += 1
        if (lineCount < 4) {
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
  if (pointingTriangle === undefined) {
    const isUnicodeSupported = getIsUnicodeSupported()
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
  const spinner = options.spinner || getSpinner()
  const wasSpinning = spinner.isSpinning
  spinner.stop()
  const logger = getLogger()
  ReflectApply(logger.info, logger, logArgs)
  if (wasSpinning) {
    spinner.start()
  }
}

/**
 * Debug logging function.
 */
/*@__NO_SIDE_EFFECTS__*/
function debugLogNs(namespacesOrOpts: NamespacesOrOptions, ...args: unknown[]) {
  const options = extractOptions(namespacesOrOpts)
  const { namespaces } = options
  if (!isEnabled(namespaces as string)) {
    return
  }
  const spinner = options.spinner || getSpinner()
  const wasSpinning = spinner.isSpinning
  spinner.stop()
  ReflectApply(customLog, undefined, args)
  if (wasSpinning) {
    spinner.start()
  }
}

/**
 * Check if debug mode is enabled.
 */
/*@__NO_SIDE_EFFECTS__*/
function isDebugNs(namespaces: string | undefined): boolean {
  return ENV.SOCKET_DEBUG && isEnabled(namespaces)
}

/**
 * Simple debug check based on DEBUG environment variable.
 */
/*@__NO_SIDE_EFFECTS__*/
export function isDebugSimple(): boolean {
  const debug = process.env['DEBUG']
  if (!debug || debug === '' || debug === '0' || debug === 'false') {
    return false
  }
  return true
}

/**
 * Simple debug log that logs to console when DEBUG is set.
 */
/*@__NO_SIDE_EFFECTS__*/
export function debugLogSimple(...args: unknown[]): void {
  if (isDebugSimple()) {
    console.log(...args)
  }
}

/**
 * Simple debug dir that logs object to console when DEBUG is set.
 */
/*@__NO_SIDE_EFFECTS__*/
export function debugDirSimple(
  obj: unknown,
  options?: InspectOptions | undefined,
): void {
  if (isDebugSimple()) {
    console.dir(obj, options || { depth: null, colors: true })
  }
}

/**
 * Simple debug function that creates a namespaced debug logger.
 */
/*@__NO_SIDE_EFFECTS__*/
function matchPattern(ns: string, pattern: string) {
  if (pattern === '*') {
    return true
  }
  if (pattern.endsWith(':*')) {
    const prefix = pattern.slice(0, -1)
    return ns.startsWith(prefix)
  }
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1)
    return ns.startsWith(prefix)
  }
  return ns === pattern
}

/**
 * Create a simple debug function without external dependencies.
 */
export function debugFnSimple(namespace: string) {
  const log = (...args: unknown[]) => {
    const debug = process.env['DEBUG'] || ''

    // Parse debug patterns.
    const patterns = debug.split(',').map(p => p.trim())
    const negations = patterns
      .filter(p => p.startsWith('-'))
      .map(p => p.slice(1))
    const includes = patterns.filter(p => !p.startsWith('-'))

    // Check if namespace should be skipped.
    for (const neg of negations) {
      if (neg === namespace || matchPattern(namespace, neg)) {
        return
      }
    }

    // Check if namespace should be included.
    let shouldLog = false
    for (const inc of includes) {
      if (inc === '*' || inc === namespace || matchPattern(namespace, inc)) {
        shouldLog = true
        break
      }
    }

    if (shouldLog) {
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] ${namespace}:`, ...args)
    }
  }

  log.enabled = false

  return log
}

/**
 * Create a debug logger similar to util.debuglog.
 */
/*@__NO_SIDE_EFFECTS__*/
export function debuglog(section: string) {
  const log = (...args: unknown[]) => {
    if (isDebugSimple()) {
      console.log(`[${section}]`, ...args)
    }
  }
  return log
}

/**
 * Create a debug timer.
 */
/*@__NO_SIDE_EFFECTS__*/
export function debugtime(section: string) {
  const timers = new Map()

  const timer = (label: string) => {
    if (isDebugSimple()) {
      console.log(`[${section}] ${label}`)
    }
  }

  timer.start = (label: string) => {
    if (isDebugSimple()) {
      timers.set(label, Date.now())
      console.log(`[${section}] ${label}: start`)
    }
  }

  timer.end = (label: string) => {
    if (isDebugSimple()) {
      const start = timers.get(label)
      if (start) {
        const duration = Date.now() - start
        console.log(`[${section}] ${label}: ${duration}ms`)
        timers.delete(label)
      }
    }
  }

  return timer
}

// Export aliases for compatibility.
export { debugDirSimple as debugDir }
export { debugDirNs }
export { debugFnSimple as debugFn }
export { debugFnNs }
export { debugLogSimple as debugLog }
export { debugLogNs }
export { isDebugSimple as isDebug }
export { isDebugNs }
