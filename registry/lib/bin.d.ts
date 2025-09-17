import type { SpawnOptions } from './spawn'
import type { Options as WhichOptions } from 'which'

declare const Bin: {
  resolveBinPathSync(binPath: string): string
  runBin(
    binPath: string,
    args: string[] | readonly string[],
    options?: SpawnOptions | undefined
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
export = Bin
