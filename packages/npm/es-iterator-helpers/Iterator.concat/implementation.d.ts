declare function concat<T>(
  ...items: Array<Iterable<T>>
): Iterator<T> & { return(): IteratorResult<T> }
export = concat
