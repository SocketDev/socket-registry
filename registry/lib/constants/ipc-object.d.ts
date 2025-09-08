/// <reference types="node" />
import { Serializable } from 'node:child_process'

declare interface IpcObject {
  [key: string]: Serializable
}
declare const IpcObject: Readonly<{ [key: string]: Serializable }>
export = IpcObject
