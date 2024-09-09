declare type ComparatorValue = {
  key: string
  value: any
}
declare interface StableStringifyOptions {
  cmp?: (
    a: ComparatorValue,
    b: ComparatorValue,
    helper?: { get(key: string): any }
  ) => number
  replacer?: (this: any, key: string, value: any) => any
  space?: string | number
}
declare function stableStringify(
  value: any,
  opts?: StableStringifyOptions
): string | undefined
export = stableStringify
