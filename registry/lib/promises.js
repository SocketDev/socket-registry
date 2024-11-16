'use strict'

const { arrayChunk } = require('./arrays')

async function pEach(array, concurrency, callbackFn, options) {
  await pEachChunk(arrayChunk(array, concurrency), callbackFn, options)
}

async function pFilter(array, concurrency, callbackFn, options) {
  return (
    await pFilterChunk(arrayChunk(array, concurrency), callbackFn, options)
  ).flat()
}

async function pEachChunk(chunks, callbackFn, options) {
  const { signal } = { __proto__: null, ...options }
  for (const chunk of chunks) {
    if (signal?.aborted) {
      return
    }
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(
      chunk.map(value =>
        signal?.aborted ? undefined : callbackFn(value, { signal })
      )
    )
  }
}

async function pFilterChunk(chunks, callbackFn, options) {
  const { retries = 0, signal } = { __proto__: null, ...options }
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
        chunk.map(value => {
          if (signal?.aborted) {
            return Promise.resolve()
          }
          if (retries === 0) {
            return callbackFn(value, { signal })
          }
          let attempts = retries
          return (async () => {
            while (attempts-- >= 0) {
              // eslint-disable-next-line no-await-in-loop
              if (await callbackFn(value, { signal })) {
                return true
              }
            }
            return false
          })()
        })
      )
      filteredChunks[i] = chunk.filter((_v, i) => predicateResults[i])
    }
  }
  return filteredChunks
}

module.exports = {
  pEach,
  pEachChunk,
  pFilter,
  pFilterChunk
}
