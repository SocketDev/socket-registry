'use strict'

const { arrayChunk } = require('@socketregistry/scripts/utils/arrays')

async function pEach(array, concurrency, callbackFn) {
  await pEachChunk(arrayChunk(array, concurrency), callbackFn)
}

async function pEachChunk(chunks, callbackFn) {
  for (const chunk of chunks) {
    await Promise.all(chunk.map(value => callbackFn(value)))
  }
}

module.exports = {
  pEach,
  pEachChunk
}
