// Purposefully in sloppy mode to aid with debuggability.
// 'use strict'
const { apply: ReflectApply } = Reflect

/*@__NO_SIDE_EFFECTS__*/
function debugDir() {
  'use strict'
  if (isDebug()) {
    const { logger } = /*@__PURE__*/ require('./logger')
    ReflectApply(logger.dir, logger, arguments)
  }
}

/*@__NO_SIDE_EFFECTS__*/
function debugFn() {
  // Purposefully in sloppy mode to aid with debuggability.
  // 'use strict'
  if (isDebug()) {
    const { logger } = /*@__PURE__*/ require('./logger')
    const name = debugFn.caller?.name ?? ''
    logger.info(`[DEBUG]${name ? ` ${name} >` : ''}`, ...Array.from(arguments))
  }
}

/*@__NO_SIDE_EFFECTS__*/
function debugLog() {
  'use strict'
  if (isDebug()) {
    const { logger } = /*@__PURE__*/ require('./logger')
    ReflectApply(logger.info, logger, arguments)
  }
}

/*@__NO_SIDE_EFFECTS__*/
function isDebug() {
  'use strict'
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
