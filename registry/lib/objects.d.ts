declare type ConstantsObjectOptions = {
  getters?: GetterDefObj | undefined
  internals?: object | undefined
  mixin?: object | undefined
}
declare type GetterDefObj = { [key: PropertyKey]: () => any }
declare type LazyGetterStats = { initialized?: Set<PropertyKey> | undefined }
declare function objectEntries<T>(
  obj: { [key: string | symbol]: T } | ArrayLike<T> | null | undefined
): Array<[string | symbol, T]>
declare function objectEntries(obj: {}): Array<[string | symbol, any]>
declare const Objects: {
  readonly createConstantsObject: (
    props: object,
    options?: ConstantsObjectOptions | undefined
  ) => Readonly<object>
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
  toSortedObject<T>(obj: { [key: string | symbol]: T }): {
    [key: string | symbol]: T
  }
  toSortedObjectFromEntries<T>(entries: Array<[string | symbol, T]>): {
    [key: string]: T
  }
}
declare namespace Objects {
  export { ConstantsObjectOptions, GetterDefObj, LazyGetterStats }
  export type Remap<T> = { [K in keyof T]: T[K] } extends infer O
    ? { [K in keyof O]: O[K] }
    : never
}
export = Objects
