declare function zip<T>(
  ...items: Iterable<T>[]
): Iterator<T> & { return(): IteratorResult<T> }
export = zip
