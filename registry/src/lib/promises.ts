/**
 * @fileoverview Promise utilities including chunked iteration and timers.
 * Provides async control flow helpers and promise-based timing functions.
 */

import { arrayChunk } from './arrays'
import UNDEFINED_TOKEN from './constants/UNDEFINED_TOKEN'
import abortSignal from './constants/abort-signal'

export interface RetryOptions {
  args?: unknown[]
  backoffFactor?: number
  baseDelayMs?: number
  factor?: number
  jitter?: boolean
  maxDelayMs?: number
  maxTimeout?: number
  minTimeout?: number
  onRetry?: (attempt: number, error: unknown, delay: number) => boolean | void
  onRetryCancelOnFalse?: boolean
  onRetryRethrow?: boolean
  retries?: number
  signal?: AbortSignal
}

export interface IterationOptions {
  concurrency?: number
  retries?: number | RetryOptions
  signal?: AbortSignal
}

let _timers: typeof import('node:timers/promises') | undefined
/**
 * Get the timers/promises module.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getTimers() {
  if (_timers === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _timers = /*@__PURE__*/ require('timers/promises')
  }
  return _timers!
}

/**
 * Normalize options for iteration functions.
 */
/*@__NO_SIDE_EFFECTS__*/
export function normalizeIterationOptions(
  options?: number | IterationOptions,
): { concurrency: number; retries: RetryOptions; signal: AbortSignal } {
  // Handle number as concurrency shorthand
  const opts = typeof options === 'number' ? { concurrency: options } : options

  const {
    // The number of concurrent executions performed at one time.
    concurrency = 1,
    // Retries as a number or options object.
    retries,
    // AbortSignal used to support cancellation.
    signal = abortSignal,
  } = { __proto__: null, ...opts } as IterationOptions

  // Ensure concurrency is at least 1
  const normalizedConcurrency = Math.max(1, concurrency)
  const retryOpts = resolveRetryOptions(retries)
  return {
    __proto__: null,
    concurrency: normalizedConcurrency,
    retries: normalizeRetryOptions({ signal, ...retryOpts }),
    signal,
  } as { concurrency: number; retries: RetryOptions; signal: AbortSignal }
}

/**
 * Normalize options for retry functionality.
 */
/*@__NO_SIDE_EFFECTS__*/
export function normalizeRetryOptions(
  options?: number | RetryOptions,
): RetryOptions {
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
    signal = abortSignal,
  } = resolved
  return {
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
  } as RetryOptions
}

/**
 * Resolve retry options from various input formats.
 */
/*@__NO_SIDE_EFFECTS__*/
export function resolveRetryOptions(
  options?: number | RetryOptions,
): RetryOptions {
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
 */
/*@__NO_SIDE_EFFECTS__*/
export async function pEach<T>(
  array: T[],
  callbackFn: (item: T) => Promise<unknown>,
  options?: number | IterationOptions,
): Promise<void> {
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
      chunk.map((item: T) =>
        pRetry((...args: unknown[]) => callbackFn(args[0] as T), {
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
 */
/*@__NO_SIDE_EFFECTS__*/
export async function pFilter<T>(
  array: T[],
  callbackFn: (item: T) => Promise<boolean>,
  options?: number | IterationOptions,
): Promise<T[]> {
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
 */
/*@__NO_SIDE_EFFECTS__*/
export async function pEachChunk<T>(
  array: T[],
  callbackFn: (chunk: T[]) => Promise<unknown>,
  options?: RetryOptions & { chunkSize?: number },
): Promise<void> {
  const { chunkSize = 100, ...retryOpts } = options || {}
  const chunks = arrayChunk(array, chunkSize)
  const normalizedRetryOpts = normalizeRetryOptions(retryOpts)
  const { signal } = normalizedRetryOpts
  for (const chunk of chunks) {
    if (signal?.aborted) {
      return
    }
    // eslint-disable-next-line no-await-in-loop
    await pRetry((...args: unknown[]) => callbackFn(args[0] as T[]), {
      ...normalizedRetryOpts,
      args: [chunk],
    })
  }
}

/**
 * Filter chunked arrays with an async predicate.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function pFilterChunk<T>(
  chunks: T[][],
  callbackFn: (value: T) => Promise<boolean>,
  options?: number | RetryOptions,
): Promise<T[][]> {
  const retryOpts = normalizeRetryOptions(options)
  const { signal } = retryOpts
  const { length } = chunks
  const filteredChunks = Array(length)
  for (let i = 0; i < length; i += 1) {
    // Process each chunk, filtering based on the callback function.
    if (signal?.aborted) {
      filteredChunks[i] = []
    } else {
      const chunk = chunks[i]!
      // eslint-disable-next-line no-await-in-loop
      const predicateResults = await Promise.all(
        chunk.map(value =>
          pRetry((...args: unknown[]) => callbackFn(args[0] as T), {
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
 * @throws {Error} The last error if all retries fail.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function pRetry<T>(
  callbackFn: (...args: unknown[]) => Promise<T>,
  options?: number | RetryOptions,
): Promise<T | undefined> {
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
    return await callbackFn(...(args || []), { signal })
  }

  const timers = getTimers()

  let attempts = retries!
  let delay = baseDelayMs!
  let error: unknown = UNDEFINED_TOKEN

  while (attempts-- >= 0 && !signal?.aborted) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await callbackFn(...(args || []), { signal })
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
      waitTime = Math.min(waitTime, maxDelayMs!)
      if (typeof onRetry === 'function') {
        try {
          const result = onRetry(retries! - attempts, e, waitTime)
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
      delay = Math.min(delay * backoffFactor!, maxDelayMs!)
    }
  }
  if (error !== UNDEFINED_TOKEN) {
    throw error
  }
  return undefined
}
