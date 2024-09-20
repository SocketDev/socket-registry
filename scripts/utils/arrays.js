'use strict'

function arrayChunk(array, size = 2) {
  const chunkSize = Math.min(array.length, size)
  const chunks = []
  for (let i = 0, { length } = array; i < length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

module.exports = {
  arrayChunk
}
