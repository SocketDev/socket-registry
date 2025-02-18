import constants from './constants'

declare type Internals = (typeof constants)[typeof constants.kInternalsSymbol]
declare function getOwnPropertyValues<T>(
  obj: { [key: string]: T } | null | undefined
): T[]
declare function hasKeys(obj: any): obj is Record<string, any>
declare function hasOwn(
  obj: any,
  propKey: PropertyKey
): obj is object & Record<PropertyKey, any>
declare function isObject(value: any): value is { [key: PropertyKey]: any }
declare function isObjectObject(
  value: any
): value is { [key: PropertyKey]: any }
declare function merge<T extends object, U extends object>(
  target: T,
  source: U
): T & U
declare function toSortedObject<T>(obj: { [key: string | symbol]: T }): {
  [key: string | symbol]: T
}
declare function toSortedObjectFromEntries<T>(
  entries: [string | symbol, T][]
): {
  [key: string]: T
}
declare const objectsModule: {
  createLazyGetter: Internals['createLazyGetter']
  defineGetter: Internals['defineGetter']
  defineLazyGetter: Internals['defineLazyGetter']
  defineLazyGetters: Internals['defineLazyGetters']
  getOwnPropertyValues: typeof getOwnPropertyValues
  hasKeys: typeof hasKeys
  hasOwn: typeof hasOwn
  isObject: typeof isObject
  isObjectObject: typeof isObjectObject
  merge: typeof merge
  objectEntries: Internals['objectEntries']
  objectFromEntries: Internals['objectFromEntries']
  toSortedObject: typeof toSortedObject
  toSortedObjectFromEntries: typeof toSortedObjectFromEntries
}
export = objectsModule
