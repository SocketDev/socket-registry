import handler from './ipc-handler'
import target from './ipc-target'

import type { Serializable } from 'node:child_process'

// Type definitions
interface IpcObject {
  [key: string]: Serializable
}

const ipcObject = new Proxy(target, handler) as unknown as IpcObject

export type { IpcObject }
export default ipcObject
