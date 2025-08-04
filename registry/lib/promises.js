'use strict'

const { arrayChunk } = /*@__PURE__*/ require('./arrays')

let _timers
/*@__NO_SIDE_EFFECTS__*/
function getTimers() {
  if (_timers === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _timers = /*@__PURE__*/ require('timers/promises')
  }
  return _timers
}

/*@__NO_SIDE_EFFECTS__*/
function normalizeIterationOptions(options) {
  const {
    // The number of concurrent executions performed at one time.
    concurrency = 1,
    // Retries as a number or options object.
    retries,
    // AbortSignal used to support cancellation.
    signal = /*@__PURE__*/ require('./constants/abort-signal')
  } = { __proto__: null, ...options }
  const retryOpts = resolveRetryOptions(retries)
  return {
    __proto__: null,
    concurrency,
    retries: normalizeRetryOptions({ signal, ...retryOpts }),
    signal
  }
}

/*@__NO_SIDE_EFFECTS__*/
function normalizeRetryOptions(options) {
  const {
    // Arguments to pass to the callback function.
    args = [],
    // Multiplier for exponential backoff (e.g., 2 doubles delay each retry).
    backoffFactor = 2,
    // Initial delay before the first retry (in milliseconds).
    baseDelayMs = 200,
    // Whether to apply randomness to spread out retries.
    jitter = true,
    // Upper limit for any backoff delay (in milliseconds).
    maxDelayMs = 10000,
    // Optional callback invoked on each retry attempt:
    // (attempt: number, error: unknown, delay: number) => void
    onRetry,
    // Whether onRetry can cancel retries by returning `false`.
    onRetryCancelOnFalse = false,
    // Whether onRetry will rethrow errors.
    onRetryRethrow = false,
    // Number of retry attempts (0 = no retries, only initial attempt).
    retries = 0,
    // AbortSignal used to support cancellation.
    signal = /*@__PURE__*/ require('./constants/abort-signal')
  } = resolveRetryOptions(options)
  return {
    __proto__: null,
    args,
    backoffFactor,
    baseDelayMs,
    jitter,
    maxDelayMs,
    onRetry,
    onRetryCancelOnFalse,
    onRetryRethrow,
    retries,
    signal
  }
}

/*@__NO_SIDE_EFFECTS__*/
function resolveRetryOptions(options) {
  return {
    __proto__: null,
    ...(typeof options === 'number' ? { retries: options } : options)
  }
}

/*@__NO_SIDE_EFFECTS__*/
async function pEach(array, callbackFn, options) {
  const iterOpts = normalizeIterationOptions(options)
  await pEachChunk(
    arrayChunk(array, iterOpts.concurrency),
    callbackFn,
    iterOpts.retries
  )
}

/*@__NO_SIDE_EFFECTS__*/
async function pFilter(array, callbackFn, options) {
  const iterOpts = normalizeIterationOptions(options)
  return (
    await pFilterChunk(
      arrayChunk(array, iterOpts.concurrency),
      callbackFn,
      iterOpts.retries
    )
  ).flat()
}

/*@__NO_SIDE_EFFECTS__*/
async function pEachChunk(chunks, callbackFn, options) {
  const retryOpts = normalizeRetryOptions(options)
  const { signal } = retryOpts
  for (const chunk of chunks) {
    if (signal?.aborted) {
      return
    }
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(
      chunk.map(value =>
        pRetry(callbackFn, {
          ...retryOpts,
          args: [value]
        })
      )
    )
  }
}

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
            args: [value]
          })
        )
      )
      filteredChunks[i] = chunk.filter((_v, i) => predicateResults[i])
    }
  }
  return filteredChunks
}

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
    signal
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
  resolveRetryOptions
}
