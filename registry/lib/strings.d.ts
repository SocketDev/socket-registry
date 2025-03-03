import { PartialFilesConfiguration as BiomeConfiguration } from '@biomejs/wasm-nodejs'
import { Remap } from './objects'

declare type BiomeFormatOptions = Remap<
  BiomeConfiguration & {
    filePath: string
    filepath?: string | undefined
    range?: [number, number]
  }
>
declare const Strings: {
  biomeFormat(str: string, options?: BiomeFormatOptions): Promise<string>
  indentString(str: string, count?: number): string
  isNonEmptyString(value: any): value is string
  search(str: string, regexp: RegExp, fromIndex?: number): number
  stripBom(str: string): string
}
declare namespace Strings {
  export { BiomeFormatOptions }
}
export = Strings
