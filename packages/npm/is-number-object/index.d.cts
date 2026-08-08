// oxlint-disable-next-line typescript/no-wrapper-object-types -- the runtime returns true for boxed Number objects, matching upstream is-number-object's `number | Number` predicate; the autofix downgrade to `number | number` is what this guards against.
declare function isNumberObject(value: unknown): value is number | Number
export = isNumberObject
