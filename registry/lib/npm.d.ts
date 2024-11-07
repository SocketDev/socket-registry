// <reference types="node" />
import { SpawnOptions } from 'node:child_process'

declare type PromiseSpawnOptions = {
  cwd?: string
  stdioString?: boolean
} & SpawnOptions
declare interface RunScriptOptions extends PromiseSpawnOptions {
  prepost?: boolean
}
declare function execNpm(
  args: string[],
  options?: PromiseSpawnOptions
): Promise<{ stdout: string; stderr: string }>
declare function runBin(
  binPath: string,
  args: string[],
  options?: PromiseSpawnOptions
): Promise<{ stdout: string; stderr: string }>
declare function runScript(
  scriptName: string,
  args: string[],
  options?: RunScriptOptions
): Promise<{ stdout: string; stderr: string }>
declare const npmModule: {
  execNpm: typeof execNpm
  runBin: typeof runBin
  runScript: typeof runScript
}
export = npmModule
