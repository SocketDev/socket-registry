// oxlint-disable-next-line typescript/no-wrapper-object-types -- the runtime returns true for boxed BigInt objects, matching upstream is-bigint's `bigint | BigInt` predicate; the autofix downgrade to `bigint | bigint` is what this guards against.
declare function isBigInt(value: unknown): value is bigint | BigInt
export = isBigInt
