declare function concat<T>(
  ...items: Iterable<T>[]
): Iterator<T> & { return(): IteratorResult<T> }
export = concat
