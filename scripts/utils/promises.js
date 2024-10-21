'use strict'

const { arrayChunk } = require('@socketregistry/scripts/utils/arrays')

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
    await Promise.all(
      chunk.map(value =>
        signal?.aborted ? undefined : callbackFn(value, { signal })
      )
    )
  }
}

async function pFilterChunk(chunks, callbackFn, options) {
  const { signal } = { __proto__: null, ...options }
  const { length } = chunks
  const filteredChunks = Array(length)
  for (let i = 0; i < length; i += 1) {
    // Process each chunk, filtering based on the callback function
    filteredChunks[i] = signal?.aborted
      ? []
      : (
          await Promise.all(
            chunks[i].map(value =>
              signal?.aborted
                ? Promise.resolve()
                : callbackFn(value, { signal })
            )
          )
        ).filter(Boolean)
  }
  return filteredChunks
}

module.exports = {
  pEach,
  pEachChunk,
  pFilter,
  pFilterChunk
}
