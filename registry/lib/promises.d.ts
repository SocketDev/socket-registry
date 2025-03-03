declare type pOptions = {
  retries?: number | undefined
  signal?: AbortSignal | undefined
}

declare const Promises: {
  pEach<T>(
    array: T[],
    concurrency: number,
    callbackFn: (value: T, options: pOptions) => Promise<any>,
    options?: pOptions | undefined
  ): Promise<void>
  pEachChunk<T>(
    chunks: T[][],
    callbackFn: (value: T, options: pOptions) => Promise<any>,
    options?: pOptions | undefined
  ): Promise<void>
  pFilter<T>(
    array: T[],
    concurrency: number,
    callbackFn: (value: T, options: pOptions) => Promise<boolean>,
    options?: pOptions | undefined
  ): Promise<T[]>
  pFilterChunk<T>(
    chunks: T[][],
    callbackFn: (value: T, options: pOptions) => Promise<boolean>,
    options?: pOptions | undefined
  ): Promise<T[][]>
  pRetry<T, P extends (value: T, options: pOptions) => Promise<any>>(
    callbackFn: P,
    options?: pOptions | undefined
  ): ReturnType<P>
}
declare namespace Promises {
  export { pOptions }
}
export = Promises
