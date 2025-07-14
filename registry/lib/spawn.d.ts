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

declare type SpawnError<Output = string, Extra = undefined> = Error &
  SpawnStdioResult<Output, Extra> & {
    message: 'command failed'
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
  isSpawnError(value: any): value is SpawnError<any>
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
    SpawnExtra,
    SpawnOptions,
    SpawnResult,
    SpawnStdioResult,
    StdioType
  }
}
export = Spawn
