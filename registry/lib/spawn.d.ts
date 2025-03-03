/// <reference types="node" />
import {
  spawn as builtinSpawn,
  spawnSync as builtinSpawnSync,
  SpawnOptions as BuiltinSpawnOptions
} from 'node:child_process'
import { Remap } from './objects'
import { Spinner } from './spinner'

declare type NativeSpawnResult = ReturnType<typeof builtinSpawn>
declare type SpawnResult<Output, Extra> = Promise<
  {
    cmd: string
    args: string[] | Readonly<string[]>
    code: number
    signal: NodeJS.Signals | null
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
    args: string[] | Readonly<string[]>,
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
