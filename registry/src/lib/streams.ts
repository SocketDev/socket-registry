/**
 * @fileoverview Stream processing utilities with streaming-iterables integration.
 * Provides async stream handling and transformation functions.
 */

const {
  normalizeIterationOptions,
  pRetry,
} = /*@__PURE__*/ require('./promises')

let _streamingIterables: any
/**
 * Get the streaming-iterables module.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getStreamingIterables() {
  if (_streamingIterables === undefined) {
    _streamingIterables =
      /*@__PURE__*/ require('../external/streaming-iterables')
  }
  return _streamingIterables
}

/**
 * Execute a function for each item in an iterable in parallel.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function parallelEach<T>(
  iterable: Iterable<T> | AsyncIterable<T>,
  func: (item: T) => Promise<any>,
  options?: any,
): Promise<void> {
  for await (const _ of parallelMap(iterable, func, options)) {
    /* empty block */
  }
}

/**
 * Map over an iterable in parallel with concurrency control.
 */
/*@__NO_SIDE_EFFECTS__*/
export function parallelMap<T, U>(
  iterable: Iterable<T> | AsyncIterable<T>,
  func: (item: T) => Promise<U>,
  options?: any,
): AsyncIterable<U> {
  const streamingIterables = getStreamingIterables()
  const opts = normalizeIterationOptions(options)
  return streamingIterables.parallelMap(
    opts.concurrency,
    (item: T) =>
      pRetry(func, {
        ...opts.retries,
        args: [item],
      }),
    iterable,
  )
}

/**
 * Transform an iterable with a function.
 */
/*@__NO_SIDE_EFFECTS__*/
export function transform<T, U>(
  iterable: Iterable<T> | AsyncIterable<T>,
  func: (item: T) => Promise<U>,
  options?: any,
): AsyncIterable<U> {
  const streamingIterables = getStreamingIterables()
  const opts = normalizeIterationOptions(options)
  return streamingIterables.transform(
    opts.concurrency,
    (item: T) =>
      pRetry(func, {
        ...opts.retries,
        args: [item],
      }),
    iterable,
  )
}
