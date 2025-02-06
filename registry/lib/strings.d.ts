import { PartialFilesConfiguration as BiomeConfiguration } from '@biomejs/wasm-nodejs'

declare function biomeFormat(
  str: string,
  options?: BiomeConfiguration & {
    filePath: string
    filepath?: string
    range?: [number, number]
  }
): Promise<string>
declare function indentString(str: string, count?: number): string
declare function isNonEmptyString(value: any): value is string
declare function search(str: string, regexp: RegExp, fromIndex?: number): number
declare function stripBom(str: string): string
declare const stringsModule: {
  biomeFormat: typeof biomeFormat
  indentString: typeof indentString
  isNonEmptyString: typeof isNonEmptyString
  search: typeof search
  stripBom: typeof stripBom
}
export = stringsModule
