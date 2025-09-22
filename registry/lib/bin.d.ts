import type { SpawnOptions } from './spawn'
import type { Options as WhichOptions } from 'which'

declare const Bin: {
  execBin(
    binPath: string,
    args: string[] | readonly string[],
    options?: SpawnOptions | undefined,
  ): Promise<{ stdout: string; stderr: string }>
  findRealBin(binName: string, commonPaths?: string[]): string
  findRealNpm(): string
  findRealPnpm(): string
  findRealYarn(): string
  isShadowBinPath(dirPath: string): boolean
  resolveBinPathSync(binPath: string): string
  whichBin<T extends WhichOptions>(
    binName: string,
    options: T,
  ): T extends { all: true; nothrow: true }
    ? Promise<string[] | null>
    : T extends { all: true }
      ? Promise<string[]>
      : T extends { nothrow: true }
        ? Promise<string | null>
        : Promise<string>
  whichBinSync<T extends WhichOptions>(
    binName: string,
    options: T,
  ): T extends { all: true; nothrow: true }
    ? string[] | null
    : T extends { all: true }
      ? string[]
      : T extends { nothrow: true }
        ? string | null
        : string
}
export = Bin
