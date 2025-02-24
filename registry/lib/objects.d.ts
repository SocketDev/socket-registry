import constants from './constants'

declare type Internals = (typeof constants)[typeof constants.kInternalsSymbol]
declare const Objects: {
  createLazyGetter: Internals['createLazyGetter']
  defineGetter: Internals['defineGetter']
  defineLazyGetter: Internals['defineLazyGetter']
  defineLazyGetters: Internals['defineLazyGetters']
  getOwnPropertyValues<T>(obj: { [key: string]: T } | null | undefined): T[]
  hasKeys(obj: any): obj is Record<string, any>
  hasOwn(
    obj: any,
    propKey: PropertyKey
  ): obj is object & Record<PropertyKey, any>
  isObject(value: any): value is { [key: PropertyKey]: any }
  isObjectObject(value: any): value is { [key: PropertyKey]: any }
  merge<T extends object, U extends object>(target: T, source: U): T & U
  objectEntries: Internals['objectEntries']
  objectFromEntries: Internals['objectFromEntries']
  toSortedObject<T>(obj: { [key: string | symbol]: T }): {
    [key: string | symbol]: T
  }
  toSortedObjectFromEntries<T>(entries: [string | symbol, T][]): {
    [key: string]: T
  }
}
declare namespace Objects {
  export type Remap<T> = { [K in keyof T]: T[K] } extends infer O
    ? { [K in keyof O]: O[K] }
    : never
}
export = Objects
