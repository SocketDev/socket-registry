'use strict'

const { arrayChunk } = require('./arrays')
const { UNDEFINED_TOKEN } = require('./constants')

async function pEach(array, concurrency, callbackFn, options) {
  await pEachChunk(arrayChunk(array, concurrency), callbackFn, options)
}

async function pFilter(array, concurrency, callbackFn, options) {
  return (
    await pFilterChunk(arrayChunk(array, concurrency), callbackFn, options)
  ).flat()
}

async function pEachChunk(chunks, callbackFn, options) {
  const { retries, signal } = { __proto__: null, ...options }
  for (const chunk of chunks) {
    if (signal?.aborted) {
      return
    }
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(
      chunk.map(value => pRetry(callbackFn, { args: [value], retries, signal }))
    )
  }
}

async function pFilterChunk(chunks, callbackFn, options) {
  const { retries, signal } = { __proto__: null, ...options }
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
          pRetry(callbackFn, { args: [value], retries, signal })
        )
      )
      filteredChunks[i] = chunk.filter((_v, i) => predicateResults[i])
    }
  }
  return filteredChunks
}

async function pRetry(callbackFn, options) {
  const { args = [], retries = 0, signal } = { __proto__: null, ...options }
  if (signal?.aborted) {
    return undefined
  }
  if (retries === 0) {
    return await callbackFn(...args, { signal })
  }
  let attempts = retries
  return (async () => {
    let error = UNDEFINED_TOKEN
    while (attempts-- >= 0 && !signal?.aborted) {
      try {
        // eslint-disable-next-line no-await-in-loop
        return await callbackFn(...args, { signal })
      } catch (e) {
        if (error === UNDEFINED_TOKEN) {
          error = e
        }
      }
    }
    if (error !== UNDEFINED_TOKEN) {
      throw error
    }
    return undefined
  })()
}

module.exports = {
  pEach,
  pEachChunk,
  pFilter,
  pFilterChunk,
  pRetry
}
