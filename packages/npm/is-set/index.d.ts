declare function isSet<T>(
  // biome-ignore lint/complexity/noBannedTypes: Represents any non-nullable value.
  object: T | {},
): object is T extends ReadonlySet<any>
  ? unknown extends T
    ? never
    : ReadonlySet<any>
  : Set<unknown>
export = isSet
