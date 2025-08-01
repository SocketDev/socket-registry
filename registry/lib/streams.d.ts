declare type AnyIterable<T> = Iterable<T> | AsyncIterable<T>
declare const Streams: {
  parallelForEach<T>(
    concurrency: number,
    func: (data: T) => Promise<void>,
    iterable: AsyncIterable<T>
  ): Promise<void>
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
  transform(concurrency: number): {
    <T, R>(
      func: (data: T) => R | Promise<R>,
      iterable: AnyIterable<T>
    ): AsyncIterableIterator<R>
    <T, R>(
      func: (data: T) => R | Promise<R>
    ): (iterable: AnyIterable<T>) => AsyncIterableIterator<R>
  }
  transform<T, R>(
    concurrency: number,
    func: (data: T) => R | Promise<R>
  ): (iterable: AnyIterable<T>) => AsyncIterableIterator<R>
  transform<T, R>(
    concurrency: number,
    func: (data: T) => R | Promise<R>,
    iterable: AnyIterable<T>
  ): AsyncIterableIterator<R>
}
declare namespace Streams {
  export { AnyIterable }
}
export = Streams
