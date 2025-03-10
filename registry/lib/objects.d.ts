declare type GetterDefObj = { [key: PropertyKey]: () => any }
declare type LazyGetterStats = { initialized?: Set<PropertyKey> | undefined }
declare function objectEntries<T>(
  obj: { [key: string | symbol]: T } | ArrayLike<T> | null | undefined
): [string | symbol, T][]
declare function objectEntries(obj: {}): [string | symbol, any][]
declare function objectFromEntries<T = any>(
  entries: Iterable<readonly [string | symbol, T]>
): { [k: string | symbol]: T }
declare function objectFromEntries(entries: Iterable<readonly any[]>): any
declare const Objects: {
  createLazyGetter: <T>(
    name: PropertyKey,
    getter: () => T,
    stats?: LazyGetterStats | undefined
  ) => () => T
  defineGetter: <T>(
    object: object,
    propKey: PropertyKey,
    getter: () => T
  ) => object
  defineLazyGetter: <T>(
    object: object,
    propKey: PropertyKey,
    getter: () => T,
    stats?: LazyGetterStats | undefined
  ) => object
  defineLazyGetters: (
    object: object,
    getterDefObj: GetterDefObj | undefined,
    stats?: LazyGetterStats | undefined
  ) => object
  getOwnPropertyValues<T>(obj: { [key: string]: T } | null | undefined): T[]
  hasKeys(obj: any): obj is Record<string, any>
  hasOwn(
    obj: any,
    propKey: PropertyKey
  ): obj is object & Record<PropertyKey, any>
  isObject(value: any): value is { [key: PropertyKey]: any }
  isObjectObject(value: any): value is { [key: PropertyKey]: any }
  merge<T extends object, U extends object>(target: T, source: U): T & U
  objectEntries: typeof objectEntries
  objectFromEntries: typeof objectFromEntries
  toSortedObject<T>(obj: { [key: string | symbol]: T }): {
    [key: string | symbol]: T
  }
  toSortedObjectFromEntries<T>(entries: [string | symbol, T][]): {
    [key: string]: T
  }
}
declare namespace Objects {
  export { GetterDefObj, LazyGetterStats }
  export type Remap<T> = { [K in keyof T]: T[K] } extends infer O
    ? { [K in keyof O]: O[K] }
    : never
}
export = Objects
