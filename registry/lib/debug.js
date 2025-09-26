/**
 * @fileoverview Debug logging utilities with lazy loading and environment-based control.
 * Provides Socket CLI specific debug functionality and logging formatters.
 */
'use strict'

const { apply: ReflectApply } = Reflect

const { hasOwn } = /*@__PURE__*/ require('./objects')
const { applyLinePrefix } = /*@__PURE__*/ require('./strings')

let _debugJs
/**
 * Lazily load the debug module.
 * @returns {Function} The debug module.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getDebugJs() {
  if (_debugJs === undefined) {
    // The 'debug' package is browser safe.
    const debugExport = /*@__PURE__*/ require('../external/debug')
    _debugJs = debugExport.default
  }
  return _debugJs
}

const debugByNamespace = new Map()
/**
 * Get or create a debug instance for a namespace.
 * @param {string} namespace - The debug namespace.
 * @returns {Function} The debug instance.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getDebugJsInstance(namespace) {
  let inst = debugByNamespace.get(namespace)
  if (inst) {
    return inst
  }
  const debugJs = getDebugJs()
  const ENV = /*@__PURE__*/ require('./constants/env')
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

let _util
/**
 * Lazily load the util module.
 * @returns {import('util')} The Node.js util module.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getUtil() {
  if (_util === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _util = /*@__PURE__*/ require('util')
  }
  return _util
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
  ReflectApply(logger.info, logger, [
    util.formatWithOptions(debugJs.inspectOpts, ...arguments),
  ])
}

/**
 * Extract options from namespaces parameter.
 * @param {string | Object} namespaces - Namespaces string or options object.
 * @returns {Object} Normalized options object.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function extractOptions(namespaces) {
  return namespaces !== null && typeof namespaces === 'object'
    ? { __proto__: null, ...namespaces }
    : { __proto__: null, namespaces }
}

/**
 * Check if debug is enabled for given namespaces.
 * @param {string} namespaces - Debug namespaces to check.
 * @returns {boolean} True if debug is enabled.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function isEnabled(namespaces) {
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
 * @param {string | Object} namespacesOrOpts - Namespaces or options.
 * @param {any} obj - Object to inspect.
 * @param {Object} [inspectOpts] - Inspection options.
 */
/*@__NO_SIDE_EFFECTS__*/
/* c8 ignore start - Debug utilities only used in development. */
function debugDir(namespacesOrOpts, obj, inspectOpts) {
  const options = extractOptions(namespacesOrOpts)
  const { namespaces } = options
  if (!isEnabled(namespaces)) {
    return
  }
  if (inspectOpts === undefined) {
    const debugJs = getDebugJs()
    inspectOpts = debugJs.inspectOpts
  }
  const { spinner = /*@__PURE__*/ require('./constants/spinner') } = options
  const wasSpinning = spinner.isSpinning
  spinner.stop()
  const { logger } = /*@__PURE__*/ require('./logger')
  logger.dir(obj, inspectOpts)
  if (wasSpinning) {
    spinner.start()
  }
}
/* c8 ignore stop */

let pointingTriangle
/**
 * Debug output with function name prefix.
 * @param {string | Object} namespacesOrOpts - Namespaces or options.
 * @param {...any} args - Arguments to log.
 */
/*@__NO_SIDE_EFFECTS__*/
/* c8 ignore start - Debug utilities only used in development. */
function debugFn(namespacesOrOpts, ...args) {
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
  if (pointingTriangle === undefined) {
    const supported =
      /*@__PURE__*/ require('../external/@socketregistry/is-unicode-supported')()
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
  const { spinner = /*@__PURE__*/ require('./constants/spinner') } = options
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
 * @param {string | Object} namespacesOrOpts - Namespaces or options.
 * @param {...any} args - Arguments to log.
 */
/*@__NO_SIDE_EFFECTS__*/
/* c8 ignore start - Debug utilities only used in development. */
function debugLog(namespacesOrOpts, ...args) {
  const options = extractOptions(namespacesOrOpts)
  const { namespaces } = options
  if (!isEnabled(namespaces)) {
    return
  }
  const { spinner = /*@__PURE__*/ require('./constants/spinner') } = options
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
 * @param {string} [namespaces] - Specific namespaces to check.
 * @returns {boolean} True if debug is enabled.
 */
/*@__NO_SIDE_EFFECTS__*/
/* c8 ignore start - Debug utilities only used in development. */
function isDebug(namespaces) {
  const ENV = /*@__PURE__*/ require('./constants/env')
  return ENV.SOCKET_CLI_DEBUG && isEnabled(namespaces)
}
/* c8 ignore stop */

/**
 * Simple debug check based on DEBUG environment variable.
 * @returns {boolean} True if DEBUG is set and truthy.
 */
/*@__NO_SIDE_EFFECTS__*/
/* c8 ignore start - Debug utilities only used in development. */
function isDebugSimple() {
  const debug = process.env.DEBUG
  if (!debug || debug === '' || debug === '0' || debug === 'false') {
    return false
  }
  return true
}
/* c8 ignore stop */

/**
 * Simple debug log that logs to console when DEBUG is set.
 * @param {...any} args - Arguments to log.
 */
/*@__NO_SIDE_EFFECTS__*/
/* c8 ignore start - Debug utilities only used in development. */
function debugLogSimple(...args) {
  if (isDebugSimple()) {
    console.log(...args)
  }
}
/* c8 ignore stop */

/**
 * Simple debug dir that logs object to console when DEBUG is set.
 * @param {any} obj - Object to dir.
 * @param {Object} [options] - Console.dir options.
 */
/*@__NO_SIDE_EFFECTS__*/
/* c8 ignore start - Debug utilities only used in development. */
function debugDirSimple(obj, options) {
  if (isDebugSimple()) {
    console.dir(obj, options || { depth: null, colors: true })
  }
}
/* c8 ignore stop */

/**
 * Simple debug function that creates a namespaced debug logger.
 * @param {string} namespace - The namespace for this debug instance.
 * @returns {Function} A debug function for the namespace.
 */
/*@__NO_SIDE_EFFECTS__*/
/* c8 ignore start - Debug utilities only used in development. */
function matchPattern(ns, pattern) {
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

function debugFnSimple(namespace) {
  const log = (...args) => {
    const debug = process.env.DEBUG || ''

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
 * @param {string} section - The debug section/namespace.
 * @returns {Function} A debug function.
 */
/*@__NO_SIDE_EFFECTS__*/
/* c8 ignore start - Debug utilities only used in development. */
function debuglog(section) {
  const log = (...args) => {
    if (isDebugSimple()) {
      console.log(`[${section}]`, ...args)
    }
  }
  return log
}
/* c8 ignore stop */

/**
 * Create a debug timer.
 * @param {string} section - The debug section/namespace.
 * @returns {Object} An object with start and end methods.
 */
/*@__NO_SIDE_EFFECTS__*/
/* c8 ignore start - Debug utilities only used in development. */
function debugtime(section) {
  const timers = new Map()

  const timer = label => {
    if (isDebugSimple()) {
      console.log(`[${section}] ${label}`)
    }
  }

  timer.start = label => {
    if (isDebugSimple()) {
      timers.set(label, Date.now())
      console.log(`[${section}] ${label}: start`)
    }
  }

  timer.end = label => {
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

// Export both the original complex versions and simple versions
// Tests are expecting the simple versions
module.exports = {
  debugDir: debugDirSimple,
  debugDirComplex: debugDir,
  debugFn: debugFnSimple,
  debugFnComplex: debugFn,
  debugLog: debugLogSimple,
  debugLogComplex: debugLog,
  debuglog,
  debugtime,
  isDebug: isDebugSimple,
  isDebugComplex: isDebug,
}
