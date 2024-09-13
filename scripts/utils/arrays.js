'use strict'

function arrayChunk(array, chunkLength = 2) {
  const chunks = []
  for (let i = 0, { length } = array; i < length; i += chunkLength) {
    chunks.push(array.slice(i, i + chunkLength))
  }
  return chunks
}

module.exports = {
  arrayChunk
}
