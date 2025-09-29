// Type definitions for ipc-object
import type { Serializable } from 'node:child_process'

export interface IpcObject {
  [key: string]: Serializable
}

declare const ipcObject: IpcObject
export default ipcObject
