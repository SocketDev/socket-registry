declare type AnyIterable<T> = Iterable<T> | AsyncIterable<T>
declare const Streams: {
  parallelMap<T, R>(
    concurrency: number
  ): {
    (
      func: (data: T) => R | Promise<R>,
      iterable: AnyIterable<T>
    ): AsyncIterableIterator<R>
    (
      func: (data: T) => R | Promise<R>
    ): (iterable: AnyIterable<T>) => AsyncIterableIterator<R>
  }
  parallelMap<T, R>(
    concurrency: number,
    func: (data: T) => R | Promise<R>
  ): (iterable: AnyIterable<T>) => AsyncIterableIterator<R>
  parallelMap<T, R>(
    concurrency: number,
    func: (data: T) => R | Promise<R>,
    iterable: AnyIterable<T>
  ): AsyncIterableIterator<R>
}
declare namespace Promises {
  export { AnyIterable }
}
export = Streams
