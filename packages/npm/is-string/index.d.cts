// oxlint-disable-next-line typescript/no-wrapper-object-types -- the runtime returns true for boxed String objects, matching upstream is-string's `string | String` predicate; the autofix downgrade to `string | string` is what this guards against.
declare function isString(value: unknown): value is string | String
export = isString
