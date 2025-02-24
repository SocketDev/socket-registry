declare type pOptions = {
  retries?: number
  signal?: AbortSignal
}

declare const Promises: {
  pEach<T>(
    array: T[],
    concurrency: number,
    callbackFn: (value: T, options: pOptions) => Promise<any>,
    options?: pOptions
  ): Promise<void>
  pEachChunk<T>(
    chunks: T[][],
    callbackFn: (value: T, options: pOptions) => Promise<any>,
    options?: pOptions
  ): Promise<void>
  pFilter<T>(
    array: T[],
    concurrency: number,
    callbackFn: (value: T, options: pOptions) => Promise<boolean>,
    options?: pOptions
  ): Promise<T[]>
  pFilterChunk<T>(
    chunks: T[][],
    callbackFn: (value: T, options: pOptions) => Promise<boolean>,
    options?: pOptions
  ): Promise<T[][]>
  pRetry<T, P extends (value: T, options: pOptions) => Promise<any>>(
    callbackFn: P,
    options?: pOptions
  ): ReturnType<P>
}
declare namespace Promises {
  export { pOptions }
}
export = Promises
