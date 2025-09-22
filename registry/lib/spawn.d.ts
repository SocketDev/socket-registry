/// <reference types="node" />
import {
  SpawnOptions as BaseSpawnOptions,
  ChildProcess,
  IOType,
} from 'node:child_process'
import Stream from 'node:stream'

import { Remap } from './objects'
import { Spinner } from './spinner'

declare type SpawnError = {
  args: string[] | readonly string[]
  cmd: string
  code: number
  name: 'Error'
  message: 'command failed'
  signal: AbortSignal | null
  stack: string
  stderr: string | Buffer
  stdout: string | Buffer
}
declare type SpawnErrorWithOutputString = Omit<
  SpawnError,
  'stderr' | 'stdout'
> & {
  stdout: string
  stderr: string
}
declare type SpawnErrorWithOutputBuffer = Omit<
  SpawnError,
  'stderr' | 'stdout'
> & {
  stdout: Buffer
  stderr: Buffer
}
declare type SpawnExtra = Record<any, any>
declare type SpawnStdioResult<Output = string, Extra = undefined> = {
  cmd: string
  args: string[] | readonly string[]
  code: number
  signal: AbortSignal | null
  stdout: Output
  stderr: Output
} & Extra
declare type SpawnResult<Output = string, Extra = undefined> = Promise<
  SpawnStdioResult<Output, Extra>
> & { process: ChildProcess; stdin: Stream.Writable | null }
declare type SpawnOptions = Remap<
  BaseSpawnOptions & {
    spinner?: Spinner | undefined
    stdioString?: boolean | undefined
    stripAnsi?: boolean | undefined
  }
>
declare type SpawnSyncOptions = Omit<SpawnOptions, 'spinner'>
declare interface SpawnSyncOptionsWithStringEncoding extends SpawnSyncOptions {
  encoding: NodeJS.BufferEncoding
}
declare interface SpawnSyncOptionsWithBufferEncoding extends SpawnSyncOptions {
  encoding?: 'buffer' | null | undefined
}
declare interface SpawnSyncReturns<T> {
  pid: number
  output: Array<T | null>
  stdout: T
  stderr: T
  status: number | null
  signal: NodeJS.Signals | null
  error?: Error | undefined
}
declare type StdioType = IOType | 'ipc' | Array<IOType | 'ipc'>
declare const Spawn: {
  isSpawnError(value: any): value is SpawnError
  isStdioType(
    stdio: string | string[] | readonly string[],
    type: StdioType,
  ): boolean
  spawn<O extends SpawnOptions = SpawnOptions>(
    cmd: string,
    args: string[] | readonly string[],
    options?: O | undefined,
    extra?: SpawnExtra | undefined,
  ): SpawnResult<
    O extends { stdioString: false } ? Buffer : string,
    typeof extra
  >
  spawnSync(
    command: string,
    options?: SpawnSyncOptionsWithStringEncoding | undefined,
  ): SpawnSyncReturns<string>
  spawnSync(
    command: string,
    options: SpawnSyncOptionsWithBufferEncoding,
  ): SpawnSyncReturns<Buffer>
  spawnSync(
    command: string,
    options?: SpawnSyncOptions,
  ): SpawnSyncReturns<string | Buffer>
  spawnSync(
    command: string,
    args: string[] | readonly string[],
    options?: SpawnSyncOptionsWithStringEncoding | undefined,
  ): SpawnSyncReturns<string>
  spawnSync(
    command: string,
    args: string[] | readonly string[],
    options: SpawnSyncOptionsWithBufferEncoding,
  ): SpawnSyncReturns<Buffer>
  spawnSync(
    command: string,
    args?: string[] | readonly string[],
    options?: SpawnSyncOptions,
  ): SpawnSyncReturns<string | Buffer>
}
declare namespace Spawn {
  export {
    SpawnError,
    SpawnErrorWithOutputString,
    SpawnErrorWithOutputBuffer,
    SpawnExtra,
    SpawnOptions,
    SpawnResult,
    SpawnStdioResult,
    StdioType,
  }
}
export = Spawn
