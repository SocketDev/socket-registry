import { Options as WhichOptions } from 'which'

import { Remap } from './objects'
import { SpawnOptions } from './spawn'

declare type NpmRunScriptOptions = Remap<
  SpawnOptions & {
    prepost?: boolean | undefined
  }
>
declare const Agent: {
  execNpm(
    args: string[] | readonly string[],
    options?: SpawnOptions | undefined
  ): Promise<{ stdout: string; stderr: string }>
  execPnpm(
    args: string[] | readonly string[],
    options?: SpawnOptions | undefined
  ): Promise<{ stdout: string; stderr: string }>
  isNpmAuditFlag(cmdArg: string): boolean
  isNpmFundFlag(cmdArg: string): boolean
  isNpmLoglevelFlag(cmdArg: string): boolean
  isNpmNodeOptionsFlag(cmdArg: string): boolean
  isNpmProgressFlag(cmdArg: string): boolean
  isPnpmIgnoreScriptsFlag(cmdArg: string): boolean
  resolveBinPathSync(binPath: string): string
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
declare namespace Agent {
  export { NpmRunScriptOptions }
}
export = Agent
