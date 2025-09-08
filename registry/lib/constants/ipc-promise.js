'use strict'

const { assign: ObjectAssign, freeze: ObjectFreeze } = Object

module.exports = new Promise(
  // The Promise executor is immediately executed.
  resolve => {
    if (
      !(typeof process === 'object' && process !== null) ||
      // Manually check instead of lazily accessing constants.SUPPORTS_PROCESS_SEND
      // because constants is not initialized yet.
      typeof process.send !== 'function'
    ) {
      resolve(/*@__PURE__*/ require('./ipc-object'))
      return
    }
    const abortSignal = /*@__PURE__*/ require('./abort-signal')
    const finish = () => {
      abortSignal.removeEventListener('abort', finish)
      process.removeListener('message', onmessage)
      resolve(/*@__PURE__*/ require('./ipc-object'))
    }
    const onmessage = rawData => {
      if (rawData !== null && typeof rawData === 'object') {
        const { SOCKET_IPC_HANDSHAKE: source } = {
          __proto__: null,
          ...rawData
        }
        const target = /*@__PURE__*/ require('./ipc-target')
        ObjectAssign(target, source)
        ObjectFreeze(target)
        // The handler of a Proxy is mutable after proxy instantiation.
        // We delete the traps to defer to native behavior.
        const handler = /*@__PURE__*/ require('./ipc-handler')
        for (const trapName in handler) {
          delete handler[trapName]
        }
      }
      finish()
    }
    abortSignal.addEventListener('abort', finish, { once: true })
    process.on('message', onmessage)
    // The timeout of 1,000 milliseconds, i.e. 1 second, is to prevent an unresolved
    // promised. It should be more than enough time for the ipc object handshake.
    setTimeout(finish, 1000)
  }
)
