/**
 * @fileoverview Promise utilities including chunked iteration and timers.
 * Provides async control flow helpers and promise-based timing functions.
 */
'use strict'

const { arrayChunk } = /*@__PURE__*/ require('./arrays')

let _timers
/**
 * Get the timers/promises module.
 * @returns {Object} The timers/promises module.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getTimers() {
  if (_timers === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _timers = /*@__PURE__*/ require('timers/promises')
  }
  return _timers
}

/**
 * Normalize options for iteration functions.
 * @param {Object} [options] - Iteration options.
 * @returns {Object} Normalized iteration options.
 */
/*@__NO_SIDE_EFFECTS__*/
function normalizeIterationOptions(options) {
  // Handle number as concurrency shorthand
  const opts = typeof options === 'number' ? { concurrency: options } : options

  const {
    // The number of concurrent executions performed at one time.
    concurrency = 1,
    // Retries as a number or options object.
    retries,
    // AbortSignal used to support cancellation.
    signal = /*@__PURE__*/ require('./constants/abort-signal'),
  } = { __proto__: null, ...opts }

  // Ensure concurrency is at least 1
  const normalizedConcurrency = Math.max(1, concurrency)
  const retryOpts = resolveRetryOptions(retries)
  return {
    __proto__: null,
    concurrency: normalizedConcurrency,
    retries: normalizeRetryOptions({ signal, ...retryOpts }),
    signal,
  }
}

/**
 * Normalize options for retry functionality.
 * @param {Object|number} [options] - Retry options or number of retries.
 * @returns {Object} Normalized retry options.
 */
/*@__NO_SIDE_EFFECTS__*/
function normalizeRetryOptions(options) {
  const resolved = resolveRetryOptions(options)
  const {
    // Arguments to pass to the callback function.
    args = [],
    // Multiplier for exponential backoff (e.g., 2 doubles delay each retry).
    backoffFactor = resolved.factor || 2,
    // Initial delay before the first retry (in milliseconds).
    baseDelayMs = resolved.minTimeout || 200,
    // Whether to apply randomness to spread out retries.
    jitter = true,
    // Upper limit for any backoff delay (in milliseconds).
    maxDelayMs = resolved.maxTimeout || 10000,
    // Optional callback invoked on each retry attempt:
    // (attempt: number, error: unknown, delay: number) => void
    onRetry,
    // Whether onRetry can cancel retries by returning `false`.
    onRetryCancelOnFalse = false,
    // Whether onRetry will rethrow errors.
    onRetryRethrow = false,
    // Number of retry attempts (0 = no retries, only initial attempt).
    retries = resolved.retries || 0,
    // AbortSignal used to support cancellation.
    signal = /*@__PURE__*/ require('./constants/abort-signal'),
  } = resolved
  return {
    __proto__: null,
    args,
    backoffFactor,
    baseDelayMs,
    jitter,
    maxDelayMs,
    minTimeout: baseDelayMs,
    maxTimeout: maxDelayMs,
    onRetry,
    onRetryCancelOnFalse,
    onRetryRethrow,
    retries,
    signal,
  }
}

/**
 * Resolve retry options from various input formats.
 * @param {Object|number} [options] - Options object or number of retries.
 * @returns {Object} Resolved retry options object.
 */
/*@__NO_SIDE_EFFECTS__*/
function resolveRetryOptions(options) {
  const defaults = {
    __proto__: null,
    retries: 0,
    minTimeout: 200,
    maxTimeout: 10000,
    factor: 2,
  }

  if (typeof options === 'number') {
    return { ...defaults, retries: options }
  }

  return options ? { ...defaults, ...options } : defaults
}

/**
 * Execute an async function for each array element with concurrency control.
 * @param {any[]} array - Array to iterate over.
 * @param {Function} callbackFn - Async function to execute for each element.
 * @param {Object} [options] - Iteration options including concurrency and retries.
 * @returns {Promise<void>} Resolves when all iterations complete.
 */
/*@__NO_SIDE_EFFECTS__*/
async function pEach(array, callbackFn, options) {
  const iterOpts = normalizeIterationOptions(options)
  const { concurrency, retries, signal } = iterOpts

  // Process items with concurrency control.
  const chunks = arrayChunk(array, concurrency)
  for (const chunk of chunks) {
    if (signal?.aborted) {
      return
    }
    // Process each item in the chunk concurrently.
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(
      chunk.map(item =>
        pRetry(callbackFn, {
          ...retries,
          args: [item],
          signal,
        }),
      ),
    )
  }
}

/**
 * Filter an array asynchronously with concurrency control.
 * @param {any[]} array - Array to filter.
 * @param {Function} callbackFn - Async predicate function.
 * @param {Object} [options] - Iteration options including concurrency and retries.
 * @returns {Promise<any[]>} Filtered array.
 */
/*@__NO_SIDE_EFFECTS__*/
async function pFilter(array, callbackFn, options) {
  const iterOpts = normalizeIterationOptions(options)
  return (
    await pFilterChunk(
      arrayChunk(array, iterOpts.concurrency),
      callbackFn,
      iterOpts.retries,
    )
  ).flat()
}

/**
 * Process array in chunks with an async callback.
 * @param {any[]} array - Array to process.
 * @param {Function} callbackFn - Async function to execute for each chunk.
 * @param {Object} [options] - Options including chunkSize and retry options.
 * @returns {Promise<void>} Resolves when all chunks are processed.
 */
/*@__NO_SIDE_EFFECTS__*/
async function pEachChunk(array, callbackFn, options) {
  const { chunkSize = 100, ...retryOpts } = options || {}
  const chunks = arrayChunk(array, chunkSize)
  const normalizedRetryOpts = normalizeRetryOptions(retryOpts)
  const { signal } = normalizedRetryOpts
  for (const chunk of chunks) {
    if (signal?.aborted) {
      return
    }
    // eslint-disable-next-line no-await-in-loop
    await pRetry(callbackFn, {
      ...normalizedRetryOpts,
      args: [chunk],
    })
  }
}

/**
 * Filter chunked arrays with an async predicate.
 * @param {any[][]} chunks - Array of array chunks.
 * @param {Function} callbackFn - Async predicate function.
 * @param {Object} [options] - Retry options.
 * @returns {Promise<any[][]>} Filtered chunks.
 */
/*@__NO_SIDE_EFFECTS__*/
async function pFilterChunk(chunks, callbackFn, options) {
  const retryOpts = normalizeRetryOptions(options)
  const { signal } = retryOpts
  const { length } = chunks
  const filteredChunks = Array(length)
  for (let i = 0; i < length; i += 1) {
    // Process each chunk, filtering based on the callback function.
    if (signal?.aborted) {
      filteredChunks[i] = []
    } else {
      const chunk = chunks[i]
      // eslint-disable-next-line no-await-in-loop
      const predicateResults = await Promise.all(
        chunk.map(value =>
          pRetry(callbackFn, {
            ...retryOpts,
            args: [value],
          }),
        ),
      )
      filteredChunks[i] = chunk.filter((_v, i) => predicateResults[i])
    }
  }
  return filteredChunks
}

/**
 * Retry an async function with exponential backoff.
 * @param {Function} callbackFn - Async function to retry.
 * @param {Object} [options] - Retry options including retries, backoff, and delays.
 * @returns {Promise<any>} Result of the successful function call.
 * @throws {Error} The last error if all retries fail.
 */
/*@__NO_SIDE_EFFECTS__*/
async function pRetry(callbackFn, options) {
  const {
    args,
    backoffFactor,
    baseDelayMs,
    jitter,
    maxDelayMs,
    onRetry,
    onRetryCancelOnFalse,
    onRetryRethrow,
    retries,
    signal,
  } = normalizeRetryOptions(options)
  if (signal?.aborted) {
    return undefined
  }
  if (retries === 0) {
    return await callbackFn(...args, { signal })
  }

  const UNDEFINED_TOKEN = /*@__PURE__*/ require('./constants/undefined-token')
  const timers = getTimers()

  let attempts = retries
  let delay = baseDelayMs
  let error = UNDEFINED_TOKEN

  while (attempts-- >= 0 && !signal?.aborted) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await callbackFn(...args, { signal })
    } catch (e) {
      if (error === UNDEFINED_TOKEN) {
        error = e
      }
      if (attempts < 0) {
        break
      }
      let waitTime = delay
      if (jitter) {
        // Add randomness: Pick a value between 0 and `delay`.
        waitTime += Math.floor(Math.random() * delay)
      }
      // Clamp wait time to max delay.
      waitTime = Math.min(waitTime, maxDelayMs)
      if (typeof onRetry === 'function') {
        try {
          const result = onRetry(retries - attempts, e, waitTime)
          if (result === false && onRetryCancelOnFalse) {
            break
          }
        } catch (e) {
          if (onRetryRethrow) {
            throw e
          }
        }
      }
      // eslint-disable-next-line no-await-in-loop
      await timers.setTimeout(waitTime, undefined, { signal })
      // Exponentially increase the delay for the next attempt, capping at maxDelayMs.
      delay = Math.min(delay * backoffFactor, maxDelayMs)
    }
  }
  if (error !== UNDEFINED_TOKEN) {
    throw error
  }
  return undefined
}

module.exports = {
  normalizeIterationOptions,
  normalizeRetryOptions,
  pEach,
  pEachChunk,
  pFilter,
  pFilterChunk,
  pRetry,
  resolveRetryOptions,
}
