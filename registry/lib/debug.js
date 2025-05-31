'use strict'

const { applyLinePrefix } = /*@__PURE__*/ require('./strings')

const { apply: ReflectApply } = Reflect

/*@__NO_SIDE_EFFECTS__*/
function debugDir() {
  if (isDebug()) {
    const { logger } = /*@__PURE__*/ require('./logger')
    ReflectApply(logger.dir, logger, arguments)
  }
}

let pointingTriangle
/*@__NO_SIDE_EFFECTS__*/
function debugFn(...args) {
  if (isDebug()) {
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
            // Strip known V8 invocation prefixes to get the clean name.
            name = match.replace(/^(?:async|bound|get|new|set)\s+/, '')
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
function debugLog() {
  if (isDebug()) {
    const { logger } = /*@__PURE__*/ require('./logger')
    ReflectApply(logger.info, logger, arguments)
  }
}

/*@__NO_SIDE_EFFECTS__*/
function isDebug() {
  const ENV = /*@__PURE__*/ require('./constants/env')
  // eslint-disable-next-line no-warning-comments
  // TODO: Make the environment variable name configurable.
  return ENV.SOCKET_CLI_DEBUG
}

module.exports = {
  debugDir,
  debugFn,
  debugLog,
  isDebug
}
