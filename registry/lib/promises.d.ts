declare interface POptions {
  signal?: AbortSignal
}
declare function pEach<T>(
  array: T[],
  concurrency: number,
  callbackFn: (value: T, options: POptions) => Promise<void>,
  options?: POptions
): Promise<void>
declare function pFilter<T>(
  array: T[],
  concurrency: number,
  callbackFn: (value: T, options: POptions) => Promise<boolean>,
  options?: POptions
): Promise<T[]>
declare function pEachChunk<T>(
  chunks: T[][],
  callbackFn: (value: T, options: POptions) => Promise<void>,
  options?: POptions
): Promise<void>
declare function pFilterChunk<T>(
  chunks: T[][],
  callbackFn: (value: T, options: POptions) => Promise<boolean>,
  options?: POptions
): Promise<T[][]>
declare const promisesModule: {
  pEach: typeof pEach
  pEachChunk: typeof pEachChunk
  pFilter: typeof pFilter
  pFilterChunk: typeof pFilterChunk
}
export = promisesModule
