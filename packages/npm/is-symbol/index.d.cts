// oxlint-disable-next-line typescript/no-wrapper-object-types -- the runtime returns true for boxed Symbol objects, matching upstream is-symbol's `symbol | Symbol` predicate; the autofix downgrade to `symbol | symbol` is what this guards against.
declare function isSymbol(value: unknown): value is symbol | Symbol
export = isSymbol
