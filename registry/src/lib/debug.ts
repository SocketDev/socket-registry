/**
 * @fileoverview Debug logging utilities with lazy loading and environment-based control.
 * Provides Socket CLI specific debug functionality and logging formatters.
 */

const { apply: ReflectApply } = Reflect

const { hasOwn } = /*@__PURE__*/ require('./objects')
const { applyLinePrefix } = /*@__PURE__*/ require('./strings')

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

let _debugJs: typeof import('debug').default | undefined
/**
 * Lazily load the debug module.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getDebugJs() {
  if (_debugJs === undefined) {
    // The 'debug' package is browser safe.
    const debugExport = /*@__PURE__*/ require('../external/debug').default
    _debugJs = debugExport.default
  }
  return _debugJs!
}

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
  const debugJs = getDebugJs()
  const ENV = /*@__PURE__*/ require('./constants/ENV').default
  if (
    !ENV.DEBUG &&
    ENV.SOCKET_CLI_DEBUG &&
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
  const { logger } = /*@__PURE__*/ require('./logger')
  const debugJs = getDebugJs()
  const util = getUtil()
  const inspectOpts = debugJs.inspectOpts
    ? {
        ...debugJs.inspectOpts,
        showHidden:
          debugJs.inspectOpts.showHidden === null
            ? undefined
            : debugJs.inspectOpts.showHidden,
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
function extractOptions(namespaces: any) {
  return namespaces !== null && typeof namespaces === 'object'
    ? { __proto__: null, ...namespaces }
    : { __proto__: null, namespaces }
}

/**
 * Check if debug is enabled for given namespaces.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function isEnabled(namespaces: any) {
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
/* c8 ignore start - Debug utilities only used in development. */
function debugDirComplex(namespacesOrOpts: any, obj: any, inspectOpts?: any) {
  const options = extractOptions(namespacesOrOpts)
  const { namespaces } = options
  if (!isEnabled(namespaces)) {
    return
  }
  if (inspectOpts === undefined) {
    const debugJs = getDebugJs()
    inspectOpts = debugJs.inspectOpts
  }
  const { spinner = /*@__PURE__*/ require('./constants/spinner').default } =
    options
  const wasSpinning = spinner.isSpinning
  spinner.stop()
  const { logger } = /*@__PURE__*/ require('./logger')
  logger.dir(obj, inspectOpts)
  if (wasSpinning) {
    spinner.start()
  }
}
/* c8 ignore stop */

let pointingTriangle: string | undefined
/**
 * Debug output with function name prefix.
 */
/*@__NO_SIDE_EFFECTS__*/
/* c8 ignore start - Debug utilities only used in development. */
function debugFnComplex(namespacesOrOpts: NamespacesOrOptions, ...args: any[]) {
  const options = extractOptions(namespacesOrOpts)
  const { namespaces } = options
  if (!isEnabled(namespaces)) {
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
    const supported =
      /*@__PURE__*/ require('../external/@socketregistry/is-unicode-supported').default()
    pointingTriangle = supported ? '▸' : '>'
  }
  const text = args.at(0)
  const logArgs =
    typeof text === 'string'
      ? [
          applyLinePrefix(
            `${name ? `${name} ${pointingTriangle} ` : ''}${text}`,
            '[DEBUG] ',
          ),
          ...args.slice(1),
        ]
      : args
  const { spinner = /*@__PURE__*/ require('./constants/spinner').default } =
    options
  const wasSpinning = spinner.isSpinning
  spinner.stop()
  const { logger } = /*@__PURE__*/ require('./logger')
  ReflectApply(logger.info, logger, logArgs)
  if (wasSpinning) {
    spinner.start()
  }
}
/* c8 ignore stop */

/**
 * Debug logging function.
 */
/*@__NO_SIDE_EFFECTS__*/
/* c8 ignore start - Debug utilities only used in development. */
function debugLogComplex(namespacesOrOpts: any, ...args: any[]) {
  const options = extractOptions(namespacesOrOpts)
  const { namespaces } = options
  if (!isEnabled(namespaces)) {
    return
  }
  const { spinner = /*@__PURE__*/ require('./constants/spinner').default } =
    options
  const wasSpinning = spinner.isSpinning
  spinner.stop()
  ReflectApply(customLog, undefined, args)
  if (wasSpinning) {
    spinner.start()
  }
}
/* c8 ignore stop */

/**
 * Check if debug mode is enabled.
 */
/*@__NO_SIDE_EFFECTS__*/
/* c8 ignore start - Debug utilities only used in development. */
function isDebugComplex(namespaces: any): boolean {
  const ENV = /*@__PURE__*/ require('./constants/ENV').default
  return ENV.SOCKET_CLI_DEBUG && isEnabled(namespaces)
}
/* c8 ignore stop */

/**
 * Simple debug check based on DEBUG environment variable.
 */
/*@__NO_SIDE_EFFECTS__*/
/* c8 ignore start - Debug utilities only used in development. */
export function isDebugSimple(): boolean {
  const debug = process.env['DEBUG']
  if (!debug || debug === '' || debug === '0' || debug === 'false') {
    return false
  }
  return true
}
/* c8 ignore stop */

/**
 * Simple debug log that logs to console when DEBUG is set.
 */
/*@__NO_SIDE_EFFECTS__*/
/* c8 ignore start - Debug utilities only used in development. */
export function debugLogSimple(...args: any[]): void {
  if (isDebugSimple()) {
    console.log(...args)
  }
}
/* c8 ignore stop */

/**
 * Simple debug dir that logs object to console when DEBUG is set.
 */
/*@__NO_SIDE_EFFECTS__*/
/* c8 ignore start - Debug utilities only used in development. */
export function debugDirSimple(obj: any, options?: any): void {
  if (isDebugSimple()) {
    console.dir(obj, options || { depth: null, colors: true })
  }
}
/* c8 ignore stop */

/**
 * Simple debug function that creates a namespaced debug logger.
 */
/*@__NO_SIDE_EFFECTS__*/
/* c8 ignore start - Debug utilities only used in development. */
function matchPattern(ns: any, pattern: any) {
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

export function debugFnSimple(namespace: any) {
  const log = (...args: any[]) => {
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
/* c8 ignore stop */

/**
 * Create a debug logger similar to util.debuglog.
 */
/*@__NO_SIDE_EFFECTS__*/
/* c8 ignore start - Debug utilities only used in development. */
export function debuglog(section: any) {
  const log = (...args: any[]) => {
    if (isDebugSimple()) {
      console.log(`[${section}]`, ...args)
    }
  }
  return log
}
/* c8 ignore stop */

/**
 * Create a debug timer.
 */
/*@__NO_SIDE_EFFECTS__*/
/* c8 ignore start - Debug utilities only used in development. */
export function debugtime(section: any) {
  const timers = new Map()

  const timer = (label: any) => {
    if (isDebugSimple()) {
      console.log(`[${section}] ${label}`)
    }
  }

  timer.start = (label: any) => {
    if (isDebugSimple()) {
      timers.set(label, Date.now())
      console.log(`[${section}] ${label}: start`)
    }
  }

  timer.end = (label: any) => {
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
/* c8 ignore stop */

// Export aliases for compatibility.
export { debugDirSimple as debugDir }
export { debugDirComplex }
export { debugFnSimple as debugFn }
export { debugFnComplex }
export { debugLogSimple as debugLog }
export { debugLogComplex }
export { isDebugSimple as isDebug }
export { isDebugComplex }
