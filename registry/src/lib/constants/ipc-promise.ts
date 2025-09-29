import abortSignal from './abort-signal'
import handler from './ipc-handler'
import ipcObject from './ipc-object'
import target from './ipc-target'

// IMPORTANT: Do not use destructuring here - use direct assignment instead.
// tsgo has a bug that incorrectly transpiles destructured exports, resulting in
// `exports.SomeName = void 0;` which causes runtime errors.
// See: https://github.com/SocketDev/socket-packageurl-js/issues/3
const ObjectAssign = Object.assign
const ObjectFreeze = Object.freeze

export default new Promise(
  // The Promise executor is immediately executed.
  resolve => {
    if (
      !(typeof process === 'object' && process !== null) ||
      // Manually check instead of lazily accessing constants.SUPPORTS_PROCESS_SEND
      // because constants is not initialized yet.
      typeof process.send !== 'function'
    ) {
      resolve(ipcObject)
      return
    }
    const finish = () => {
      abortSignal.removeEventListener('abort', finish)
      process.removeListener('message', onmessage)
      resolve(ipcObject)
    }
    const onmessage = (rawData: any) => {
      if (rawData !== null && typeof rawData === 'object') {
        const data = { __proto__: null, ...rawData } as {
          SOCKET_IPC_HANDSHAKE?: any
        }
        const { SOCKET_IPC_HANDSHAKE: source } = data
        ObjectAssign(target, source)
        ObjectFreeze(target)
        // The handler of a Proxy is mutable after proxy instantiation.
        // We delete the traps to defer to native behavior.
        for (const trapName in handler) {
          delete (handler as any)[trapName]
        }
      }
      finish()
    }
    abortSignal.addEventListener('abort', finish, { once: true })
    process.on('message', onmessage)
    // The timeout of 1,000 milliseconds, i.e. 1 second, is to prevent an unresolved
    // promised. It should be more than enough time for the ipc object handshake.
    setTimeout(finish, 1000)
  },
)
