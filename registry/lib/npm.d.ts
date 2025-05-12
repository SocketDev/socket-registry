import { Options as WhichOptions } from 'which'

import { Remap } from './objects'
import { SpawnOptions } from './spawn'
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
    args: string[] | readonly string[],
    options?: NpmSpawnOptions | undefined
  ): Promise<{ stdout: string; stderr: string }>
  isAuditFlag(cmdArg: string): boolean
  isFundFlag(cmdArg: string): boolean
  isLoglevelFlag(cmdArg: string): boolean
  isNodeOptionsFlag(cmdArg: string): boolean
  isProgressFlag(cmdArg: string): boolean
  realExecPathSync(npmOrNpxExecPath: string): string
  resolveBinPath(binPath: string): string
  runBin(
    binPath: string,
    args: string[] | readonly string[],
    options?: SpawnOptions | undefined
  ): Promise<{ stdout: string; stderr: string }>
  runScript(
    scriptName: string,
    args: string[] | readonly string[],
    options?: NpmRunScriptOptions | undefined
  ): Promise<{ stdout: string; stderr: string }>
  whichBin<T extends WhichOptions>(
    binName: string,
    options: T
  ): T extends { nothrow: true } ? Promise<string | null> : Promise<string>
  whichBinSync<T extends WhichOptions>(
    binName: string,
    options: T
  ): T extends { nothrow: true } ? string | null : string
}
declare namespace Npm {
  export { NpmRunScriptOptions, NpmSpawnOptions }
}
export = Npm
