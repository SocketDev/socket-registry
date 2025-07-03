'use strict'

const { apply: ReflectApply } = Reflect

const { hasOwn } = /*@__PURE__*/ require('./objects')
const { applyLinePrefix } = /*@__PURE__*/ require('./strings')

let _debugJs
/*@__NO_SIDE_EFFECTS__*/
function getDebugJs() {
  if (_debugJs === undefined) {
    // The 'debug' package is browser safe.
    _debugJs = /*@__PURE__*/ require('../external/debug').default
  }
  return _debugJs
}

const debugByNamespace = new Map()
/*@__NO_SIDE_EFFECTS__*/
function getDebugJsInstance(namespace) {
  let inst = debugByNamespace.get(namespace)
  if (inst) {
    return inst
  }
  const ENV = /*@__PURE__*/ require('./constants/env')
  const debugJs = getDebugJs()
  inst = debugJs(namespace)
  inst.log = customLog
  if (
    !ENV.DEBUG &&
    ENV.SOCKET_CLI_DEBUG &&
    // Ignore 'inspect' namespace by default.
    namespace !== 'inspect'
  ) {
    debugJs.enable(namespace)
  }
  debugByNamespace.set(namespace, inst)
  return inst
}

let _util
/*@__NO_SIDE_EFFECTS__*/
function getUtil() {
  if (_util === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _util = /*@__PURE__*/ require('util')
  }
  return _util
}

/*@__NO_SIDE_EFFECTS__*/
function customLog() {
  const { logger } = /*@__PURE__*/ require('./logger')
  const debugJs = getDebugJs()
  const util = getUtil()
  ReflectApply(logger.info, logger, [
    util.formatWithOptions(debugJs.inspectOpts, ...arguments)
  ])
}

/*@__NO_SIDE_EFFECTS__*/
function debugDir(namespace, obj, options) {
  const inst = isDebug() ? getDebugJsInstance(namespace) : undefined
  if (inst?.enabled) {
    const { logger } = /*@__PURE__*/ require('./logger')
    if (options === undefined) {
      const debugJs = getDebugJs()
      options = debugJs.inspectOpts
    }
    logger.dir(obj, options)
  }
}

let pointingTriangle
/*@__NO_SIDE_EFFECTS__*/
function debugFn(namespace, ...args) {
  const inst = isDebug() ? getDebugJsInstance(namespace) : undefined
  if (inst?.enabled) {
    const { logger } = /*@__PURE__*/ require('./logger')
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
    const hasText = typeof text === 'string'
    const logArgs = hasText
      ? [
          applyLinePrefix(
            `${name ? `${name} ${pointingTriangle} ` : ''}${text}`,
            '[DEBUG] '
          ),
          ...args.slice(1)
        ]
      : args
    ReflectApply(logger.info, logger, logArgs)
  }
}

/*@__NO_SIDE_EFFECTS__*/
function debugLog(namespace, ...args) {
  const inst = isDebug() ? getDebugJsInstance(namespace) : undefined
  if (inst?.enabled) {
    ReflectApply(inst.log, inst, args)
  }
}

/*@__NO_SIDE_EFFECTS__*/
function isDebug(namespace) {
  const ENV = /*@__PURE__*/ require('./constants/env')
  if (!ENV.SOCKET_CLI_DEBUG) {
    return false
  }
  return !namespace || !!getDebugJsInstance(namespace)?.enabled
}

module.exports = {
  debugDir,
  debugFn,
  debugLog,
  isDebug
}
