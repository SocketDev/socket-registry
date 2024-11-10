import { Options as PrettierOptions } from 'prettier'

declare function indentString(str: string, count?: number): string
declare function isNonEmptyString(value: any): value is string
declare function prettierFormat(
  str: string,
  options?: PrettierOptions
): Promise<string>
declare function search(str: string, regexp: RegExp, fromIndex?: number): number
declare function stripBom(str: string): string
declare const stringsModule: {
  indentString: typeof indentString
  isNonEmptyString: typeof isNonEmptyString
  prettierFormat: typeof prettierFormat
  search: typeof search
  stripBom: typeof stripBom
}
export = stringsModule
