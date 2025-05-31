declare type BlankString = string & { __blankBrand: true }
declare type EmptyString = string & { __emptyBrand: true }
declare const Strings: {
  applyLinePrefix(str: string, prefix?: string | undefined): string
  indentString(str: string, count?: number | undefined): string
  isBlankString(value: unknown): value is BlankString
  isNonEmptyString(value: unknown): value is Exclude<string, EmptyString>
  search(str: string, regexp: RegExp, fromIndex?: number | undefined): number
  stripBom(str: string): string
}
declare namespace Strings {
  export { BlankString, EmptyString }
}
export = Strings
