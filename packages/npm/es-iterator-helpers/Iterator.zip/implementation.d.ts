declare function zip<T>(
  ...items: Array<Iterable<T>>
): Iterator<T> & { return(): IteratorResult<T> }
export = zip
