declare function getOwnPropertyValues<T>(obj: { [key: string]: T }): T[]
declare function isObject(value: any): value is object
declare function isObjectObject(value: any): value is { [key: string]: any }
declare function merge<T extends object, U extends object>(
  target: T,
  source: U
): T & U
declare function toSortedObject<T>(obj: { [key: string]: T }): {
  [key: string]: T
}
declare function toSortedObjectFromEntries<T>(entries: [string, T][]): {
  [key: string]: T
}
declare const objectsModule: {
  getOwnPropertyValues: typeof getOwnPropertyValues
  isObject: typeof isObject
  isObjectObject: typeof isObjectObject
  merge: typeof merge
  toSortedObject: typeof toSortedObject
  toSortedObjectFromEntries: typeof toSortedObjectFromEntries
}
export = objectsModule
