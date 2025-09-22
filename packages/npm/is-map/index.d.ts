declare function isMap<T>(
  object: T | {},
): object is T extends ReadonlyMap<any, any>
  ? unknown extends T
    ? never
    : ReadonlyMap<any, any>
  : Map<unknown, unknown>
export = isMap
