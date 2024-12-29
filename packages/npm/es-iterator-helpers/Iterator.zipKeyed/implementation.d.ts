declare function zipKeyed<T>(
  ...items: Iterable<T>[]
): Iterator<T> & { return(): IteratorResult<T> }
export = zipKeyed
