/// <reference types="node" />
import {
  SpawnOptions as BaseSpawnOptions,
  ChildProcess,
  spawnSync as childProcessSpawnSync
} from 'node:child_process'
import Stream from 'node:stream'

import { Remap } from './objects'
import { Spinner } from './spinner'

declare type SpawnError<Output, Extra> = Error &
  SpawnStdioResult<Output, Extra> & {
    message: 'command failed'
  }
declare type SpawnExtra = Record<any, any>
declare type SpawnStdioResult<Output, Extra> = {
  cmd: string
  args: string[] | readonly string[]
  code: number
  signal: AbortSignal | null
  stdout: Output
  stderr: Output
} & Extra
declare type SpawnResult<Output, Extra> = Promise<
  SpawnStdioResult<Output, Extra>
> & { process: ChildProcess; stdin: Stream.Writable | null }
declare type SpawnOptions = Remap<
  BaseSpawnOptions & {
    spinner?: Spinner | undefined
    stdioString?: boolean | undefined
    stripAnsi?: boolean | undefined
  }
>
declare const Spawn: {
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
  export { SpawnError, SpawnExtra, SpawnOptions, SpawnResult, SpawnStdioResult }
}
export = Spawn
