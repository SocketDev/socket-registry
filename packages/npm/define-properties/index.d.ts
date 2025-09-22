declare function defineProperties<T extends object>(
  object: T,
  map: { [key: PropertyKey]: any },
  predicates?: true | (() => boolean),
): T
export = defineProperties
