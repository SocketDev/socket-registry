declare type FlatArray<T extends ArrayLike<any>> = Array<PickValue<T[number]>>
declare interface NestedArray<T> extends ReadonlyArray<T | NestedArray<T>> {}
declare interface NestedList<T> {
  [index: number]: T | NestedList<T>
  length: number
}
declare type PickValue<T> = T extends readonly any[]
  ? {
      [K in Extract<keyof T, number>]: PickValue<T[K]>
    }[number]
  : T
declare function flatten<T extends ArrayLike<any>>(array: T): FlatArray<T>
declare namespace flatten {
  export { FlatArray, NestedArray, NestedList, PickValue }
  export function depth<T extends ArrayLike<any>>(
    array: NestedArray<T>,
    depth: number
  ): NestedArray<T>
  export function depthFrom<T extends ArrayLike<any>>(
    array: NestedList<T>,
    depth: number
  ): NestedArray<T>
  export function from<T extends ArrayLike<any>>(
    array: NestedList<T>
  ): FlatArray<T>
}
export = flatten
