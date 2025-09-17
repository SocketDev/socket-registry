'use strict'

const {
  normalizeIterationOptions,
  pRetry
} = /*@__PURE__*/ require('./promises')

let _streamingIterables
/**
 * Get the streaming-iterables module.
 * @returns {Object} The streaming-iterables module.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getStreamingIterables() {
  if (_streamingIterables === undefined) {
    _streamingIterables = /*@__PURE__*/ require('../external/streaming-iterables')
  }
  return _streamingIterables
}

/**
 * Execute a function for each item in an iterable in parallel.
 * @param {AsyncIterable} iterable - The async iterable to process.
 * @param {Function} func - Function to execute for each item.
 * @param {Object} [options] - Iteration options including concurrency.
 * @returns {Promise<void>} Resolves when all items are processed.
 */
/*@__NO_SIDE_EFFECTS__*/
async function parallelEach(iterable, func, options) {
  for await (const _ of parallelMap(iterable, func, options)) {
    /* empty block */
  }
}

/**
 * Map over an iterable in parallel with concurrency control.
 * @param {AsyncIterable} iterable - The async iterable to map.
 * @param {Function} func - Mapping function.
 * @param {Object} [options] - Iteration options including concurrency.
 * @returns {AsyncIterable} Async iterable of mapped values.
 */
/*@__NO_SIDE_EFFECTS__*/
function parallelMap(iterable, func, options) {
  const streamingIterables = getStreamingIterables()
  const opts = normalizeIterationOptions(options)
  return streamingIterables.parallelMap(
    opts.concurrency,
    item =>
      pRetry(func, {
        ...opts.retries,
        args: [item]
      }),
    iterable
  )
}

/**
 * Transform an iterable with a function.
 * @param {AsyncIterable} iterable - The async iterable to transform.
 * @param {Function} func - Transform function.
 * @param {Object} [options] - Iteration options including concurrency.
 * @returns {AsyncIterable} Transformed async iterable.
 */
/*@__NO_SIDE_EFFECTS__*/
function transform(iterable, func, options) {
  const streamingIterables = getStreamingIterables()
  const opts = normalizeIterationOptions(options)
  return streamingIterables.transform(
    opts.concurrency,
    item =>
      pRetry(func, {
        ...opts.retries,
        args: [item]
      }),
    iterable
  )
}

module.exports = {
  parallelEach,
  parallelMap,
  transform
}
