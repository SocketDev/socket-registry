interface EsIterator<T> {
  drop<T>(limit: number): EsIterator<T>
  every<S extends T>(
    predicate: (value: T, index: number) => value is S,
  ): this is EsIterator<S>
  every(predicate: (value: T, index: number) => unknown): boolean
  filter<S extends T>(
    predicate: (value: T, index: number) => value is S,
  ): EsIterator<S>
  filter(predicate: (value: T, index: number) => unknown): EsIterator<T>
  find<S extends T>(
    predicate: (value: T, index: number) => value is S,
  ): S | undefined
  find(
    predicate: (value: T, index: number) => unknown,
  ): EsIterator<T> | undefined
  flatMap<U>(callbackFn: (value: T, index: number) => unknown): U
  forEach(callbackFn: (value: T, index: number) => void): void
  map<U>(callbackFn: (value: T, index: number) => U): EsIterator<U>
  reduce(
    callbackfn: (previousValue: T, currentValue: T, currentIndex: number) => T,
  ): T
  reduce(
    callbackfn: (previousValue: T, currentValue: T, currentIndex: number) => T,
    initialValue: T,
  ): T
  reduce<U>(
    callbackfn: (previousValue: U, currentValue: T, currentIndex: number) => U,
    initialValue: U,
  ): U
  some(predicate: (value: T, index: number) => unknown): boolean
  take<T>(limit: number): EsIterator<T>
  toArray<T>(): T[]
}
export = EsIterator
