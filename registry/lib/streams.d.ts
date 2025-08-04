/// <reference types="node" />
import { pIterationOptions } from './promises'

declare type sIterationOptions = pIterationOptions
declare type AnyIterable<T> =
  | Iterable<T>
  | AsyncIterable<T>
  | NodeJS.ReadableStream
declare const Streams: {
  parallelEach<T>(
    iterable: AnyIterable<T>,
    func: (data: T) => Promise<void>,
    options?: sIterationOptions | undefined
  ): Promise<void>
  parallelMap<T, R>(
    iterable: AnyIterable<T>,
    func: (data: T) => R | Promise<R>,
    options?: sIterationOptions | undefined
  ): AsyncIterableIterator<R>
  transform<T, R>(
    iterable: AnyIterable<T>,
    func: (data: T) => R | Promise<R>,
    options?: sIterationOptions | undefined
  ): AsyncIterableIterator<R>
}
declare namespace Streams {
  export { AnyIterable, sIterationOptions }
}
export = Streams
