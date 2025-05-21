declare type BlankString = string & { __blankBrand: true }
declare type EmptyString = string & { __emptyBrand: true }
declare const Strings: {
  indentString(str: string, count?: number): string
  isBlankString(value: unknown): value is BlankString
  isNonEmptyString(value: unknown): value is Exclude<string, EmptyString>
  search(str: string, regexp: RegExp, fromIndex?: number): number
  stripBom(str: string): string
}
declare namespace Strings {
  export { BlankString, EmptyString }
}
export = Strings
