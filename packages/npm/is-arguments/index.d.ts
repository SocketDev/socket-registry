interface IArguments {
  [index: number]: any
  length: number
  // biome-ignore lint/complexity/noBannedTypes: Matches built-in IArguments interface.
  callee: Function
}
declare function isArguments(object: unknown): object is IArguments
export = isArguments
