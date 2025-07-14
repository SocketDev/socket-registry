/// <reference types="node" />
import {
  SpawnOptions as BaseSpawnOptions,
  ChildProcess,
  IOType,
  spawnSync as childProcessSpawnSync
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
declare type StdioType = IOType | 'ipc' | Array<IOType | 'ipc'>
declare const Spawn: {
  isSpawnError(value: any): value is SpawnError
  isStdioType(
    stdio: string | string[] | readonly string[],
    type: StdioType
  ): boolean
  spawn<O extends SpawnOptions = SpawnOptions>(
    cmd: string,
    args: string[] | readonly string[],
    options?: O | undefined,
    extra?: SpawnExtra | undefined
  ): SpawnResult<
    O extends { stdioString: false } ? Buffer : string,
    typeof extra
  >
  spawnSync: typeof childProcessSpawnSync
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
    StdioType
  }
}
export = Spawn
