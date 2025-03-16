/// <reference types="node" />
import {
  SpawnOptions as BuiltinSpawnOptions,
  spawn as builtinSpawn,
  spawnSync as builtinSpawnSync
} from 'node:child_process'

import { Remap } from './objects'
import { Spinner } from './spinner'

declare type NativeSpawnResult = ReturnType<typeof builtinSpawn>
declare type SpawnResult<Output, Extra> = Promise<
  {
    cmd: string
    args: string[] | readonly string[]
    code: number
    signal: AbortSignal | null
    stdout: Output
    stderr: Output
  } & Extra
> & { process: NativeSpawnResult; stdin: NativeSpawnResult['stdin'] }
declare type SpawnOptions = Remap<
  BuiltinSpawnOptions & {
    spinner?: Spinner | undefined
    stdioString?: boolean | undefined
  }
>

declare const Spawn: {
  spawn<O extends SpawnOptions = SpawnOptions>(
    cmd: string,
    args: string[] | readonly string[],
    options?: O | undefined,
    extra?: Record<any, any> | undefined
  ): SpawnResult<
    O extends { stdioString: false } ? Buffer : string,
    typeof extra
  >
  spawnSync: typeof builtinSpawnSync
}
declare namespace Spawn {
  export { NativeSpawnResult, SpawnOptions, SpawnResult }
}
export = Spawn
