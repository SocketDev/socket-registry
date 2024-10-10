'use strict'

const { arrayChunk } = require('@socketregistry/scripts/utils/arrays')

async function pEach(array, concurrency, callbackFn) {
  await pEachChunk(arrayChunk(array, concurrency), callbackFn)
}

async function pFilter(array, concurrency, callbackFn) {
  return (await pFilterChunk(arrayChunk(array, concurrency), callbackFn)).flat()
}

async function pEachChunk(chunks, callbackFn) {
  for (const chunk of chunks) {
    await Promise.all(chunk.map(value => callbackFn(value)))
  }
}

async function pFilterChunk(chunks, callbackFn) {
  const { length } = chunks
  const filteredChunks = Array(length)
  for (let i = 0; i < length; i += 1) {
    filteredChunks[i] = (
      await Promise.all(chunks[i].map(value => callbackFn(value)))
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
