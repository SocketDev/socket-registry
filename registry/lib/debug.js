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
    util.formatWithOptions(debugJs.inspectOpts, ...arguments)
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

let pointingTriangle
/**
 * Debug output with function name prefix.
 * @param {string | Object} namespacesOrOpts - Namespaces or options.
 * @param {...any} args - Arguments to log.
 */
/*@__NO_SIDE_EFFECTS__*/
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
            '[DEBUG] '
          ),
          ...args.slice(1)
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

/**
 * Debug logging function.
 * @param {string | Object} namespacesOrOpts - Namespaces or options.
 * @param {...any} args - Arguments to log.
 */
/*@__NO_SIDE_EFFECTS__*/
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

/**
 * Check if debug mode is enabled.
 * @param {string} [namespaces] - Specific namespaces to check.
 * @returns {boolean} True if debug is enabled.
 */
/*@__NO_SIDE_EFFECTS__*/
function isDebug(namespaces) {
  const ENV = /*@__PURE__*/ require('./constants/env')
  return ENV.SOCKET_CLI_DEBUG && isEnabled(namespaces)
}

module.exports = {
  debugDir,
  debugFn,
  debugLog,
  isDebug
}
