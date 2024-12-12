declare type pOptions = {
  retries?: number
  signal?: AbortSignal
}
declare type pCallback = (value: T, options: pOptions) => Promise<any>
declare type pPredicate = (value: T, options: pOptions) => Promise<boolean>
declare function pEach<T>(
  array: T[],
  concurrency: number,
  callbackFn: pCallback,
  options?: pOptions
): Promise<void>
declare function pFilter<T>(
  array: T[],
  concurrency: number,
  callbackFn: pPredicate,
  options?: pOptions
): Promise<T[]>
declare function pEachChunk<T>(
  chunks: T[][],
  callbackFn: pCallback,
  options?: pOptions
): Promise<void>
declare function pFilterChunk<T>(
  chunks: T[][],
  callbackFn: pPredicate,
  options?: pOptions
): Promise<T[][]>
declare function pRetry(
  callbackFn: pCallback,
  options?: pOptions
): ReturnType<pCallback>
declare const promisesModule: {
  pEach: typeof pEach
  pEachChunk: typeof pEachChunk
  pFilter: typeof pFilter
  pFilterChunk: typeof pFilterChunk
  pRetry: typeof pRetry
}
export = promisesModule
