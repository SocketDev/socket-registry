import { SpawnOptions } from './spawn'
import { Remap } from './objects'
import { Spinner } from './spinner'

declare type NpmSpawnOptions = Remap<
  SpawnOptions & {
    spinner?: Spinner | undefined
  }
>
declare type NpmRunScriptOptions = Remap<
  NpmSpawnOptions & {
    prepost?: boolean | undefined
  }
>
declare const Npm: {
  execNpm(
    args: string[] | Readonly<string[]>,
    options?: NpmSpawnOptions | undefined
  ): Promise<{ stdout: string; stderr: string }>
  isAuditFlag(cmdArg: string): boolean
  isFundFlag(cmdArg: string): boolean
  isLoglevelFlag(cmdArg: string): boolean
  isProgressFlag(cmdArg: string): boolean
  runBin(
    binPath: string,
    args: string[] | Readonly<string[]>,
    options?: SpawnOptions | undefined
  ): Promise<{ stdout: string; stderr: string }>
  runScript(
    scriptName: string,
    args: string[] | Readonly<string[]>,
    options?: NpmRunScriptOptions | undefined
  ): Promise<{ stdout: string; stderr: string }>
}
declare namespace Npm {
  export { NpmRunScriptOptions, NpmSpawnOptions }
}
export = Npm
