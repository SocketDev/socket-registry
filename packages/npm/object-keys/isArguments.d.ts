interface IArguments {
  [index: number]: any
  length: number
  callee: Function
}
declare function isArguments(object: unknown): object is IArguments
export = isArguments
