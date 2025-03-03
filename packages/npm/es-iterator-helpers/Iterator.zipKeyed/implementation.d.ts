declare function zipKeyed<T>(
  ...items: Array<Iterable<T>>
): Iterator<T> & { return(): IteratorResult<T> }
export = zipKeyed
