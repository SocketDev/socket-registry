declare function isMap<T>(
  // biome-ignore lint/complexity/noBannedTypes: Represents any non-nullable value.
  object: T | {},
): object is T extends ReadonlyMap<any, any>
  ? unknown extends T
    ? never
    : ReadonlyMap<any, any>
  : Map<unknown, unknown>
export = isMap
