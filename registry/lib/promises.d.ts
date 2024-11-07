declare interface POptions {
  signal?: AbortSignal
}
declare type pCallback = (value: T, options: POptions) => Promise<any>
declare type pPredicate = (value: T, options: POptions) => Promise<boolean>
declare function pEach<T>(
  array: T[],
  concurrency: number,
  callbackFn: pCallback,
  options?: POptions
): Promise<void>
declare function pFilter<T>(
  array: T[],
  concurrency: number,
  callbackFn: pPredicate,
  options?: POptions
): Promise<T[]>
declare function pEachChunk<T>(
  chunks: T[][],
  callbackFn: pCallback,
  options?: POptions
): Promise<void>
declare function pFilterChunk<T>(
  chunks: T[][],
  callbackFn: pPredicate,
  options?: POptions
): Promise<T[][]>
declare const promisesModule: {
  pEach: typeof pEach
  pEachChunk: typeof pEachChunk
  pFilter: typeof pFilter
  pFilterChunk: typeof pFilterChunk
}
export = promisesModule
