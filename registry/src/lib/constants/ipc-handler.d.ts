// Type definitions for ipc-handler
export type IpcHandler = ProxyHandler<object> & {
  defineProperty(): true
  deleteProperty(): false
  preventExtensions(): true
  set(): false
  setPrototypeOf(): false
}

declare const handler: IpcHandler
export default handler
