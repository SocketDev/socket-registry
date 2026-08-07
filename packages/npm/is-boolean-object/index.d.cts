// oxlint-disable-next-line typescript/no-wrapper-object-types -- the runtime returns true for boxed Boolean objects, matching upstream is-boolean-object's `boolean | Boolean` predicate; the autofix downgrade to `boolean | boolean` is what this guards against.
declare function isBoolean(value: unknown): value is boolean | Boolean
export = isBoolean
