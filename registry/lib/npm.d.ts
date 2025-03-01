// <reference types="node" />
import { SpawnOptions } from './spawn'
import { Remap } from './objects'
import { Spinner } from './spinner'

declare type NpmSpawnOptions = SpawnOptions
declare type NpmRunScriptOptions = Remap<
  NpmSpawnOptions & {
    prepost?: boolean
  }
>
declare const Npm: {
  execNpm(
    args: string[],
    options?: SpawnOptions
  ): Promise<{ stdout: string; stderr: string }>
  runBin(
    binPath: string,
    args: string[],
    options?: SpawnOptions
  ): Promise<{ stdout: string; stderr: string }>
  runScript(
    scriptName: string,
    args: string[],
    options?: NpmRunScriptOptions
  ): Promise<{ stdout: string; stderr: string }>
}
declare namespace Npm {
  export { NpmRunScriptOptions, NpmSpawnOptions }
}
export = Npm
