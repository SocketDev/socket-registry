declare function flatten<T extends ArrayLike<any>>(
  array: T
): flatten.FlatArray<T>
declare namespace flatten {
  export type FlatArray<T extends ArrayLike<any>> = Array<PickValue<T[number]>>
  export type PickValue<T> =
    T extends ReadonlyArray<any>
      ? {
          [K in Extract<keyof T, number>]: PickValue<T[K]>
        }[number]
      : T
  export interface NestedArray<T> extends ReadonlyArray<T | NestedArray<T>> {}
  export interface NestedList<T> {
    [index: number]: T | NestedList<T>
    length: number
  }
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
