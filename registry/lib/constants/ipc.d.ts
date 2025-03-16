/// <reference types="node" />
import { Serializable } from 'node:child_process'

declare interface IPC {
  [key: string]: Serializable
}
declare const IPC: Readonly<{ [key: string]: Serializable }>
export = IPC
