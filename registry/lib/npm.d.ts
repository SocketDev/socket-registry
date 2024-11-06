declare interface SpawnOptions {
  shell?: boolean
  prepost?: boolean
  [key: string]: any
}
declare function execNpm(
  args: string[],
  options?: SpawnOptions
): Promise<{ stdout: string; stderr: string }>
declare function runBin(
  binPath: string,
  args: string[],
  options?: SpawnOptions
): Promise<{ stdout: string; stderr: string }>
declare function runScript(
  scriptName: string,
  args: string[],
  options?: SpawnOptions
): Promise<{ stdout: string; stderr: string }>
declare const npmModule: {
  execNpm: typeof execNpm
  runBin: typeof runBin
  runScript: typeof runScript
}
export = npmModule
