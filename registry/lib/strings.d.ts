declare const Strings: {
  indentString(str: string, count?: number): string
  isNonEmptyString(value: any): value is string
  search(str: string, regexp: RegExp, fromIndex?: number): number
  stripBom(str: string): string
}
declare namespace Strings {}
export = Strings
