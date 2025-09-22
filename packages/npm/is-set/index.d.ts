declare function isSet<T>(
  object: T | {},
): object is T extends ReadonlySet<any>
  ? unknown extends T
    ? never
    : ReadonlySet<any>
  : Set<unknown>
export = isSet
