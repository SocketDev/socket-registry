/// <reference types="node" />
import { Serializable } from 'node:child_process'

declare interface ipcObject {
  [key: string]: Serializable
}
declare const ipcObject: Readonly<{ [key: string]: Serializable }>
export = ipcObject
