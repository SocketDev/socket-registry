// <reference types="node" />
import { SpawnOptions } from 'node:child_process'
import { Remap } from './objects'
import { Spinner } from './spinner'

declare type PromiseSpawnOptions = Remap<
  {
    cwd?: string
    stdioString?: boolean
  } & SpawnOptions
>
declare type RunScriptOptions = Remap<
  PromiseSpawnOptions & {
    prepost?: boolean
    spinner?: Spinner
  }
>
declare const Npm: {
  execNpm(
    args: string[],
    options?: PromiseSpawnOptions
  ): Promise<{ stdout: string; stderr: string }>
  runBin(
    binPath: string,
    args: string[],
    options?: PromiseSpawnOptions
  ): Promise<{ stdout: string; stderr: string }>
  runScript(
    scriptName: string,
    args: string[],
    options?: RunScriptOptions
  ): Promise<{ stdout: string; stderr: string }>
}
declare namespace Npm {
  export { PromiseSpawnOptions, RunScriptOptions }
}
export = Npm
