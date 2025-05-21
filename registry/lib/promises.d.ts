declare type pRetryOptions =
  | number
  | {
      backoffFactor?: number | undefined
      baseDelayMs?: number | undefined
      jitter?: boolean | undefined
      maxDelayMs?: number | undefined
      onRetry?: (
        attempt: number,
        error: unknown,
        delay: number
      ) => void | undefined
      retries?: number | undefined
      signal?: AbortSignal | undefined
    }
declare type pOptions = {
  retries?: pRetryOptions | undefined
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
    options?: pRetryOptions | undefined
  ): ReturnType<P>
}
declare namespace Promises {
  export { pOptions, pRetryOptions }
}
export = Promises
