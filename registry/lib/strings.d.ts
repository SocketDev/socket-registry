declare function indentString(str: string, count?: number): string
declare function isNonEmptyString(value: any): value is string
declare function search(str: string, regexp: RegExp, fromIndex?: number): number
declare function prettierFormat(str: string, options?: object): Promise<string>
declare const stringsModule: {
  indentString: typeof indentString
  isNonEmptyString: typeof isNonEmptyString
  search: typeof search
  prettierFormat: typeof prettierFormat
}
export = stringsModule
