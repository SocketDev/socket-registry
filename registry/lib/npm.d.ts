import { Options as WhichOptions } from 'which'

import { Remap } from './objects'
import { SpawnOptions } from './spawn'

declare type NpmRunScriptOptions = Remap<
  SpawnOptions & {
    prepost?: boolean | undefined
  }
>
declare const Npm: {
  execNpm(
    args: string[] | readonly string[],
    options?: SpawnOptions | undefined
  ): Promise<{ stdout: string; stderr: string }>
  isNpmAuditFlag(cmdArg: string): boolean
  isNpmFundFlag(cmdArg: string): boolean
  isNpmLoglevelFlag(cmdArg: string): boolean
  isNpmNodeOptionsFlag(cmdArg: string): boolean
  isNpmProgressFlag(cmdArg: string): boolean
  realNpmExecPathSync(npmOrNpxExecPath: string): string
  resolveBinPath(binPath: string): string
  runBin(
    binPath: string,
    args: string[] | readonly string[],
    options?: SpawnOptions | undefined
  ): Promise<{ stdout: string; stderr: string }>
  runNpmScript(
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
  export { NpmRunScriptOptions }
}
export = Npm
