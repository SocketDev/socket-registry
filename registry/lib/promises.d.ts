declare type OnRetry = (attempt: number, error: unknown, delay: number) => void
declare type pIterationContext = {
  signal: AbortSignal
}
declare type pIterationOptions = {
  concurrency?: number | undefined
  retries?: pRetryOptions | undefined
  signal?: AbortSignal | undefined
}
declare type pRetryOptions =
  | number
  | {
      args?: any[] | undefined
      backoffFactor?: number | undefined
      baseDelayMs?: number | undefined
      jitter?: boolean | undefined
      maxDelayMs?: number | undefined
      onRetry?: OnRetry | undefined
      onRetryCancelOnFalse?: boolean | undefined
      onRetryRethrow?: boolean | undefined
      retries?: number | undefined
      signal?: AbortSignal | undefined
    }
declare type pNormalizedIterationOptions = {
  concurrency: number
  retries: pRetryOptions
  signal: AbortSignal
}
declare type pNormalizedRetryOptions = {
  args: any[]
  backoffFactor: number
  baseDelayMs: number
  concurrency: number
  jitter: boolean
  maxDelayMs: number
  onRetry?: OnRetry | undefined
  onRetryCancelOnFalse: boolean
  onRetryRethrow: boolean
  retries: number
  signal: AbortSignal
}
declare const Promises: {
  normalizeIterationOptions(
    options?: pIterationOptions | undefined
  ): pNormalizedIterationOptions
  normalizeRetryOptions(
    options?: pRetryOptions | undefined
  ): pNormalizedRetryOptions
  pEach<T>(
    array: T[],
    callbackFn: (value: T, context: pIterationContext) => Promise<any>,
    options?: pIterationOptions | undefined
  ): Promise<void>
  pEachChunk<T>(
    chunks: T[][],
    callbackFn: (value: T, context: pIterationContext) => Promise<any>,
    options?: pRetryOptions | undefined
  ): Promise<void>
  pFilter<T>(
    array: T[],
    callbackFn: (value: T, context: pIterationContext) => Promise<boolean>,
    options?: pIterationOptions | undefined
  ): Promise<T[]>
  pFilterChunk<T>(
    chunks: T[][],
    callbackFn: (value: T, context: pIterationContext) => Promise<boolean>,
    options?: pRetryOptions | undefined
  ): Promise<T[][]>
  pRetry<T, P extends (value: T, context: pIterationContext) => Promise<any>>(
    callbackFn: P,
    options?: pRetryOptions | undefined
  ): ReturnType<P>
  resolveRetryOptions(options?: pRetryOptions | undefined): pRetryOptions
}
declare namespace Promises {
  export {
    OnRetry,
    pIterationContext,
    pIterationOptions,
    pNormalizedIterationOptions,
    pNormalizedRetryOptions,
    pRetryOptions
  }
}
export = Promises
