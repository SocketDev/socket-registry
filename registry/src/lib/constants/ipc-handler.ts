import target from './ipc-target'

// Type definitions
type IpcHandler = ProxyHandler<object> & {
  defineProperty(): true
  deleteProperty(): false
  preventExtensions(): true
  set(): false
  setPrototypeOf(): false
}

// Mutable handler to simulate a frozen target.
const handler = {
  __proto__: null,
  defineProperty: () => true,
  deleteProperty: () => false,
  preventExtensions() {
    // Prevent a proxy trap invariant error.
    // https://tc39.es/ecma262/#sec-proxy-object-internal-methods-and-internal-slots-isextensible
    Object.preventExtensions(target)
    return true
  },
  set: () => false,
  setPrototypeOf: () => false,
}

export type { IpcHandler }
export default handler
